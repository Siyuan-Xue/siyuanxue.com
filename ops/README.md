# Deployment operations

Production is Ubuntu 24.04 / Nginx on Tencent Lighthouse. Connect to the verified public address:

```sh
ssh ubuntu@82.156.77.131
```

The previously reported `87.156.77.131` was the wrong address. SSH connectivity and authentication to the correct host were verified. Keep passwords and private keys out of this repository. Tencent OrcaTerm is the fallback when SSH is unavailable.

## Layout and permissions

`/var/www/siyuanxue.com` is owned by `deploy:www-data`; ordinary `ubuntu` directory access requires `sudo`. Its `current` and `previous` links point to `releases/<40-character-commit>`. English is at the release root; Chinese is under `zh`. Both expose the same commit at `/__health`. `release.json` records version 2 and locale roots `{ "en": ".", "zh": "zh" }`.

`shared/_astro` is append-only and served by both domains. Activation backfills current/retained release assets and refuses filename/content collisions. It does not copy raw photos into that directory. Retain five successful releases; shared hashed assets have no automatic pruning in this version.

## Validation and GitHub

`bash ops/verify.sh` runs type checks, frontend tests, shell tests, isolated Nginx route tests, both builds and semantic output checks. It requires Bun 1.3.14, supported Node, Python 3, Nginx, OpenSSL and curl. PR/manual CI and the deployment's reusable verification job call the same script. Only the resulting artifact is deployed.

GitHub `production` environment variables:

| Name | Value |
|---|---|
| DEPLOY_HOST | 82.156.77.131 |
| DEPLOY_PORT | 22 |
| DEPLOY_USER | deploy |
| DEPLOY_ROOT | /var/www/siyuanxue.com |
| DEPLOY_ORIGIN | https://siyuanxue.com |

Existing environment secrets are `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`. The workflow uses strict host-key validation; do not replace it with `StrictHostKeyChecking=no`. The `ubuntu` maintenance login and CI `deploy` account have separate responsibilities.

## Bootstrap and upgrade

`sudo bash ops/bootstrap-server.sh --check` inventories a new server. `--apply /path/to/deploy-key.pub` installs the deployment account and tools. An existing HTTPS configuration is preserved on rerun, and health is compared with the current release rather than the literal `bootstrap` marker. Do not run the full bootstrap merely to update a website.

For an existing server, install the reviewed `ops/release.sh` at `/usr/local/bin/siyuanxue-release` with root ownership and mode 0755. Update the HTTPS helper/templates under `/usr/local/lib/siyuanxue-https` as part of a reviewed maintenance change. The two-language route/certificate migration is documented in [HTTPS.md](HTTPS.md).

## Release and rollback

Package only validated output, using the source commit that produced it:

```sh
bash ops/package-release.sh "$PWD/dist" "$(git rev-parse HEAD)" "/tmp/site-$(git rev-parse HEAD)-manual.tar.gz"
```

Transfer the archive and checksum to `incoming/` as `deploy`. The installed release tool supports:

```text
siyuanxue-release activate ROOT SHA ARCHIVE_NAME HEALTH_URL
siyuanxue-release check ROOT SHA
siyuanxue-release restore-previous ROOT FAILED_SHA HEALTH_URL
siyuanxue-release rollback ROOT SHA HEALTH_URL
siyuanxue-release finalize ROOT SHA KEEP_COUNT
```

Use `http://127.0.0.1/__health` for the local check, then run `bash ops/verify-public.sh SHA` from outside the server. This checks both public language roots, complete SHA markers and the removed-image denial. Finalize only after these checks pass. A repeated activation of the current SHA preserves the previous link.

The Actions manual `rollback` operation accepts a retained, successful bilingual release only. Single-language historical releases are not normal rollback targets after migration. If a newly activated release fails the public check, the workflow restores `previous`. During the first domain migration, Nginx configuration must be restored together with the migration baseline; follow the recorded server backup rather than applying a historical redirect configuration blindly.

## Diagnostics

Read `sudo nginx -t`, `sudo journalctl -u nginx --since '15 minutes ago'`, `sudo readlink /var/www/siyuanxue.com/current`, and both public `/__health` endpoints. Keep the old image denial active during recovery. Do not restart SSH or disable Fail2ban to diagnose an unrelated website issue.

## Public Hermes chat

