#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
readonly ENABLE_SCRIPT="$SCRIPT_DIR/enable-https.sh"
TEST_WORKSPACE=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-https-test.XXXXXX")
readonly TEST_WORKSPACE

cleanup() {
	rm -rf -- "$TEST_WORKSPACE"
}
trap cleanup EXIT

fail() {
	printf 'test-enable-https: %s\n' "$*" >&2
	exit 1
}

make_mock_command() {
	local name=$1
	local body=$2
	local path="$MOCK_BIN/$name"

	printf '%s\n' '#!/usr/bin/env bash' 'set -Eeuo pipefail' "$body" > "$path"
	chmod 0755 "$path"
}

setup_case() {
	local name=$1

	CASE_ROOT="$TEST_WORKSPACE/$name"
	SYSTEM_ROOT="$CASE_ROOT/system"
	MOCK_BIN="$CASE_ROOT/bin"
	COMMAND_LOG="$CASE_ROOT/commands.log"
	NGINX_COUNT="$CASE_ROOT/nginx-count"
	MOCK_NGINX_FAIL_ON_CALL=0
	MOCK_CERTBOT_SKIP_SAVE=0
	mkdir -p \
		"$MOCK_BIN" \
		"$SYSTEM_ROOT/etc/nginx/sites-available" \
		"$SYSTEM_ROOT/etc/nginx/sites-enabled" \
		"$SYSTEM_ROOT/etc/letsencrypt/live" \
		"$SYSTEM_ROOT/etc/letsencrypt/renewal-hooks/deploy" \
		"$SYSTEM_ROOT/var/www/siyuanxue.com/releases/bootstrap"
	printf '%s\n' 'baseline nginx config' \
		> "$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue"
	ln -s "$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue" \
		"$SYSTEM_ROOT/etc/nginx/sites-enabled/siyuanxue"
	printf '%s\n' '<!doctype html><title>bootstrap</title>' \
		> "$SYSTEM_ROOT/var/www/siyuanxue.com/releases/bootstrap/index.html"
	printf '%s' bootstrap \
		> "$SYSTEM_ROOT/var/www/siyuanxue.com/releases/bootstrap/__health"
	ln -s releases/bootstrap "$SYSTEM_ROOT/var/www/siyuanxue.com/current"
	: > "$COMMAND_LOG"
	printf '%s\n' 0 > "$NGINX_COUNT"

	# shellcheck disable=SC2016 # The quoted body is written verbatim into a mock script.
	make_mock_command nginx '
count=$(<"$MOCK_NGINX_COUNT")
count=$((count + 1))
printf "%s\n" "$count" > "$MOCK_NGINX_COUNT"
printf "nginx %s\n" "$*" >> "$MOCK_COMMAND_LOG"
if [[ ${MOCK_NGINX_FAIL_ON_CALL:-0} == "$count" ]]; then
	exit 1
fi'
	# shellcheck disable=SC2016 # The quoted body is written verbatim into a mock script.
	make_mock_command systemctl '
printf "systemctl %s\n" "$*" >> "$MOCK_COMMAND_LOG"'
	# shellcheck disable=SC2016 # The quoted body is written verbatim into a mock script.
	make_mock_command certbot '
printf "certbot %s\n" "$*" >> "$MOCK_COMMAND_LOG"
if [[ " $* " == *" certonly "* \
	&& " $* " != *" --dry-run "* \
	&& ${MOCK_CERTBOT_SKIP_SAVE:-0} != 1 ]]; then
	cert_name=""
	domains=()
	while (($# > 0)); do
		case $1 in
			--cert-name)
				cert_name=$2
				shift 2
				;;
			-d)
				domains+=("$2")
				shift 2
				;;
			*) shift ;;
		esac
	done
	cert_dir="$SIYUANXUE_SYSTEM_ROOT/etc/letsencrypt/live/$cert_name"
	mkdir -p "$cert_dir"
	printf "%s\n" "${domains[*]}" > "$cert_dir/fullchain.pem"
	printf "%s\n" "private key" > "$cert_dir/privkey.pem"
fi'
	# shellcheck disable=SC2016 # The quoted body is written verbatim into a mock script.
	make_mock_command openssl '
certificate=""
while (($# > 0)); do
	case $1 in
		-in)
			certificate=$2
			shift 2
			;;
		*) shift ;;
	esac
done
[[ -s "$certificate" ]] || exit 1
if [[ " $* " == *" -checkend "* ]]; then
	exit 0
fi
domains=$(<"$certificate")
printf "X509v3 Subject Alternative Name:\n"
for domain in $domains; do
	printf "    DNS:%s\n" "$domain"
done'
	# shellcheck disable=SC2016 # The quoted body is written verbatim into a mock script.
	make_mock_command getent '
printf "%s STREAM %s\n" "${MOCK_DNS_ADDRESS:-82.156.77.131}" "$2"'
	make_mock_command curl '
printf "%s" bootstrap'
	make_mock_command ss '
printf "%s\n" "LISTEN 0 511 0.0.0.0:80 0.0.0.0:* users:((\"nginx\",pid=1,fd=6))"'
}

