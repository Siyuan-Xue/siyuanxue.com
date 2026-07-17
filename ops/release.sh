#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

readonly SHA_PATTERN='^[0-9a-f]{40}$'
CLEANUP_TEMP_DIR=''

cleanup_on_exit() {
	if [[ -n "$CLEANUP_TEMP_DIR" && -d "$CLEANUP_TEMP_DIR" ]]; then
		rm -rf -- "$CLEANUP_TEMP_DIR"
	fi
}
trap cleanup_on_exit EXIT

die() {
	printf 'release: %s\n' "$*" >&2
	exit 1
}

validate_root() {
	local root=$1
	[[ "$root" == /* && "$root" != / ]] || die "release root must be an absolute, non-root path"
}

validate_sha() {
	[[ $1 =~ $SHA_PATTERN ]] || die "invalid commit SHA: $1"
}

validate_target() {
	local target=$1
	if [[ "$target" == releases/bootstrap ]]; then
		return
	fi
	[[ "$target" =~ ^releases/[0-9a-f]{40}$ ]] || die "unsafe release target: $target"
}

target_name() {
	local target=$1
	validate_target "$target"
	printf '%s\n' "${target#releases/}"
}

current_target() {
	local root=$1
	[[ -L "$root/current" ]] || die "$root/current is not a symlink"
	local target
	target=$(readlink "$root/current")
	validate_target "$target"
	printf '%s\n' "$target"
}

previous_target() {
	local root=$1
	[[ -L "$root/previous" ]] || die "$root/previous is not a symlink"
	local target
	target=$(readlink "$root/previous")
	validate_target "$target"
	printf '%s\n' "$target"
}

atomic_link() {
	local target=$1
	local link_path=$2
	local temporary_link="${link_path}.tmp.$$"

	validate_target "$target"
	[[ ! -e "$temporary_link" && ! -L "$temporary_link" ]] || die "temporary link already exists: $temporary_link"
	ln -s "$target" "$temporary_link"
	if [[ $(uname -s) == Darwin ]]; then
		mv -fh "$temporary_link" "$link_path"
	else
		mv -Tf "$temporary_link" "$link_path"
	fi
}

sha256_file() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	else
		shasum -a 256 "$1" | awk '{print $1}'
	fi
}

check_health() {
	local url=$1
	local expected=$2
	local response=''
	local attempt

	for attempt in 1 2 3 4 5; do
		if response=$(curl --fail --silent --show-error --max-time 5 "$url" 2>/dev/null) \
			&& [[ "$response" == "$expected" ]]; then
			return 0
		fi
		sleep 1
	done

	printf 'release: health check failed for %s (expected %s, got %s)\n' \
		"$url" "$expected" "${response:-<no response>}" >&2
	return 1
}

validate_release() {
	local release_dir=$1
	local sha=$2

	[[ -f "$release_dir/index.html" && ! -L "$release_dir/index.html" ]] \
		|| die "release is missing a regular index.html"
	[[ -f "$release_dir/__health" && ! -L "$release_dir/__health" ]] \
		|| die "release is missing a regular __health file"
	[[ $(<"$release_dir/__health") == "$sha" ]] \
		|| die "release health marker does not match $sha"
}

validate_archive_entries() {
	local archive=$1
	local entry normalized

	tar -tzf "$archive" >/dev/null || die "cannot read release archive"
	while IFS= read -r entry; do
		[[ "$entry" != /* ]] || die "archive contains an absolute path"
		normalized=${entry#./}
		case "/$normalized/" in
			*/../*) die "archive contains a parent-directory path" ;;
		esac
	done < <(tar -tzf "$archive")
}

activate() {
	local root=$1
	local sha=$2
	local archive_name=$3
	local health_url=$4
	local incoming="$root/incoming"
	local releases="$root/releases"
	local archive checksum_file expected_checksum actual_checksum
	local release_dir temporary_dir old_target

	validate_root "$root"
	validate_sha "$sha"
	[[ "$archive_name" != */* && "$archive_name" =~ ^[A-Za-z0-9._-]+$ ]] \
		|| die "unsafe archive name"
	[[ "$archive_name" == "site-${sha}-"*.tar.gz ]] \
		|| die "archive name does not match commit SHA"

	archive="$incoming/$archive_name"
	checksum_file="${archive}.sha256"
	release_dir="$releases/$sha"
	[[ -f "$archive" ]] || die "archive not found: $archive"
	[[ -f "$checksum_file" ]] || die "checksum not found: $checksum_file"

	expected_checksum=$(awk 'NR == 1 { print $1 }' "$checksum_file")
	[[ "$expected_checksum" =~ ^[0-9a-f]{64}$ ]] || die "invalid SHA-256 checksum file"
	actual_checksum=$(sha256_file "$archive")
	[[ "$actual_checksum" == "$expected_checksum" ]] || die "release archive checksum mismatch"

	if [[ -d "$release_dir" ]]; then
		validate_release "$release_dir" "$sha"
	else
		validate_archive_entries "$archive"
		temporary_dir=$(mktemp -d "$releases/.${sha}.XXXXXX")
		CLEANUP_TEMP_DIR=$temporary_dir
		tar -xzf "$archive" -C "$temporary_dir"
		validate_release "$temporary_dir" "$sha"
		find "$temporary_dir" -type d -exec chmod 0755 {} +
		find "$temporary_dir" -type f -exec chmod 0644 {} +
		mv "$temporary_dir" "$release_dir"
		temporary_dir=''
		CLEANUP_TEMP_DIR=''
	fi

	rm -f -- "$archive" "$checksum_file"
	old_target=$(current_target "$root")
	atomic_link "$old_target" "$root/previous"
	atomic_link "releases/$sha" "$root/current"

	if ! check_health "$health_url" "$sha"; then
		atomic_link "$old_target" "$root/current"
		die "local health check failed; restored $old_target"
	fi
}

