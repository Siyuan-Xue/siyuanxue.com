#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly SCRIPT_DIR
readonly NGINX_BIN=${NGINX_BIN:-nginx}
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-nginx-test.XXXXXX")
readonly TEST_ROOT

cleanup() {
	if [[ -f "$TEST_ROOT/nginx.pid" ]]; then
		"$NGINX_BIN" -s quit -p "$TEST_ROOT" -c "$TEST_ROOT/nginx.conf" >/dev/null 2>&1 || true
	fi
	rm -rf -- "$TEST_ROOT"
}
trap cleanup EXIT

command -v "$NGINX_BIN" >/dev/null 2>&1 \
	|| {
		printf 'test-nginx-config: nginx is required\n' >&2
		exit 1
	}

mkdir -p \
	"$TEST_ROOT/conf.d" \
	"$TEST_ROOT/etc/letsencrypt/live" \
	"$TEST_ROOT/var/lib/letsencrypt/.well-known/acme-challenge" \
	"$TEST_ROOT/var/log/nginx" \
	"$TEST_ROOT/var/www/siyuanxue.com/current/zh" \
	"$TEST_ROOT/var/www/siyuanxue.com/shared/_astro"
printf '%s\n' '<!doctype html><html lang="en"><title>English</title></html>' \
	> "$TEST_ROOT/var/www/siyuanxue.com/current/index.html"
printf '%s\n' '<!doctype html><html lang="zh-CN"><title>中文</title></html>' > "$TEST_ROOT/var/www/siyuanxue.com/current/zh/index.html"
printf 'English missing' > "$TEST_ROOT/var/www/siyuanxue.com/current/404.html"
printf 'Chinese missing' > "$TEST_ROOT/var/www/siyuanxue.com/current/zh/404.html"
printf 'retained-asset' > "$TEST_ROOT/var/www/siyuanxue.com/shared/_astro/old.css"
printf '%s' test > "$TEST_ROOT/var/www/siyuanxue.com/current/__health"
printf '%s' test > "$TEST_ROOT/var/www/siyuanxue.com/current/zh/__health"

make_certificate() {
	local domain=$1
	local certificate_dir="$TEST_ROOT/etc/letsencrypt/live/$domain"

	mkdir -p "$certificate_dir"
	openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
		-subj "/CN=$domain" \
		-keyout "$certificate_dir/privkey.pem" \
		-out "$certificate_dir/fullchain.pem" \
		>/dev/null 2>&1
}

render_config() {
	local source=$1
	local target=$2

	sed \
		-e "s#/etc/letsencrypt#$TEST_ROOT/etc/letsencrypt#g" \
		-e "s#/var/lib/letsencrypt#$TEST_ROOT/var/lib/letsencrypt#g" \
		-e "s#/var/www/siyuanxue.com#$TEST_ROOT/var/www/siyuanxue.com#g" \
		-e "s#/var/log/nginx#$TEST_ROOT/var/log/nginx#g" \
		-e 's/listen 80/listen 127.0.0.1:18080/g' \
		-e 's/\[::\]:80/[::1]:18080/g' \
		-e 's/listen 443/listen 127.0.0.1:18443/g' \
		-e 's/\[::\]:443/[::1]:18443/g' \
		"$source" > "$target"
}

write_main_config() {
	local include_pattern=$1

	cat > "$TEST_ROOT/nginx.conf" <<EOF
pid $TEST_ROOT/nginx.pid;
error_log stderr;
events {}
http {
	access_log off;
	include $include_pattern;
}
EOF
}

for domain in siyuanxue.com xuesiyuan.com; do
	config="$SCRIPT_DIR/nginx/$domain.conf"
	grep -Fq \
		"ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;" \
		"$config"
	grep -Fq \
		"ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;" \
		"$config"
	make_certificate "$domain"
	render_config "$config" \
		"$TEST_ROOT/conf.d/$domain.conf"
done
write_main_config "$TEST_ROOT/conf.d/*.conf"
"$NGINX_BIN" -t -p "$TEST_ROOT" -c "$TEST_ROOT/nginx.conf"
"$NGINX_BIN" -p "$TEST_ROOT" -c "$TEST_ROOT/nginx.conf"

request() {
	local domain=$1 path=$2
	curl --noproxy '*' -ksS --max-time 5 --resolve "$domain:18443:127.0.0.1" "https://$domain:18443$path"
}
status() {
	local domain=$1 path=$2
	curl --noproxy '*' -ksS --max-time 5 --resolve "$domain:18443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$domain:18443$path"
}
[[ $(request siyuanxue.com /) == *'lang="en"'* ]]
[[ $(request xuesiyuan.com /) == *'lang="zh-CN"'* ]]
for domain in siyuanxue.com xuesiyuan.com; do
	[[ $(request "$domain" /__health) == test ]]
	[[ $(request "$domain" /_astro/old.css) == retained-asset ]]
	[[ $(status "$domain" /images/p-202.jpg) == 410 ]]
	[[ $(status "$domain" /missing) == 404 ]]
	headers=$(curl --noproxy '*' -ksSI --max-time 5 --resolve "www.$domain:18443:127.0.0.1" "https://www.$domain:18443/post/example/?a=1")
	[[ "$(printf '%s' "$headers" | tr '[:upper:]' '[:lower:]')" == *"location: https://$domain/post/example/?a=1"* ]]
	headers=$(curl --noproxy '*' -sSI --max-time 5 -H "Host: $domain" 'http://127.0.0.1:18080/post/example/?a=1')
	[[ "$(printf '%s' "$headers" | tr '[:upper:]' '[:lower:]')" == *"location: https://$domain/post/example/?a=1"* ]]
done
[[ $(status siyuanxue.com /zh/index.html) == 404 ]]
[[ $(request xuesiyuan.com /missing) == 'Chinese missing' ]]
[[ $(request siyuanxue.com /missing) == 'English missing' ]]
"$NGINX_BIN" -s quit -p "$TEST_ROOT" -c "$TEST_ROOT/nginx.conf"
for attempt in {1..20}; do
	[[ ! -e "$TEST_ROOT/nginx.pid" ]] && break
	sleep 0.1
done

render_config "$SCRIPT_DIR/nginx-siyuanxue.conf" \
	"$TEST_ROOT/http-baseline.conf"
write_main_config "$TEST_ROOT/http-baseline.conf"
"$NGINX_BIN" -t -p "$TEST_ROOT" -c "$TEST_ROOT/nginx.conf"

printf 'nginx configuration tests passed\n'
