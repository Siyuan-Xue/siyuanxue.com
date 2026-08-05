#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

SCRIPT_PATH=${BASH_SOURCE[0]}
while [[ -L "$SCRIPT_PATH" ]]; do
	SCRIPT_BASE=$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)
	SCRIPT_PATH=$(readlink "$SCRIPT_PATH")
	[[ "$SCRIPT_PATH" == /* ]] || SCRIPT_PATH="$SCRIPT_BASE/$SCRIPT_PATH"
done
SCRIPT_DIR=$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)
readonly SCRIPT_DIR
readonly SERVER_IP=82.156.77.131
readonly DEFAULT_SYSTEM_ROOT=/
readonly SYSTEM_ROOT_INPUT=${SIYUANXUE_SYSTEM_ROOT:-$DEFAULT_SYSTEM_ROOT}
readonly CERTBOT_BIN=${SIYUANXUE_CERTBOT_BIN:-/snap/bin/certbot}
readonly NGINX_BIN=${SIYUANXUE_NGINX_BIN:-nginx}

die() {
	printf 'enable-https: %s\n' "$*" >&2
	if [[ ${TRANSACTION_ACTIVE:-false} == true ]]; then
		return 1
	fi
	exit 1
}

usage() {
	cat >&2 <<'USAGE'
Usage:
  sudo ./ops/enable-https.sh check --domain DOMAIN
  sudo ./ops/enable-https.sh apply --domain DOMAIN --email EMAIL
  sudo ./ops/enable-https.sh rollback --domain DOMAIN

Allowed domains:
  siyuanxue.com
  xuesiyuan.com
  xuesiyuan.com.cn
USAGE
	exit 2
}

normalize_system_root() {
	local root=$1

	[[ "$root" == /* ]] || die 'SIYUANXUE_SYSTEM_ROOT must be absolute'
	if [[ "$root" == / ]]; then
		printf '/\n'
		return
	fi
	[[ -d "$root" ]] || die "system root does not exist: $root"
	(
		cd "$root"
		pwd -P
	)
}

SYSTEM_ROOT=$(normalize_system_root "$SYSTEM_ROOT_INPUT")
readonly SYSTEM_ROOT

system_path() {
	local path=$1

	[[ "$path" == /* ]] || die "system path must be absolute: $path"
	if [[ "$SYSTEM_ROOT" == / ]]; then
		printf '%s\n' "$path"
	else
		printf '%s%s\n' "$SYSTEM_ROOT" "$path"
	fi
}

SITE_ROOT=$(system_path /var/www/siyuanxue.com)
WEBROOT=$(system_path /var/lib/letsencrypt)
STATE_ROOT=$(system_path /var/lib/siyuanxue-https)
NGINX_AVAILABLE_ROOT=$(system_path /etc/nginx/sites-available)
NGINX_ENABLED_ROOT=$(system_path /etc/nginx/sites-enabled)
LETSENCRYPT_ROOT=$(system_path /etc/letsencrypt)
MANAGED_ROOT=$(system_path /usr/local/lib/siyuanxue-https)
MANAGED_COMMAND=$(system_path /usr/local/sbin/siyuanxue-enable-https)
readonly SITE_ROOT WEBROOT STATE_ROOT NGINX_AVAILABLE_ROOT NGINX_ENABLED_ROOT
readonly LETSENCRYPT_ROOT MANAGED_ROOT MANAGED_COMMAND

require_root() {
	if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
		return
	fi
	[[ "$SYSTEM_ROOT" != / && ${SIYUANXUE_ALLOW_NON_ROOT:-0} == 1 ]] \
		|| die 'run this command with sudo'
}

validate_email() {
	local value=$1

	[[ "$value" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] \
		|| die "invalid contact email: $value"
}

command=${1:-}
[[ -n "$command" ]] || usage
shift

domain=''
email=''
while (($# > 0)); do
	case $1 in
		--domain)
			[[ $# -ge 2 ]] || usage
			domain=$2
			shift 2
			;;
		--email)
			[[ $# -ge 2 ]] || usage
			email=$2
			shift 2
			;;
		-h | --help) usage ;;
		*) usage ;;
	esac
done

case $domain in
	siyuanxue.com | xuesiyuan.com | xuesiyuan.com.cn) ;;
	'') die 'domain is required' ;;
	*) die "unsupported domain: $domain" ;;
esac

readonly www_domain="www.$domain"
readonly domain_key=${domain//./-}
readonly ACME_TEMPLATE="$SCRIPT_DIR/nginx/acme.conf.template"
readonly DOMAIN_TEMPLATE="$SCRIPT_DIR/nginx/$domain.conf"
readonly ACME_AVAILABLE="$NGINX_AVAILABLE_ROOT/siyuanxue-acme-$domain_key"
readonly ACME_ENABLED="$NGINX_ENABLED_ROOT/siyuanxue-acme-$domain_key"
readonly DOMAIN_STATE="$STATE_ROOT/$domain"
readonly ROLLBACK_SNAPSHOT="$DOMAIN_STATE/rollback"

if [[ "$domain" == siyuanxue.com ]]; then
	readonly DOMAIN_AVAILABLE="$NGINX_AVAILABLE_ROOT/siyuanxue"
	readonly DOMAIN_ENABLED="$NGINX_ENABLED_ROOT/siyuanxue"
else
	readonly DOMAIN_AVAILABLE="$NGINX_AVAILABLE_ROOT/siyuanxue-$domain_key"
	readonly DOMAIN_ENABLED="$NGINX_ENABLED_ROOT/siyuanxue-$domain_key"
fi

resolve_ipv4() {
	local hostname=$1

	getent ahostsv4 "$hostname" \
		| awk '$2 == "STREAM" { print $1 }' \
		| sort -u
}

check_dns_name() {
	local hostname=$1
	local addresses

	addresses=$(resolve_ipv4 "$hostname")
	[[ -n "$addresses" ]] || die "$hostname has no public IPv4 address"
	grep -Fxq "$SERVER_IP" <<<"$addresses" \
		|| die "$hostname does not resolve to $SERVER_IP (got: ${addresses//$'\n'/, })"
}

preflight() {
	local health

	[[ -f "$SITE_ROOT/current/index.html" ]] \
		|| die "$SITE_ROOT/current/index.html is missing"
	[[ -f "$SITE_ROOT/current/__health" ]] \
		|| die "$SITE_ROOT/current/__health is missing"
	ss -ltnp \
		| grep -Eq 'LISTEN.*:80([^0-9]|$).*nginx' \
		|| die 'Nginx is not listening on TCP 80'
	health=$(curl --fail --silent --show-error --max-time 5 \
		http://127.0.0.1/__health)
	[[ -n "$health" ]] || die 'local HTTP health check returned an empty response'
	check_dns_name "$domain"
	check_dns_name "$www_domain"
	printf 'Preflight passed for %s and %s.\n' "$domain" "$www_domain"
}

ensure_certbot() {
	if command -v "$CERTBOT_BIN" >/dev/null 2>&1; then
		return
	fi
	[[ "$SYSTEM_ROOT" == / ]] \
		|| die "test certbot command is unavailable: $CERTBOT_BIN"

	if dpkg-query -W -f='${Status}' certbot 2>/dev/null \
		| grep -Fq 'install ok installed'; then
		if compgen -G '/etc/letsencrypt/renewal/*.conf' >/dev/null; then
			die 'an apt-managed Certbot installation has active renewals; migrate it before continuing'
		fi
		apt-get remove -y certbot python3-certbot-nginx
	fi
	if ! command -v snap >/dev/null 2>&1; then
		apt-get update
		apt-get install -y snapd
	fi
	snap install --classic certbot
	ln -sfn /snap/bin/certbot /usr/local/bin/certbot
	command -v "$CERTBOT_BIN" >/dev/null 2>&1 \
		|| die 'Certbot snap installation did not expose /snap/bin/certbot'
}

atomic_install() {
	local mode=$1
	local source=$2
	local target=$3
	local temporary="$target.tmp.$$"

	[[ ! -e "$temporary" ]] || die "temporary install path already exists: $temporary"
	install -m "$mode" "$source" "$temporary"
	mv "$temporary" "$target"
}

install_management_bundle() {
	local template

	install -d -m 0755 "$MANAGED_ROOT/nginx" "$(dirname "$MANAGED_COMMAND")"
	atomic_install 0755 "$SCRIPT_DIR/enable-https.sh" \
		"$MANAGED_ROOT/enable-https.sh"
	atomic_install 0755 "$SCRIPT_DIR/reload-nginx-after-renewal.sh" \
		"$MANAGED_ROOT/reload-nginx-after-renewal.sh"
	for template in "$SCRIPT_DIR"/nginx/*; do
		[[ -f "$template" ]] || continue
		atomic_install 0644 "$template" \
			"$MANAGED_ROOT/nginx/${template##*/}"
	done
	ln -sfn "$MANAGED_ROOT/enable-https.sh" "$MANAGED_COMMAND"
}