restore_previous() {
	local root=$1
	local failed_sha=$2
	local health_url=$3
	local active_target old_target expected failed_dir

	validate_root "$root"
	validate_sha "$failed_sha"
	active_target=$(current_target "$root")
	[[ "$active_target" == "releases/$failed_sha" ]] \
		|| die "current release is not the failed release $failed_sha"
	old_target=$(previous_target "$root")
	expected=$(target_name "$old_target")
	atomic_link "$old_target" "$root/current"

	if ! check_health "$health_url" "$expected"; then
		atomic_link "$active_target" "$root/current"
		die "previous release failed its local health check; restored failed release"
	fi

	failed_dir="$root/releases/$failed_sha"
	if [[ ! -f "$failed_dir/.successful" ]]; then
		rm -rf -- "$failed_dir"
	fi
}

rollback_to() {
	local root=$1
	local sha=$2
	local health_url=$3
	local release_dir old_target

	validate_root "$root"
	validate_sha "$sha"
	release_dir="$root/releases/$sha"
	[[ -d "$release_dir" && -f "$release_dir/.successful" ]] \
		|| die "rollback target is not a retained successful release: $sha"
	validate_release "$release_dir" "$sha"
	old_target=$(current_target "$root")

	if [[ "$old_target" == "releases/$sha" ]]; then
		check_health "$health_url" "$sha" || die "current release failed health check"
		return
	fi

	atomic_link "$old_target" "$root/previous"
	atomic_link "releases/$sha" "$root/current"
	if ! check_health "$health_url" "$sha"; then
		atomic_link "$old_target" "$root/current"
		die "rollback target failed health check; restored $old_target"
	fi
}

file_mtime() {
	if stat -c %Y "$1" >/dev/null 2>&1; then
		stat -c %Y "$1"
	else
		stat -f %m "$1"
	fi
}

prune_releases() {
	local root=$1
	local keep_count=$2
	local releases="$root/releases"
	local current_name previous_name name dir mtime
	local keepers=$'\n'
	local kept=0

	[[ "$keep_count" =~ ^[1-9][0-9]*$ ]] || die "keep count must be positive"
	current_name=$(target_name "$(current_target "$root")")
	previous_name=$(target_name "$(previous_target "$root")")

	add_keeper() {
		local candidate=$1
		[[ "$candidate" =~ $SHA_PATTERN ]] || return 0
		case "$keepers" in
			*$'\n'"$candidate"$'\n'*) return 0 ;;
		esac
		keepers+="$candidate"$'\n'
		kept=$((kept + 1))
	}

	is_keeper() {
		case "$keepers" in
			*$'\n'"$1"$'\n'*) return 0 ;;
			*) return 1 ;;
		esac
	}

	add_keeper "$current_name"
	add_keeper "$previous_name"

	while IFS= read -r name; do
		[[ -n "$name" ]] || continue
		if (( kept < keep_count )); then
			add_keeper "$name"
		fi
	done < <(
		for dir in "$releases"/*; do
			[[ -d "$dir" ]] || continue
			name=${dir##*/}
			[[ "$name" =~ $SHA_PATTERN && -f "$dir/.successful" ]] || continue
			mtime=$(file_mtime "$dir/.successful")
			printf '%s %s\n' "$mtime" "$name"
		done | sort -rn | awk '{print $2}'
	)

	for dir in "$releases"/*; do
		[[ -d "$dir" ]] || continue
		name=${dir##*/}
		[[ "$name" =~ $SHA_PATTERN ]] || continue
		if ! is_keeper "$name"; then
			rm -rf -- "$dir"
		fi
	done
}

finalize() {
	local root=$1
	local sha=$2
	local keep_count=$3
	local target release_dir

	validate_root "$root"
	validate_sha "$sha"
	target=$(current_target "$root")
	[[ "$target" == "releases/$sha" ]] || die "cannot finalize a release that is not current"
	release_dir="$root/releases/$sha"
	validate_release "$release_dir" "$sha"
	printf '%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$release_dir/.successful"
	chmod 0640 "$release_dir/.successful"
	prune_releases "$root" "$keep_count"
}

usage() {
	cat >&2 <<'USAGE'
Usage:
  siyuanxue-release activate ROOT SHA ARCHIVE_NAME HEALTH_URL
  siyuanxue-release restore-previous ROOT FAILED_SHA HEALTH_URL
  siyuanxue-release rollback ROOT SHA HEALTH_URL
  siyuanxue-release finalize ROOT SHA KEEP_COUNT
USAGE
	exit 2
}

command=${1:-}
case "$command" in
	activate)
		[[ $# -eq 5 ]] || usage
		activate "$2" "$3" "$4" "$5"
		;;
	restore-previous)
		[[ $# -eq 4 ]] || usage
		restore_previous "$2" "$3" "$4"
		;;
	rollback)
		[[ $# -eq 4 ]] || usage
		rollback_to "$2" "$3" "$4"
		;;
	finalize)
		[[ $# -eq 4 ]] || usage
		finalize "$2" "$3" "$4"
		;;
	*) usage ;;
esac
