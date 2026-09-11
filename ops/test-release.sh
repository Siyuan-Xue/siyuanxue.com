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
	local include_zh=${4:-yes}
	local payload="$TEST_WORKSPACE/payload-$suffix"
	local archive_name="site-${sha}-${suffix}.tar.gz"
	local archive="$SITE_ROOT/incoming/$archive_name"

	mkdir -p "$payload/_astro"
	if [[ "$include_index" == yes ]]; then
		printf '<!doctype html><title>%s</title>\n' "$sha" > "$payload/index.html"
	fi
	printf '%s' "$sha" > "$payload/__health"
	printf 'asset-%s\n' "$sha" > "$payload/_astro/app-$sha.css"
	printf '{"version":2,"sha":"%s","locales":{"en":".","zh":"zh"}}\n' "$sha" > "$payload/release.json"
	if [[ "$include_zh" == yes ]]; then
		mkdir -p "$payload/zh/_astro"
		printf '<!doctype html><html lang="zh-CN"><title>中文</title></html>\n' > "$payload/zh/index.html"
		printf '%s' "$sha" > "$payload/zh/__health"
		printf 'zh-asset-%s\n' "$sha" > "$payload/zh/_astro/zh-$sha.css"
	fi
	if [[ "$include_index" == yes && "$include_zh" == yes ]]; then
		bash "$SCRIPT_DIR/package-release.sh" "$payload" "$sha" "$archive"
	else
		tar -czf "$archive" -C "$payload" .
	fi
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

# A daily recovery must never return to bootstrap or a legacy one-locale release.
if run_release restore-previous "$SITE_ROOT" "$sha1" "$HEALTH_URL" 2>/dev/null; then
    fail 'daily recovery accepted a legacy previous release'
fi
assert_target "$SITE_ROOT/current" "releases/$sha1"

sha2=$(make_sha 2)
archive2=$(make_archive "$sha2" second)
run_release activate "$SITE_ROOT" "$sha2" "$archive2" "$HEALTH_URL"
run_release finalize "$SITE_ROOT" "$sha2" 5
assert_target "$SITE_ROOT/current" "releases/$sha2"
assert_target "$SITE_ROOT/previous" "releases/$sha1"

repeat_archive=$(make_archive "$sha2" repeated)
run_release activate "$SITE_ROOT" "$sha2" "$repeat_archive" "$HEALTH_URL"
assert_target "$SITE_ROOT/previous" "releases/$sha1"

run_release rollback "$SITE_ROOT" "$sha1" "$HEALTH_URL"
assert_target "$SITE_ROOT/current" "releases/$sha1"
assert_target "$SITE_ROOT/previous" "releases/$sha2"

before=$(readlink "$SITE_ROOT/current")
if run_release rollback "$SITE_ROOT" invalid-sha "$HEALTH_URL" 2>/dev/null; then
	fail "an invalid rollback SHA was accepted"
fi
assert_target "$SITE_ROOT/current" "$before"

missing_zh_sha=$(make_sha 90)
missing_zh_archive=$(make_archive "$missing_zh_sha" missing-zh yes no)
if run_release activate "$SITE_ROOT" "$missing_zh_sha" "$missing_zh_archive" "$HEALTH_URL" 2>/dev/null; then
	fail "a release without its Chinese homepage was accepted"
fi
assert_target "$SITE_ROOT/current" "$before"

# Exercise the actual producer/consumer contract, including malformed payloads.
for kind in manifest zh-health traversal symlink collision; do
    bad_sha=$(make_sha 92)
    bad_archive=$(make_archive "$bad_sha" "bad-$kind")
    python3 - "$TEST_WORKSPACE/payload-bad-$kind" "$SITE_ROOT/incoming/$bad_archive" "$kind" "$sha1" <<'PYTEST'
import io, json, pathlib, sys, tarfile
payload, archive, kind, original_sha = sys.argv[1:]
root = pathlib.Path(payload)
if kind == 'manifest':
    (root / 'release.json').write_text(json.dumps({'version': 1}))
elif kind == 'zh-health':
    (root / 'zh' / '__health').write_text('wrong-sha')
elif kind == 'collision':
    (root / '_astro' / f'app-{original_sha}.css').write_text('different bytes')
with tarfile.open(archive, 'w:gz') as output:
    output.add(root, arcname='.')
    if kind == 'traversal':
        member = tarfile.TarInfo('../escaped'); member.size = 1
        output.addfile(member, io.BytesIO(b'x'))
    elif kind == 'symlink':
        member = tarfile.TarInfo('linked'); member.type = tarfile.SYMTYPE; member.linkname = '/etc/passwd'
        output.addfile(member)
PYTEST
    printf '%s  %s\n' "$(sha256_file "$SITE_ROOT/incoming/$bad_archive")" "$bad_archive" > "$SITE_ROOT/incoming/$bad_archive.sha256"
    if run_release activate "$SITE_ROOT" "$bad_sha" "$bad_archive" "$HEALTH_URL" 2>/dev/null; then
        fail "a $kind payload was accepted"
    fi
    assert_target "$SITE_ROOT/current" "$before"
    [[ ! -e "$SITE_ROOT/releases/escaped" ]] || fail 'archive escaped extraction root'
done

[[ -f "$SITE_ROOT/shared/_astro/app-$sha1.css" ]] || fail "English fingerprint assets were not staged"
[[ -f "$SITE_ROOT/shared/_astro/zh-$sha1.css" ]] || fail "Chinese fingerprint assets were not staged"

legacy_sha=$(make_sha 91)
mkdir -p "$SITE_ROOT/releases/$legacy_sha"
printf '<html>legacy</html>' > "$SITE_ROOT/releases/$legacy_sha/index.html"
printf '%s' "$legacy_sha" > "$SITE_ROOT/releases/$legacy_sha/__health"
touch "$SITE_ROOT/releases/$legacy_sha/.successful"
if run_release rollback "$SITE_ROOT" "$legacy_sha" "$HEALTH_URL" 2>/dev/null; then
	fail "a legacy single-language rollback target was accepted"
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
[[ -f "$SITE_ROOT/shared/_astro/app-$sha1.css" ]] || fail "old fingerprint assets disappeared during release pruning"

printf 'release integration tests passed\n'
