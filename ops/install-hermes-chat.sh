#!/usr/bin/env bash
# Installs bridge only. Existing vhosts are preserved and must be reviewed separately.
set -Eeuo pipefail
[[ $# == 1 ]] || { echo 'Usage: sudo bash ops/install-hermes-chat.sh /absolute/path/to/node' >&2; exit 1; }
node_bin=$1
[[ "$node_bin" =~ ^/[a-zA-Z0-9_./-]+$ && -x "$node_bin" && ! -L "$node_bin" ]] || { echo 'Expected an absolute executable Node path without spaces or symlink.' >&2; exit 1; }
[[ $EUID == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
"$node_bin" -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
for source in "$script_dir/../services/hermes-chat/server.mjs" "$script_dir/hermes-chat.service" "$script_dir/nginx/hermes-chat.conf"; do
 [[ -f "$source" && ! -L "$source" ]] || { echo 'Missing or symlinked source artifact.' >&2; exit 1; }
done
[[ -f /etc/hermes-chat.env && ! -L /etc/hermes-chat.env ]] || { echo 'Create /etc/hermes-chat.env with the Hermes profile API key first.' >&2; exit 1; }
[[ $(stat -c '%u:%a' /etc/hermes-chat.env) == 0:600 ]] || { echo 'Environment must be root-owned mode 600.' >&2; exit 1; }
# Read only the required key line; never source shell code or print secret values.
python3 - <<'PY'
from pathlib import Path
lines=Path('/etc/hermes-chat.env').read_text().splitlines()
values=[line.split('=',1)[1].strip().strip('\"\x27') for line in lines if line.startswith('HERMES_API_KEY=')]
if len(values)!=1 or not values[0] or any(c.isspace() for c in values[0]):
 raise SystemExit('A single nonempty HERMES_API_KEY is required.')
PY
nginx -t
id hermes-chat >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin hermes-chat
backup_dir=$(mktemp -d /var/backups/hermes-chat.XXXXXXXX)
for target in /opt/hermes-chat/server.mjs /etc/systemd/system/hermes-chat.service /etc/nginx/snippets/hermes-chat.conf; do
 if [[ -e "$target" ]]; then cp -a --parents "$target" "$backup_dir/"; fi
done
install -d -o root -g root -m 755 /opt/hermes-chat /etc/nginx/snippets
install -o root -g root -m 644 "$script_dir/../services/hermes-chat/server.mjs" /opt/hermes-chat/server.mjs
sed "s|@NODE@|$node_bin|g" "$script_dir/hermes-chat.service" > /etc/systemd/system/hermes-chat.service
chmod 644 /etc/systemd/system/hermes-chat.service
install -o root -g root -m 644 "$script_dir/nginx/hermes-chat.conf" /etc/nginx/snippets/hermes-chat.conf
if ! nginx -t; then
 if [[ -f "$backup_dir/etc/nginx/snippets/hermes-chat.conf" ]]; then cp -a "$backup_dir/etc/nginx/snippets/hermes-chat.conf" /etc/nginx/snippets/hermes-chat.conf; else rm /etc/nginx/snippets/hermes-chat.conf; fi
 echo "Nginx validation failed; snippet restored. Other backups: $backup_dir" >&2; exit 1
fi
systemctl daemon-reload
systemctl enable hermes-chat.service
systemctl restart hermes-chat.service
for attempt in {1..20}; do
 if curl --fail --silent http://127.0.0.1:8643/chat-api/health >/dev/null; then
  echo "Bridge ready. Backups: $backup_dir. Review vhost includes, run nginx -t, then systemctl reload nginx."
  exit 0
 fi
 sleep 1
done
echo "Bridge health failed; inspect journalctl -u hermes-chat. Backups: $backup_dir" >&2
exit 1
