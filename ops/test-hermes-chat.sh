#!/usr/bin/env bash
set -Eeuo pipefail
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# Invalid paths must fail before any privileged installation work.
for invalid in node /does-not-exist '/tmp/node;touch /tmp/unwanted-hermes-file' '/tmp/node with spaces'; do
 if bash "$script_dir/install-hermes-chat.sh" "$invalid" >/dev/null 2>&1; then
  echo 'Installer accepted invalid Node path' >&2; exit 1
 fi
done
python3 - "$script_dir" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])
snippet=(root/'nginx/hermes-chat.conf').read_text()
assert 'proxy_set_header X-Real-IP $remote_addr;' in snippet
assert 'location = /chat-api {' in snippet
assert 'location = /chat-api/health {' in snippet
assert 'location ^~ /chat-api/ { return 404; }' in snippet
assert 'proxy_buffering off;' in snippet
for domain in ('siyuanxue.com','xuesiyuan.com'):
 config=(root/f'nginx/{domain}.conf').read_text()
 assert 'include /etc/nginx/snippets/hermes-chat.conf;' in config
 assert 'location = /images/p-202.jpg { return 410; }' in config
print('Hermes install preflight and route contracts passed')
PY
