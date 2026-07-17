#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
readonly REPOSITORY_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
readonly SERVER_HOST=82.156.77.131
readonly SERVER_PORT=22
readonly SERVER_USER=ubuntu

die() {
	printf 'bootstrap-remote: %s\n' "$*" >&2
	exit 1
}

[[ $# -eq 1 ]] || die "usage: $0 /absolute/path/to/deploy-key.pub"
public_key=$1
[[ "$public_key" == /* && -f "$public_key" ]] || die "public key path must be an existing absolute path"
grep -Eq '^ssh-ed25519 [A-Za-z0-9+/]+={0,3}( .*)?$' "$public_key" \
	|| die "public key must be an Ed25519 OpenSSH public key"

temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/siyuanxue-bootstrap.XXXXXX")
cleanup() {
	rm -rf -- "$temporary_dir"
}
trap cleanup EXIT

bundle="$temporary_dir/ops.tar.gz"
remote_id="$(date +%s)-$$"
remote_bundle="/tmp/siyuanxue-ops-$remote_id.tar.gz"
remote_key="/tmp/siyuanxue-deploy-$remote_id.pub"
remote_dir="/tmp/siyuanxue-bootstrap-$remote_id"

tar -czf "$bundle" -C "$REPOSITORY_ROOT" ops

printf 'Uploading the bootstrap bundle. Enter the existing ubuntu SSH password when prompted.\n'
scp -P "$SERVER_PORT" "$bundle" "$SERVER_USER@$SERVER_HOST:$remote_bundle"
scp -P "$SERVER_PORT" "$public_key" "$SERVER_USER@$SERVER_HOST:$remote_key"

printf 'Running preflight and bootstrap. Enter the ubuntu sudo password when prompted.\n'
ssh -tt -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" \
	"set -Eeuo pipefail; \
	mkdir -m 0700 '$remote_dir'; \
	tar -xzf '$remote_bundle' -C '$remote_dir'; \
	sudo '$remote_dir/ops/bootstrap-server.sh' --check; \
	sudo '$remote_dir/ops/bootstrap-server.sh' --apply '$remote_key'; \
	rm -rf -- '$remote_dir' '$remote_bundle' '$remote_key'"

printf '\nServer bootstrap finished. Verify CI key-only access with:\n'
printf 'ssh -i %q -p %s deploy@%s /usr/bin/id\n' \
	"${public_key%.pub}" "$SERVER_PORT" "$SERVER_HOST"
