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
