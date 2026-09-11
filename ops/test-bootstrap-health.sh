#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-health-test.XXXXXX")
trap 'rm -rf "$TEST_ROOT"' EXIT
SITE_ROOT="$TEST_ROOT/site"
mkdir -p "$SITE_ROOT/current"
die() { printf '%s\n' "$*" >&2; return 1; }
curl() { cat "$TEST_ROOT/response"; }
# Exercise the actual health function without running package or user setup.
eval "$(sed -n '/^verify_site_health() {/,/^}/p' "$SCRIPT_DIR/bootstrap-server.sh")"
for expected in bootstrap 0123456789012345678901234567890123456789; do
    printf '%s' "$expected" > "$SITE_ROOT/current/__health"
    printf '%s' "$expected" > "$TEST_ROOT/response"
    verify_site_health
done
printf 'wrong-release' > "$TEST_ROOT/response"
if verify_site_health 2>/dev/null; then
    echo 'bootstrap accepted a mismatched current release' >&2
    exit 1
fi
echo 'bootstrap health tests passed'
