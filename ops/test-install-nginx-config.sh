#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
readonly INSTALLER="$SCRIPT_DIR/install-nginx-config.sh"
TEST_WORKSPACE=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-nginx-install-test.XXXXXX")
readonly TEST_WORKSPACE

cleanup() {
	rm -rf -- "$TEST_WORKSPACE"
}
trap cleanup EXIT

fail() {
	printf 'test-install-nginx-config: %s\n' "$*" >&2
	exit 1
}

setup_case() {
	local name=$1

	CASE_ROOT="$TEST_WORKSPACE/$name"
	AVAILABLE="$CASE_ROOT/sites-available"
	ENABLED="$CASE_ROOT/sites-enabled"
	LETSENCRYPT="$CASE_ROOT/letsencrypt"
	TEMPLATE="$CASE_ROOT/http.conf"
	mkdir -p "$AVAILABLE" "$ENABLED" "$LETSENCRYPT/live/siyuanxue.com"
	printf '%s\n' 'safe HTTP baseline' > "$TEMPLATE"
}

test_http_baseline_is_enabled_without_a_certificate() {
	setup_case http
	bash "$INSTALLER" "$TEMPLATE" "$AVAILABLE" "$ENABLED" "$LETSENCRYPT"
	grep -Fxq 'safe HTTP baseline' "$AVAILABLE/siyuanxue" \
		|| fail "HTTP baseline was not installed as the active config"
	[[ $(readlink "$ENABLED/siyuanxue") == "$AVAILABLE/siyuanxue" ]] \
		|| fail "HTTP baseline was not enabled"
}

test_active_https_is_preserved_when_certificate_exists() {
	setup_case https
	printf '\t%s\n' \
		'ssl_certificate /etc/letsencrypt/live/siyuanxue.com/fullchain.pem;' \
		> "$AVAILABLE/siyuanxue"
	ln -s "$AVAILABLE/siyuanxue" "$ENABLED/siyuanxue"
	printf '%s\n' certificate > "$LETSENCRYPT/live/siyuanxue.com/fullchain.pem"
	printf '%s\n' key > "$LETSENCRYPT/live/siyuanxue.com/privkey.pem"
	bash "$INSTALLER" "$TEMPLATE" "$AVAILABLE" "$ENABLED" "$LETSENCRYPT"
	grep -Fq 'ssl_certificate' "$AVAILABLE/siyuanxue" \
		|| fail "bootstrap installer overwrote the active HTTPS config"
	grep -Fxq 'safe HTTP baseline' "$AVAILABLE/siyuanxue-http" \
		|| fail "bootstrap installer did not refresh the fallback HTTP config"
}

test_http_baseline_is_enabled_without_a_certificate
test_active_https_is_preserved_when_certificate_exists
printf 'nginx bootstrap installation tests passed\n'
