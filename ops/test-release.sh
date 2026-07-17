#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly RELEASE_SCRIPT="$SCRIPT_DIR/release.sh"
readonly TEST_WORKSPACE=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-release-test.XXXXXX")
readonly SITE_ROOT="$TEST_WORKSPACE/site"
readonly HEALTH_URL="file://$SITE_ROOT/current/__health"

cleanup() {
	rm -rf -- "$TEST_WORKSPACE"
}
trap cleanup EXIT

fail() {
	printf 'test-release: %s\n' "$*" >&2
	exit 1
}

sha256_file() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	else
		shasum -a 256 "$1" | awk '{print $1}'
	fi
}

make_sha() {
	printf '%040x\n' "$1"
}

make_archive() {
	local sha=$1
	local suffix=$2
	local include_index=${3:-yes}
	local payload="$TEST_WORKSPACE/payload-$suffix"
	local archive_name="site-${sha}-${suffix}.tar.gz"
	local archive="$SITE_ROOT/incoming/$archive_name"

	mkdir -p "$payload/_astro"
	if [[ "$include_index" == yes ]]; then
		printf '<!doctype html><title>%s</title>\n' "$sha" > "$payload/index.html"
	fi
	printf '%s' "$sha" > "$payload/__health"
	printf 'asset-%s\n' "$sha" > "$payload/_astro/app.css"
	tar -czf "$archive" -C "$payload" .
	printf '%s  %s\n' "$(sha256_file "$archive")" "$archive_name" > "$archive.sha256"
	printf '%s\n' "$archive_name"
}

assert_target() {
	local link=$1
	local expected=$2
	[[ $(readlink "$link") == "$expected" ]] \
		|| fail "$link did not point to $expected"
}

run_release() {
	bash "$RELEASE_SCRIPT" "$@"
}

mkdir -p "$SITE_ROOT/incoming" "$SITE_ROOT/releases/bootstrap"
printf '<!doctype html><title>bootstrap</title>\n' > "$SITE_ROOT/releases/bootstrap/index.html"
printf 'bootstrap' > "$SITE_ROOT/releases/bootstrap/__health"
ln -s releases/bootstrap "$SITE_ROOT/current"
ln -s releases/bootstrap "$SITE_ROOT/previous"

sha1=$(make_sha 1)
archive1=$(make_archive "$sha1" first)
run_release activate "$SITE_ROOT" "$sha1" "$archive1" "$HEALTH_URL"
assert_target "$SITE_ROOT/current" "releases/$sha1"
assert_target "$SITE_ROOT/previous" releases/bootstrap
run_release finalize "$SITE_ROOT" "$sha1" 5

sha2=$(make_sha 2)
archive2=$(make_archive "$sha2" second)
run_release activate "$SITE_ROOT" "$sha2" "$archive2" "$HEALTH_URL"
run_release finalize "$SITE_ROOT" "$sha2" 5
assert_target "$SITE_ROOT/current" "releases/$sha2"
assert_target "$SITE_ROOT/previous" "releases/$sha1"

run_release rollback "$SITE_ROOT" "$sha1" "$HEALTH_URL"
assert_target "$SITE_ROOT/current" "releases/$sha1"
assert_target "$SITE_ROOT/previous" "releases/$sha2"

before=$(readlink "$SITE_ROOT/current")
if run_release rollback "$SITE_ROOT" invalid-sha "$HEALTH_URL" 2>/dev/null; then
	fail "an invalid rollback SHA was accepted"
fi
assert_target "$SITE_ROOT/current" "$before"

sha3=$(make_sha 3)
archive3=$(make_archive "$sha3" external-failure)
run_release activate "$SITE_ROOT" "$sha3" "$archive3" "$HEALTH_URL"
assert_target "$SITE_ROOT/current" "releases/$sha3"
run_release restore-previous "$SITE_ROOT" "$sha3" "$HEALTH_URL"
assert_target "$SITE_ROOT/current" "releases/$sha1"
[[ ! -d "$SITE_ROOT/releases/$sha3" ]] || fail "failed unfinalized release was not removed"

sha4=$(make_sha 4)
archive4=$(make_archive "$sha4" local-failure)
printf 'wrong-version' > "$TEST_WORKSPACE/wrong-health"
if run_release activate "$SITE_ROOT" "$sha4" "$archive4" \
	"file://$TEST_WORKSPACE/wrong-health" 2>/dev/null; then
	fail "a release with a failing local health check was activated"
fi
assert_target "$SITE_ROOT/current" "releases/$sha1"

sha5=$(make_sha 5)
archive5=$(make_archive "$sha5" corrupt-checksum)
printf '%064d  %s\n' 0 "$archive5" > "$SITE_ROOT/incoming/$archive5.sha256"
if run_release activate "$SITE_ROOT" "$sha5" "$archive5" "$HEALTH_URL" 2>/dev/null; then
	fail "an archive with a corrupt checksum was accepted"
fi
assert_target "$SITE_ROOT/current" "releases/$sha1"

sha6=$(make_sha 6)
archive6=$(make_archive "$sha6" missing-index no)
if run_release activate "$SITE_ROOT" "$sha6" "$archive6" "$HEALTH_URL" 2>/dev/null; then
	fail "an archive without index.html was accepted"
fi
assert_target "$SITE_ROOT/current" "releases/$sha1"

for number in 10 11 12 13 14 15; do
	sha=$(make_sha "$number")
	archive=$(make_archive "$sha" "retention-$number")
	run_release activate "$SITE_ROOT" "$sha" "$archive" "$HEALTH_URL"
	run_release finalize "$SITE_ROOT" "$sha" 5
done

successful_count=$(find "$SITE_ROOT/releases" -mindepth 2 -maxdepth 2 -name .successful -type f | wc -l | tr -d ' ')
[[ "$successful_count" == 5 ]] || fail "expected 5 successful releases, found $successful_count"
[[ -d "$SITE_ROOT/releases/bootstrap" ]] || fail "bootstrap release was removed"
[[ -d "$SITE_ROOT/$(readlink "$SITE_ROOT/current")" ]] || fail "current release was pruned"
[[ -d "$SITE_ROOT/$(readlink "$SITE_ROOT/previous")" ]] || fail "previous release was pruned"

printf 'release integration tests passed\n'
