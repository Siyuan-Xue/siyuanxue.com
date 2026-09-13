#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
bun run check
bun run test
python3 -m unittest discover -s tests -p test_hermes_readonly.py
for script in ops/*.sh; do bash -n "$script"; done
bash ops/test-enable-https.sh
bash ops/test-install-nginx-config.sh
bash ops/test-bootstrap-health.sh
bash ops/test-release.sh
bash ops/test-migrate-dual-domain.sh
bash ops/test-hermes-chat.sh
bash ops/test-nginx-config.sh
bun run build
