# Deployment operations

Start with the [maintenance inventory and update checklist](../docs/MAINTENANCE.md). Static GitHub releases do not install server helpers or Nginx changes. The website chat, its bridge and every agent service (Hermes, OpenClaw) were removed in November 2026; see section 4 of the inventory.

Production is Ubuntu 24.04 / Nginx on Tencent Lighthouse. Connect to the verified public address:

```sh
ssh ubuntu@82.156.77.131
```

The previously reported `87.156.77.131` was the wrong address. SSH connectivity and authentication to the correct host were verified. Keep passwords and private keys out of this repository. Tencent OrcaTerm is the fallback when SSH is unavailable.

## Layout and permissions

`/var/www/siyuanxue.com` is owned by `deploy:www-data`; ordinary `ubuntu` directory access requires `sudo`. Its `current` and `previous` links point to `releases/<40-character-commit>`. English is at the release root; Chinese is under `zh`. Both expose the same commit at `/__health`. `release.json` records version 2 and locale roots `{ "en": ".", "zh": "zh" }`.

`shared/_astro` is append-only and served by both domains. Activation backfills current/retained release assets and refuses filename/content collisions. It does not copy raw photos into that directory. Retain five successful releases; shared hashed assets have no automatic pruning in this version.

## Direct media uploads

Since 2026-10-11, photo/video originals and image thumbnails are uploaded directly to `shared/media`, independently of website releases. Git stores only IDs and metadata in `src/data/media.json`; CI builds both languages without downloading or packaging these media files. Small source icons and installed fonts remain part of the website build. Existing Git history and retained releases are preserved.

Prepare a real image locally with the installed Sharp dependency, upload its ID, then check production before publishing JSON references:

```sh
bun run media:prepare pixeldone/tasks /absolute/path/tasks.png --profile product
bun run media:upload ubuntu@82.156.77.131 media-local src/data/media.json pixeldone/tasks
python3 ops/verify-media.py
```

Use `photos` for normal galleries, `product` for small phone screenshots, `portrait` for the home portrait, or `plain` for an image without responsive thumbnails. MP4/WebM/MOV files are copied and hashed with bounded memory; video IDs cannot be used as gallery images. Galleries now accept video IDs through their optional `videos` field, with an image poster, caption, measured duration and first-publication date; see [the gallery guide](../docs/GALLERIES.md). Native players and download links are rendered in HTML, independently of the image lightbox. Check production Range responses for new videos before releasing their references. ID updates create new immutable file URLs; they do not overwrite older files. Preserve truthful bilingual captions and the fixed `Pixel Done` display name.

Omitting the last IDs uploads the full manifest and requires all referenced files in `media-local`. On a fresh checkout, upload the IDs just prepared; existing media stays on the server. `media-local/`, raster images and videos are Git-ignored. Local `media-local/originals/` holds this migration's original source copies; preserve the local directory independently when moving machines. Dev and static preview proxy `/media/` to the appropriate production domain, so CI needs metadata only.

The upload command uses native SSH authentication and strict `known_hosts`; enter a password only in its terminal prompt or use an existing key. No password, SSH key or secret is stored by these scripts. The administrator needs `sudo -n` for installation. `MEDIA_SSH_CONTROL` may point to an already authenticated control socket; otherwise the command creates and closes its own temporary connection.

Rsync transfers only the selected manifest's files into `~/.cache/siyuan-media/<manifest-SHA>/media`; partial transfers remain there and can resume on the same manifest. `ops/install-media.py` verifies paths, formats, regular files, SHA-256 and lengths before installation; checksum errors or retained-file collisions abort. Installation appends files and never prunes media. A manifest plus hard-link recovery snapshot is stored in `/var/backups/siyuanxue-media/<manifest-SHA>/`; this is on the same disk, not offsite disaster recovery. Check capacity and arrange an independent backup separately. Do not put private content into this public directory.

Nginx media locations in `ops/nginx/{siyuanxue.com,xuesiyuan.com}.conf` require a separate, backed-up server installation; pushing the static website does not install them. Insert only these locations into the existing content vhosts, preserving certificates, chat routes, redirects and `/images/p-202.jpg` 410. Check `nginx -t`, reload, and test both domains, image MIME/cache, video Range and missing/hidden-file 404. The migration's actual vhost backups are recorded in the maintenance inventory. Do not replace whole live configs using an old template.

`python3 ops/verify-media.py` checks every listed media file on both domains including its SHA-256. Actions uses `--headers-only` after activation to reject missing or malformed media before finalization. Website rollback keeps all media; if media is lost, restore the files from local storage or a verified snapshot, rerun hash/public checks, then use the usual Actions rollback. No existing `_astro` files are deleted during migration.

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

Optional repository Actions variable `BAIDU_SITE_VERIFICATION_ZH` holds the public HTML ownership-verification value issued by Baidu Search Resource Platform. Store only the supplied `content` value in Settings → Secrets and variables → Actions → Variables, at repository scope so the reusable CI verification job can read it before the `production` deployment job. `.github/workflows/ci.yml` passes it to the static build; `src/components/BaseHead.astro` trims surrounding whitespace and emits `baidu-site-verification` only on the Chinese homepage when the value is nonempty. English and other Chinese pages omit it. Do not commit the actual verification value to source or documentation.

Configure this variable before the first deployment of a new commit SHA, then publish both languages through the normal Actions workflow, inspect the Chinese homepage's public HTML and both release SHAs, and complete verification in Baidu's console. A published tag alone does not confirm Baidu ownership or indexing. Later value corrections or removal require another fresh commit SHA and normal Actions release: the release helper reuses `releases/<SHA>`, so rerunning or manually dispatching the same SHA does not replace its tag. Retained releases keep their original tag, including after rollback. No server helper or service installation is needed.

The production job uses read-only Actions permission to obtain the current run's verified artifact download URL. `ops/upload-release.py` sends a short-lived HTTPS URL over strict SSH; the server downloads the same artifact into its existing `incoming/` directory. Large artifacts use up to 16 simultaneous HTTP range requests to address slow individual cross-border connections. Each response must have the exact requested `Content-Range` and byte count; an unsupported or incomplete range aborts the transfer. ZIP digest, exact entries, archive size and SHA-256 are checked before replacing the incoming files; the installed release helper still performs its normal checksum and activation checks. The GitHub token stays on the runner, and the URL is masked and kept out of command arguments. Only temporary files created by this transfer are cleaned up. No server installation or new secret is required. The download has a 900-second bound, strict SSH a 960-second timeout, and the Actions transfer step a 17-minute limit within the 20-minute deployment job, leaving the current release in place on failure.

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

## Public chat (removed)

The `/chat/` page, the `hermes-chat` bridge, its systemd unit, env file, service account and the `/chat-api` Nginx snippet were removed on 2026-11-26. The tracked Nginx templates no longer include a chat snippet, and nothing on the server listens on 8643, 18789 or 19089. `/chat/` and `/chat-api` now fall through to the normal 404. The removed sources are in Git history before the removal commit; reinstalling them is a new project, not a restore step.
