# Two-domain HTTPS and migration

Only these hostnames serve or redirect to this blog:

| Host | HTTPS behavior |
|---|---|
| siyuanxue.com | English from current/ |
| www.siyuanxue.com | 301 to the English apex, preserving request URI |
| xuesiyuan.com | Chinese from current/zh/ |
| www.xuesiyuan.com | 301 to the Chinese apex, preserving request URI |

HTTP requests canonicalize to each host's own HTTPS apex, except the ACME challenge path. Each apex owns the certificate covering itself and its www name. English `/zh` and `/zh/…` are internal paths and return 404. Unknown hostnames are rejected by the default server; `xuesiyuan.com.cn` and its www have no active site configuration.

Both sites deny `/images/p-202.jpg` with 410. HTML is revalidated, while `/_astro/` uses the append-only shared asset directory and immutable caching. Keep this denial even when reverting code.

## Existing certificate management

```sh
sudo bash ops/enable-https.sh check --domain siyuanxue.com
sudo bash ops/enable-https.sh check --domain xuesiyuan.com
sudo bash ops/enable-https.sh apply --domain siyuanxue.com --email YOUR_REAL_EMAIL
sudo bash ops/enable-https.sh apply --domain xuesiyuan.com --email YOUR_REAL_EMAIL
```

Use the existing contact address for certificate operations. The helper refuses every other domain, validates DNS and existing local content, and requires the Chinese homepage and matching health marker before activating its domain. It reuses a valid exact-domain certificate; issuance tests staging first. The shared Certbot timer and renewal deploy hook reload Nginx after validation.

## First migration through GitHub Actions

The existing `deploy` user cannot edit Nginx or installed helpers. An administrator therefore prepares this one-time migration through the Tencent Cloud console; all release uploads and version switches are performed by the existing GitHub deployment workflow.

1. Validate the branch through CI. Pause `Deploy production` while integrating the tested commit into main, so the first push cannot start with incompatible server configuration.
2. In the cloud console, download the exact commit source into a root-owned directory and verify the archive SHA-256 against the reviewed local download. Run `sudo bash SOURCE/ops/migrate-dual-domain.sh prepare SOURCE COMMIT_SHA`. Do not run unpinned branch URLs as root.
3. Preparation creates `/var/backups/siyuanxue-dual-domain-20260911` with mode 0700, containing the old configuration, helper, content and link targets. It installs the reviewed helper, backfills shared assets, and enables the English photo-safe configuration. It leaves the current release and Chinese redirect unchanged. Its only temporary sudo grant permits `deploy` to call three fixed, argument-free operations: `apply`, `restore`, `finish`.
4. Re-enable `Deploy production` and dispatch it on the prepared main commit with `operation=deploy` and `migrate_domains=true`. The reusable CI job verifies/builds/packages both locales; deploy downloads that artifact, activates it, and calls `apply`. Apply refuses any commit other than the root-recorded expected SHA, installs Chinese routing, removes the retired site's enabled link, and validates/reloads Nginx.
5. Both public domains must pass language, exact SHA and old-photo denial checks. Failure calls the separate migration `restore`, which restores the original routing and release together while retaining English photo denial. Normal daily recovery rejects legacy single-language releases.
6. After success, `finish` moves only the retired domain's renewal file into the root-only backup, leaves certificate archives inactive, removes its installed template, makes the first bilingual release its own initial recovery target, and revokes the temporary sudo grant. Subsequent deploys use the default `migrate_domains=false` path and retain five releases.

Do not rerun preparation against an existing migration backup. The source SHA, backup path and workflow run identify the migration record. Credentials are never included. Previously cached permanent redirects can persist in a visitor's browser; verify server routing using a fresh request.

## Recovery

Use the concrete backup recorded during migration. Before switching a release, verify it contains the locale roots expected by the active Nginx configuration. Restore only this website's files and symlinks, validate Nginx, then reload; do not restore an entire machine configuration tree. A successful local health check alone does not establish that the Chinese domain or public certificate works.