First prepare the separate official `website-chat` Hermes profile at `127.0.0.1:8642`: GLM-5.3, high reasoning, four turns, a 120-second run budget, no long-term/profile memory, and only the official `web_search` and `web_extract` tools. Use the reviewed persona and partial overlay in `services/hermes-chat/website-SOUL.md` and `services/hermes-chat/website-profile.yaml`. Back up the live profile, then merge the overlay keys into it; never replace the whole config with the overlay. Replace each listed path with the overlay value, including its lists and complete `mcp_servers` map. Preserve its existing `zai` provider structure, `https://open.bigmodel.cn/api/paas/v4` base URL, `glm-5.3` model, secrets, disabled skills, native session/log settings, and all unrelated fields. Install its gateway through `hermes -p website-chat gateway install` and enable/start its official service. Keep the private default profile untouched. The bridge sends the configured profile's `hermes` model alias.

As root, securely create `/etc/hermes-chat.env` owned by root with mode `0600`. It contains `HERMES_API_KEY=<website-profile-key>` and optional settings below. Do not put the GLM key in this file or commit any secret.

```text
HERMES_API_URL=http://127.0.0.1:8642/v1/chat/completions
CHAT_HOST=127.0.0.1
CHAT_PORT=8643
ALLOWED_ORIGINS=https://siyuanxue.com,https://xuesiyuan.com
```

Keep default host/port for the supplied Nginx and health checks. Install reviewed files from the checked-out release source (not the static build archive):

```sh
sudo bash ops/install-hermes-chat.sh /usr/bin/node
```

Use an absolute executable Node 22.12+ binary path; symlinks and paths containing spaces are rejected. It must be outside protected home directories and accessible by the `hermes-chat` service account. The idempotent installer fails closed without a root-owned mode 600 key file, installs into `/opt/hermes-chat`, records backups in `/var/backups/hermes-chat.*`, installs/enables/restarts the hardened `hermes-chat.service`, and checks loopback health. It validates Nginx before and after snippet installation; it preserves existing vhosts and does not reload Nginx.

Back up the active domain configs, then add `include /etc/nginx/snippets/hermes-chat.conf;` only inside both HTTPS apex content servers (and optionally the existing public-IP content server). The tracked templates already contain these includes; install the snippet before installing those templates. Preserve all certificates, default-deny servers, release roots, redirects and `/images/p-202.jpg` denial. Run `sudo nginx -t`, then `sudo systemctl reload nginx`. On validation failure restore the vhost backups before proceeding. Only the exact chat and health routes proxy; nested management paths return 404. Nginx overwrites client IP and strips Authorization/Cookie before bridge forwarding.

Verify both public `/chat/` pages, anonymous streamed replies, `/chat-api/health`, rejection of `/chat-api/sessions`, and existing locale/HTTPS/photo-denial checks. Neither 8642 nor 8643 may be exposed externally. Bridge health is not a model health probe. Restore bridge/service/snippet from the recorded backups and restart the service to roll back; ordinary static release activation remains unchanged.

Before restarting the website gateway, review the merged file without printing secret values. Confirm the website profile has `platform_toolsets.api_server: [web, no_mcp]`, empty `cli` and `weixin` lists, `mcp_servers: {}`, the default `context.engine: compressor`, and `agent.disabled_toolsets: [kanban, context_engine]`. In Hermes v0.21.1, `_get_platform_tools(config, 'api_server', include_default_mcp_servers=False)` must return only `['web']`. Pass that result and the configured disabled list to `model_tools.get_tool_definitions(..., quiet_mode=True, skip_tool_search_assembly=True)` and inspect each `function.name`; the sorted result must be exactly `['web_extract', 'web_search']`. Treat any additional name as a failed isolation check. Re-run this audit after Hermes updates because implicit native tool recovery is an internal, version-scoped behavior.

After restarting only the `website-chat` gateway, exercise both tools through the authenticated loopback API without displaying the bearer token. Verify a targeted public search and a public homepage extraction succeed, responses identify keyless/free handling with no Tavily credential present, and extraction of loopback and cloud-metadata targets is refused before any provider call. The observed v0.21.1 baseline was about 3.5 seconds for native search and 3.2 seconds for native homepage extraction; these are audit observations, not guarantees of latency or search completeness. Then validate the bridge proxy and public service as above. Do not add a paid web service, API key, database, custom backend, or Hermes source patch.

The browser's `sessionStorage` holds only the current visit's bounded visible chat and draft; the bridge supplies that history to fresh upstream session IDs. There is no website chat database. Hermes's existing native sessions and logs remain enabled and retained according to its profile settings.

The separate `wechat-public` profile remains no-tools. For Hermes v0.21.1, keep its empty platform lists plus `agent.disabled_toolsets: ['all', 'context_engine']`, and verify its effective and runtime tool lists are empty. Populate Weixin `allow_admin_from` with the actual QR owner's ID; an empty list disables the administrative gate. Regular users should only have new/reset/stop commands. These are profile configuration changes, not Hermes source patches.
