#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

readonly SITE_ROOT=/var/www/siyuanxue.com
readonly DEPLOY_USER=deploy
readonly DEPLOY_GROUP=www-data
readonly SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

die() {
	printf 'bootstrap: %s\n' "$*" >&2
	exit 1
}

check_platform() {
	[[ -r /etc/os-release ]] || die "/etc/os-release is unavailable"
	# shellcheck disable=SC1091
	source /etc/os-release
	[[ ${ID:-} == ubuntu && ${VERSION_ID:-} == 24.04 ]] \
		|| die "expected Ubuntu 24.04, found ${PRETTY_NAME:-unknown}"
	printf 'Operating system: %s\n' "$PRETTY_NAME"
	printf 'Architecture: %s\n' "$(uname -m)"
	df -h /
}

check_port_80() {
	local listeners
	listeners=$(ss -H -ltnp 'sport = :80' 2>/dev/null || true)
	if [[ -n "$listeners" && "$listeners" != *nginx* ]]; then
		printf '%s\n' "$listeners" >&2
		die "TCP 80 is already occupied by a non-Nginx process; no service was changed"
	fi
	if [[ -n "$listeners" ]]; then
		printf 'TCP 80 listener: %s\n' "$listeners"
	else
		printf 'TCP 80 is available.\n'
	fi
}

show_docker_state() {
	if command -v docker >/dev/null 2>&1; then
		printf 'Existing Docker containers (read-only inventory):\n'
		docker ps --format '  {{.Names}}\t{{.Ports}}' 2>/dev/null || true
	else
		printf 'Docker command is not available.\n'
	fi
}

preflight() {
	check_platform
	check_port_80
	show_docker_state
}

validate_public_key() {
	local public_key_file=$1
	[[ -f "$public_key_file" ]] || die "public key file not found: $public_key_file"
	[[ $(wc -l < "$public_key_file" | tr -d ' ') == 1 ]] \
		|| die "the deploy public key must be exactly one line"
	grep -Eq '^ssh-ed25519 [A-Za-z0-9+/]+={0,3}( .*)?$' "$public_key_file" \
		|| die "the deploy public key must be an Ed25519 OpenSSH public key"
}

install_packages() {
	export DEBIAN_FRONTEND=noninteractive
	apt-get update
	apt-get install -y --no-install-recommends nginx fail2ban curl ca-certificates
}

configure_deploy_user() {
	local public_key_file=$1
	local ssh_dir authorized_keys key

	if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
		useradd --create-home --shell /bin/bash "$DEPLOY_USER"
	fi
	passwd --lock "$DEPLOY_USER" >/dev/null
	gpasswd --delete "$DEPLOY_USER" sudo >/dev/null 2>&1 || true

	ssh_dir="/home/$DEPLOY_USER/.ssh"
	authorized_keys="$ssh_dir/authorized_keys"
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "$ssh_dir"
	touch "$authorized_keys"
	chown "$DEPLOY_USER:$DEPLOY_USER" "$authorized_keys"
	chmod 0600 "$authorized_keys"
	key=$(<"$public_key_file")
	grep -qxF "$key" "$authorized_keys" || printf '%s\n' "$key" >> "$authorized_keys"
}