run_enable() {
	env \
		PATH="$MOCK_BIN:$PATH" \
		SIYUANXUE_ALLOW_NON_ROOT=1 \
		SIYUANXUE_SYSTEM_ROOT="$SYSTEM_ROOT" \
		SIYUANXUE_CERTBOT_BIN=certbot \
		SIYUANXUE_NGINX_BIN=nginx \
		MOCK_COMMAND_LOG="$COMMAND_LOG" \
		MOCK_NGINX_COUNT="$NGINX_COUNT" \
		MOCK_NGINX_FAIL_ON_CALL="${MOCK_NGINX_FAIL_ON_CALL:-0}" \
		MOCK_CERTBOT_SKIP_SAVE="${MOCK_CERTBOT_SKIP_SAVE:-0}" \
		bash "$ENABLE_SCRIPT" "$@"
}

test_rejects_unknown_domain() {
	local output

	if output=$(bash "$ENABLE_SCRIPT" check --domain example.com 2>&1); then
		fail "check accepted an unknown domain"
	fi
	grep -Fq 'unsupported domain: example.com' <<<"$output" \
		|| fail "unknown-domain failure was not explicit: $output"
}

test_staging_precedes_production_issuance() {
	local dry_run_line production_line

	setup_case staging-order
	run_enable apply --domain siyuanxue.com --email owner@example.com
	[[ -x "$SYSTEM_ROOT/usr/local/sbin/siyuanxue-enable-https" ]] \
		|| fail "apply did not install the reusable HTTPS management command"
	dry_run_line=$(grep -nF 'certbot certonly' "$COMMAND_LOG" \
		| grep -F -- '--dry-run' | cut -d: -f1)
	production_line=$(grep -nF 'certbot certonly' "$COMMAND_LOG" \
		| grep -Fv -- '--dry-run' | cut -d: -f1)
	[[ -n "$dry_run_line" && -n "$production_line" ]] \
		|| fail "apply did not run both staging and production issuance"
	((dry_run_line < production_line)) \
		|| fail "production issuance ran before staging validation"
}

test_valid_certificate_is_not_reissued() {
	setup_case idempotent
	run_enable apply --domain siyuanxue.com --email owner@example.com
	: > "$COMMAND_LOG"
	run_enable apply --domain siyuanxue.com --email owner@example.com
	if grep -Fq 'certbot certonly' "$COMMAND_LOG"; then
		fail "a valid exact-domain certificate was reissued"
	fi
}

test_nginx_failure_restores_previous_configuration() {
	local output

	setup_case rollback
	MOCK_NGINX_FAIL_ON_CALL=2
	if output=$(run_enable apply --domain siyuanxue.com \
		--email owner@example.com 2>&1); then
		fail "apply succeeded despite final nginx validation failure"
	fi
	grep -Fxq 'baseline nginx config' \
		"$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue" \
		|| fail "failed apply did not restore the previous nginx config"
	[[ $(readlink "$SYSTEM_ROOT/etc/nginx/sites-enabled/siyuanxue") \
		== "$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue" ]] \
		|| fail "failed apply did not restore the previous enabled link"
}

test_certificate_validation_failure_cleans_up_transaction() {
	local acme_available acme_enabled output

	setup_case certificate-validation
	MOCK_CERTBOT_SKIP_SAVE=1
	acme_available="$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue-acme-siyuanxue-com"
	acme_enabled="$SYSTEM_ROOT/etc/nginx/sites-enabled/siyuanxue-acme-siyuanxue-com"
	if output=$(run_enable apply --domain siyuanxue.com \
		--email owner@example.com 2>&1); then
		fail "apply succeeded without certificate files"
	fi
	[[ ! -e "$acme_available" && ! -L "$acme_enabled" ]] \
		|| fail "certificate validation failure left temporary ACME config enabled"
	grep -Fxq 'baseline nginx config' \
		"$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue" \
		|| fail "certificate validation failure did not preserve baseline config"
}

test_secondary_domain_rolls_back_without_touching_certificate() {
	local available enabled certificate

	setup_case secondary-rollback
	available="$SYSTEM_ROOT/etc/nginx/sites-available/siyuanxue-xuesiyuan-com"
	enabled="$SYSTEM_ROOT/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com"
	certificate="$SYSTEM_ROOT/etc/letsencrypt/live/xuesiyuan.com/fullchain.pem"
	run_enable apply --domain xuesiyuan.com --email owner@example.com
	[[ -f "$available" && -L "$enabled" && -s "$certificate" ]] \
		|| fail "secondary domain was not activated independently"
	run_enable rollback --domain xuesiyuan.com
	[[ ! -e "$available" && ! -L "$enabled" ]] \
		|| fail "secondary rollback left its Nginx config enabled"
	[[ -s "$certificate" ]] \
		|| fail "secondary rollback removed certificate material"
	[[ -L "$SYSTEM_ROOT/etc/nginx/sites-enabled/siyuanxue" ]] \
		|| fail "secondary rollback modified the canonical site"
}

test_rejects_unknown_domain
test_staging_precedes_production_issuance
test_valid_certificate_is_not_reissued
test_nginx_failure_restores_previous_configuration
test_certificate_validation_failure_cleans_up_transaction
test_secondary_domain_rolls_back_without_touching_certificate
printf 'enable-https tests passed\n'