safe_remove_tree() {
	local target=$1

	case "$target" in
		"$STATE_ROOT"/*) rm -rf -- "$target" ;;
		*) die "refusing to remove unsafe state path: $target" ;;
	esac
}

snapshot_configuration() {
	local destination=$1

	mkdir -p "$destination"
	if [[ -e "$DOMAIN_AVAILABLE" || -L "$DOMAIN_AVAILABLE" ]]; then
		cp -a -- "$DOMAIN_AVAILABLE" "$destination/available"
		: > "$destination/had-available"
	fi
	if [[ -e "$DOMAIN_ENABLED" || -L "$DOMAIN_ENABLED" ]]; then
		cp -a -- "$DOMAIN_ENABLED" "$destination/enabled"
		: > "$destination/had-enabled"
	fi
}

restore_snapshot() {
	local source=$1

	rm -f -- "$DOMAIN_ENABLED" "$DOMAIN_AVAILABLE"
	if [[ -f "$source/had-available" ]]; then
		cp -a -- "$source/available" "$DOMAIN_AVAILABLE"
	fi
	if [[ -f "$source/had-enabled" ]]; then
		cp -a -- "$source/enabled" "$DOMAIN_ENABLED"
	fi
}

cleanup_acme_config() {
	rm -f -- "$ACME_ENABLED" "$ACME_AVAILABLE"
}

test_and_reload_nginx() {
	"$NGINX_BIN" -t
	systemctl reload nginx
}

render_acme_config() {
	local temporary="$ACME_AVAILABLE.tmp.$$"

	[[ -f "$ACME_TEMPLATE" ]] || die "missing Nginx template: $ACME_TEMPLATE"
	[[ ! -e "$temporary" ]] || die "temporary config already exists: $temporary"
	sed \
		-e "s/__DOMAIN__/$domain/g" \
		"$ACME_TEMPLATE" > "$temporary"
	chmod 0644 "$temporary"
	mv "$temporary" "$ACME_AVAILABLE"
	ln -sfn "$ACME_AVAILABLE" "$ACME_ENABLED"
}

certificate_ready() {
	local certificate="$LETSENCRYPT_ROOT/live/$domain/fullchain.pem"
	local private_key="$LETSENCRYPT_ROOT/live/$domain/privkey.pem"
	local actual expected

	[[ -s "$certificate" && -s "$private_key" ]] || return 1
	openssl x509 -in "$certificate" -checkend 2592000 -noout >/dev/null \
		|| return 1
	actual=$(
		openssl x509 -in "$certificate" -noout -ext subjectAltName \
			| grep -oE 'DNS:[^,[:space:]]+' \
			| cut -d: -f2- \
			| sort -u
	)
	expected=$(printf '%s\n%s\n' "$domain" "$www_domain" | sort -u)
	[[ "$actual" == "$expected" ]]
}

issue_certificate() {
	local common_args=(
		certonly
		--webroot
		--webroot-path "$WEBROOT"
		--cert-name "$domain"
		-d "$domain"
		-d "$www_domain"
		--email "$email"
		--agree-tos
		--no-eff-email
		--non-interactive
	)

	"$CERTBOT_BIN" "${common_args[@]}" --dry-run
	"$CERTBOT_BIN" "${common_args[@]}"
	certificate_ready \
		|| die "issued certificate is missing, expiring, or has unexpected SANs: $domain"
}

install_renewal_hook() {
	local hook_source="$SCRIPT_DIR/reload-nginx-after-renewal.sh"
	local hook_target="$LETSENCRYPT_ROOT/renewal-hooks/deploy/reload-nginx"

	[[ -f "$hook_source" ]] || die "missing renewal hook: $hook_source"
	install -d -m 0755 "$(dirname "$hook_target")"
	install -m 0755 "$hook_source" "$hook_target"
}

install_domain_config() {
	[[ -f "$DOMAIN_TEMPLATE" ]] || die "missing Nginx template: $DOMAIN_TEMPLATE"
	install -m 0644 "$DOMAIN_TEMPLATE" "$DOMAIN_AVAILABLE"
	ln -sfn "$DOMAIN_AVAILABLE" "$DOMAIN_ENABLED"
}

TRANSACTION_DIR=''
TRANSACTION_ACTIVE=false

recover_failed_apply() {
	local status=$?

	trap - ERR
	TRANSACTION_ACTIVE=false
	set +e
	cleanup_acme_config
	if [[ -n "$TRANSACTION_DIR" && -d "$TRANSACTION_DIR" ]]; then
		restore_snapshot "$TRANSACTION_DIR"
	fi
	"$NGINX_BIN" -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1
	if [[ -n "$TRANSACTION_DIR" && -d "$TRANSACTION_DIR" ]]; then
		safe_remove_tree "$TRANSACTION_DIR"
	fi
	printf 'enable-https: apply failed; previous Nginx configuration restored\n' >&2
	exit "$status"
}

apply_domain() {
	require_root
	[[ -n "$email" ]] || die 'email is required for apply'
	validate_email "$email"
	preflight
	ensure_certbot
	install_management_bundle
	install -d -m 0755 "$WEBROOT/.well-known/acme-challenge"
	mkdir -p "$NGINX_AVAILABLE_ROOT" "$NGINX_ENABLED_ROOT" "$DOMAIN_STATE"
	TRANSACTION_DIR=$(mktemp -d "$DOMAIN_STATE/transaction.XXXXXX")
	snapshot_configuration "$TRANSACTION_DIR"
	TRANSACTION_ACTIVE=true
	trap recover_failed_apply ERR

	render_acme_config
	test_and_reload_nginx
	if certificate_ready; then
		printf 'Reusing valid certificate %s.\n' "$domain"
	else
		issue_certificate
	fi

	cleanup_acme_config
	install_domain_config
	install_renewal_hook
	test_and_reload_nginx
	"$CERTBOT_BIN" renew --cert-name "$domain" --dry-run

	trap - ERR
	TRANSACTION_ACTIVE=false
	if [[ ! -d "$ROLLBACK_SNAPSHOT" ]]; then
		mv "$TRANSACTION_DIR" "$ROLLBACK_SNAPSHOT"
	else
		safe_remove_tree "$TRANSACTION_DIR"
	fi
	TRANSACTION_DIR=''
	printf 'HTTPS enabled for %s and %s.\n' "$domain" "$www_domain"
}

rollback_domain() {
	local current_snapshot

	require_root
	[[ -d "$ROLLBACK_SNAPSHOT" ]] \
		|| die "no rollback snapshot exists for $domain"
	mkdir -p "$DOMAIN_STATE"
	current_snapshot=$(mktemp -d "$DOMAIN_STATE/rollback-current.XXXXXX")
	snapshot_configuration "$current_snapshot"
	cleanup_acme_config
	restore_snapshot "$ROLLBACK_SNAPSHOT"
	if ! "$NGINX_BIN" -t; then
		restore_snapshot "$current_snapshot"
		"$NGINX_BIN" -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1
		safe_remove_tree "$current_snapshot"
		die 'rollback configuration failed nginx validation; HTTPS configuration restored'
	fi
	systemctl reload nginx
	safe_remove_tree "$current_snapshot"
	printf 'Nginx configuration rolled back for %s; certificate files were retained.\n' \
		"$domain"
}

case $command in
	check)
		require_root
		preflight
		;;
	apply)
		apply_domain
		;;
	rollback)
		[[ -z "$email" ]] || usage
		rollback_domain
		;;
	*) usage ;;
esac