configure_site_tree() {
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 2750 "$SITE_ROOT"
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 2750 \
		"$SITE_ROOT/incoming" "$SITE_ROOT/releases"
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 2755 \
		"$SITE_ROOT/releases/bootstrap"

	if [[ ! -f "$SITE_ROOT/releases/bootstrap/index.html" ]]; then
		install -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0644 /dev/null \
			"$SITE_ROOT/releases/bootstrap/index.html"
		printf '%s\n' '<!doctype html><html lang="en"><meta charset="utf-8"><title>Deployment pending</title><body><p>Deployment pending.</p></body></html>' \
			> "$SITE_ROOT/releases/bootstrap/index.html"
	fi
	printf '%s\n' bootstrap > "$SITE_ROOT/releases/bootstrap/__health"
	chown "$DEPLOY_USER:$DEPLOY_GROUP" "$SITE_ROOT/releases/bootstrap/__health"
	chmod 0644 "$SITE_ROOT/releases/bootstrap/__health"

	if [[ ! -e "$SITE_ROOT/current" && ! -L "$SITE_ROOT/current" ]]; then
		ln -s releases/bootstrap "$SITE_ROOT/current"
	elif [[ ! -L "$SITE_ROOT/current" ]]; then
		die "$SITE_ROOT/current exists and is not a symlink"
	fi
	if [[ ! -e "$SITE_ROOT/previous" && ! -L "$SITE_ROOT/previous" ]]; then
		ln -s releases/bootstrap "$SITE_ROOT/previous"
	elif [[ ! -L "$SITE_ROOT/previous" ]]; then
		die "$SITE_ROOT/previous exists and is not a symlink"
	fi
	chown -h "$DEPLOY_USER:$DEPLOY_GROUP" "$SITE_ROOT/current" "$SITE_ROOT/previous"
}

configure_services() {
	install -o root -g root -m 0755 "$SCRIPT_DIR/release.sh" /usr/local/bin/siyuanxue-release
	install -o root -g root -m 0644 "$SCRIPT_DIR/nginx-siyuanxue.conf" \
		/etc/nginx/sites-available/siyuanxue
	install -o root -g root -m 0644 "$SCRIPT_DIR/fail2ban-sshd.local" \
		/etc/fail2ban/jail.d/siyuanxue-sshd.local

	rm -f /etc/nginx/sites-enabled/default
	ln -sfn /etc/nginx/sites-available/siyuanxue /etc/nginx/sites-enabled/siyuanxue
	nginx -t
	systemctl enable --now nginx fail2ban
	systemctl reload nginx
	systemctl restart fail2ban
}

verify_services() {
	local attempt fail2ban_ready=false health
	health=$(curl --fail --silent --show-error --max-time 5 http://127.0.0.1/__health)
	[[ "$health" == bootstrap ]] || die "bootstrap health check returned: $health"
	systemctl --no-pager --full status nginx | sed -n '1,12p'

	# systemctl can report the service as started before fail2ban-server creates
	# its control socket. Give it a bounded readiness window before failing the
	# bootstrap; this is especially visible immediately after package install.
	for attempt in {1..30}; do
		if fail2ban-client ping >/dev/null 2>&1 \
			&& fail2ban-client status sshd >/dev/null 2>&1; then
			fail2ban_ready=true
			break
		fi
		sleep 1
	done
	if [[ "$fail2ban_ready" != true ]]; then
		systemctl --no-pager --full status fail2ban || true
		journalctl --no-pager -u fail2ban -n 50 || true
		die "Fail2ban did not become ready within 30 seconds"
	fi
	fail2ban-client status sshd
	printf '\nBootstrap complete. Open TCP 80 in the Tencent Cloud Lighthouse firewall.\n'
	printf 'Trusted SSH host key (verify before storing it in GitHub):\n'
	awk -v host='82.156.77.131' '{print host, $1, $2}' /etc/ssh/ssh_host_ed25519_key.pub
}

usage() {
	cat >&2 <<'USAGE'
Usage:
  sudo ./ops/bootstrap-server.sh --check
  sudo ./ops/bootstrap-server.sh --apply /path/to/deploy-key.pub
USAGE
	exit 2
}

[[ ${EUID:-$(id -u)} -eq 0 ]] || die "run this script with sudo"

case ${1:-} in
	--check)
		[[ $# -eq 1 ]] || usage
		preflight
		;;
	--apply)
		[[ $# -eq 2 ]] || usage
		validate_public_key "$2"
		preflight
		install_packages
		configure_deploy_user "$2"
		configure_site_tree
		configure_services
		verify_services
		;;
	*) usage ;;
esac
