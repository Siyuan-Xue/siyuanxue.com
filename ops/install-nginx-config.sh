#!/usr/bin/env bash

set -Eeuo pipefail

die() {
	printf 'install-nginx-config: %s\n' "$*" >&2
	exit 1
}

[[ $# -eq 4 ]] || die \
	'usage: install-nginx-config.sh HTTP_TEMPLATE AVAILABLE_ROOT ENABLED_ROOT LETSENCRYPT_ROOT'

readonly HTTP_TEMPLATE=$1
readonly AVAILABLE_ROOT=$2
readonly ENABLED_ROOT=$3
readonly LETSENCRYPT_ROOT=$4
readonly ACTIVE_CONFIG="$AVAILABLE_ROOT/siyuanxue"
readonly FALLBACK_CONFIG="$AVAILABLE_ROOT/siyuanxue-http"
readonly ENABLED_CONFIG="$ENABLED_ROOT/siyuanxue"
readonly CERTIFICATE="$LETSENCRYPT_ROOT/live/siyuanxue.com/fullchain.pem"
readonly PRIVATE_KEY="$LETSENCRYPT_ROOT/live/siyuanxue.com/privkey.pem"
readonly CERTIFICATE_DIRECTIVE_REGEX='^[[:space:]]*ssl_certificate[[:space:]]+/etc/letsencrypt/live/siyuanxue[.]com/fullchain[.]pem;[[:space:]]*$'

[[ -f "$HTTP_TEMPLATE" ]] || die "HTTP template not found: $HTTP_TEMPLATE"
for directory in "$AVAILABLE_ROOT" "$ENABLED_ROOT" "$LETSENCRYPT_ROOT"; do
	[[ "$directory" == /* && "$directory" != / ]] \
		|| die "unsafe directory: $directory"
done

mkdir -p "$AVAILABLE_ROOT" "$ENABLED_ROOT"
install -m 0644 "$HTTP_TEMPLATE" "$FALLBACK_CONFIG"

https_active=false
if [[ -f "$ACTIVE_CONFIG" \
	&& -L "$ENABLED_CONFIG" \
	&& -s "$CERTIFICATE" \
	&& -s "$PRIVATE_KEY" ]] \
	&& grep -Eq "$CERTIFICATE_DIRECTIVE_REGEX" "$ACTIVE_CONFIG" \
	&& [[ $(readlink -f "$ENABLED_CONFIG") == "$(readlink -f "$ACTIVE_CONFIG")" ]]; then
	https_active=true
fi

if [[ "$https_active" == true ]]; then
	printf 'Preserving active HTTPS Nginx configuration.\n'
else
	install -m 0644 "$HTTP_TEMPLATE" "$ACTIVE_CONFIG"
	ln -sfn "$ACTIVE_CONFIG" "$ENABLED_CONFIG"
	printf 'Enabled certificate-free HTTP Nginx configuration.\n'
fi
