# xuesiyuan.com HTTPS Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable HTTPS for `xuesiyuan.com` and `www.xuesiyuan.com`, then permanently redirect both hosts to `https://siyuanxue.com` while preserving paths and query strings.

**Architecture:** Public DNS is already correct, so no DNS mutation is required. The user downloads a checksum-pinned repository archive in the Tencent Cloud terminal and runs the repository's existing transactional HTTPS workflow, which performs origin preflight, Let's Encrypt staging and production issuance, atomic Nginx activation, renewal validation, and automatic failure recovery.

**Tech Stack:** Bash, Nginx, Let's Encrypt, Certbot snap, curl, OpenSSL, DNSPod, Tencent Cloud Lighthouse

## Global Constraints

- The canonical origin remains exactly `https://siyuanxue.com`.
- Public DNS for `xuesiyuan.com` and `www.xuesiyuan.com` already points to `82.156.77.131` with TTL 600; do not add duplicate records or alter DNS.
- The certificate SAN must contain exactly `xuesiyuan.com` and `www.xuesiyuan.com`.
- Use `iammilesxue@gmail.com` only as the Certbot contact email; do not store it in repository configuration.
- Both alternate hosts must return `301` for HTTP and HTTPS while preserving the complete request URI.
- Do not change the existing `siyuanxue.com` or `xuesiyuan.com.cn` certificates, GitHub deployment environment, or application source.
- Pin the management bundle to repository revision `14ba15a47c4009068dbb7b326e2359379cd256a4` and archive SHA-256 `723f734933d0c693a614de6fd33b8fd23d6f018348c876ff24aaaf5c037f1c2f`.
- Codex must not run production-server commands. The user runs every privileged command in the Tencent Cloud terminal for `82.156.77.131`.

---

## File and State Map

- Repository input: `ops/enable-https.sh` — validates prerequisites and manages the activation transaction.
- Repository input: `ops/nginx/xuesiyuan.com.conf` — redirects both HTTP and HTTPS hosts to the canonical origin.
- Repository input: `ops/nginx/acme.conf.template` — temporary HTTP-01 challenge server.
- Repository input: `ops/reload-nginx-after-renewal.sh` — renewal deploy hook.
- Server-managed output: `/usr/local/lib/siyuanxue-https/` — installed management bundle.
- Server-managed output: `/usr/local/sbin/siyuanxue-enable-https` — stable management command symlink.
- Server-managed output: `/etc/nginx/sites-available/siyuanxue-xuesiyuan-com` — active domain configuration.
- Server-managed output: `/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com` — enabled configuration symlink.
- Server-managed output: `/etc/letsencrypt/live/xuesiyuan.com/` — independent certificate lineage.
- Server-managed state: `/var/lib/siyuanxue-https/xuesiyuan.com/` — rollback snapshot.

### Task 1: Reconfirm Public DNS Without Changing It

**Files:**
- Modify: none

**Interfaces:**
- Consumes: DNSPod public records for `xuesiyuan.com` and `www.xuesiyuan.com`
- Produces: proof that both names resolve to `82.156.77.131` before certificate issuance

- [ ] **Step 1: Query a public DNS-over-HTTPS resolver**

Run from any trusted local terminal:

```bash
curl -fsS 'https://dns.alidns.com/resolve?name=xuesiyuan.com&type=A'
curl -fsS 'https://dns.alidns.com/resolve?name=www.xuesiyuan.com&type=A'
```

Expected: both JSON responses have `"Status":0` and contain an A-record answer whose `"data"` is `"82.156.77.131"`.

- [ ] **Step 2: Stop if either record differs**

Do not continue to Task 2 unless both names resolve to `82.156.77.131`. Do not add a second record when the expected record already exists.

### Task 2: Download and Validate the Pinned Management Bundle

**Files:**
- Read: repository archive at revision `14ba15a47c4009068dbb7b326e2359379cd256a4`
- Modify: temporary files under `/tmp` only

**Interfaces:**
- Consumes: public GitHub source archive and expected SHA-256
- Produces: a syntax-checked HTTPS workflow directory in a unique temporary path

- [ ] **Step 1: Open the production terminal**

Open the Tencent Cloud Lighthouse terminal for `82.156.77.131` and log in as the Ubuntu account with `sudo` access.

- [ ] **Step 2: Download, checksum, and extract the pinned source**

Copy and run this entire block in the production terminal:

```bash
set -euo pipefail

SIYUANXUE_REV='14ba15a47c4009068dbb7b326e2359379cd256a4'
SIYUANXUE_ARCHIVE="/tmp/siyuanxue-${SIYUANXUE_REV}.tar.gz"
SIYUANXUE_WORK_DIR="$(mktemp -d /tmp/siyuanxue-https.XXXXXX)"

curl -fL \
  "https://codeload.github.com/Siyuan-Xue/siyuanxue.com/tar.gz/${SIYUANXUE_REV}" \
  -o "$SIYUANXUE_ARCHIVE"

echo '723f734933d0c693a614de6fd33b8fd23d6f018348c876ff24aaaf5c037f1c2f  '"$SIYUANXUE_ARCHIVE" \
  | sha256sum -c -

tar -xzf "$SIYUANXUE_ARCHIVE" \
  -C "$SIYUANXUE_WORK_DIR" \
  --strip-components=1

bash -n "$SIYUANXUE_WORK_DIR/ops/enable-https.sh"
bash -n "$SIYUANXUE_WORK_DIR/ops/reload-nginx-after-renewal.sh"
test -f "$SIYUANXUE_WORK_DIR/ops/nginx/acme.conf.template"
test -f "$SIYUANXUE_WORK_DIR/ops/nginx/xuesiyuan.com.conf"

printf 'Verified HTTPS bundle at %s\n' "$SIYUANXUE_WORK_DIR"
```

Expected: `sha256sum` prints `OK`, both `bash -n` commands exit silently, both file checks succeed, and the final line prints the temporary bundle path. Keep this terminal open because Task 3 uses `SIYUANXUE_WORK_DIR` from the same shell.

### Task 3: Run Read-Only Production Preflight

**Files:**
- Read: `$SIYUANXUE_WORK_DIR/ops/enable-https.sh`
- Modify: none

**Interfaces:**
- Consumes: Task 2's `SIYUANXUE_WORK_DIR`, production site, Nginx TCP 80 listener, local health endpoint, and public DNS
- Produces: a successful preflight for both alternate names

- [ ] **Step 1: Run the pinned workflow's read-only check**

Run in the same production terminal used for Task 2:

```bash
sudo "$SIYUANXUE_WORK_DIR/ops/enable-https.sh" check \
  --domain xuesiyuan.com
```

Expected final line:

```text
Preflight passed for xuesiyuan.com and www.xuesiyuan.com.
```

- [ ] **Step 2: Stop on any preflight failure**

If the command exits nonzero, do not run `apply`. Preserve its complete output. The message identifies the failed DNS, Nginx listener, deployed site, or local-health prerequisite.

### Task 4: Activate the Certificate and Redirect Configuration

**Files:**
- Read: `$SIYUANXUE_WORK_DIR/ops/nginx/xuesiyuan.com.conf`
- Create or update: `/usr/local/lib/siyuanxue-https/`
- Create: `/etc/letsencrypt/live/xuesiyuan.com/`
- Create: `/etc/nginx/sites-available/siyuanxue-xuesiyuan-com`
- Create: `/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com`
- Create: `/var/lib/siyuanxue-https/xuesiyuan.com/rollback/`

**Interfaces:**
- Consumes: Task 3's successful preflight and contact email `iammilesxue@gmail.com`
- Produces: a valid two-name certificate, active redirect configuration, installed management bundle, renewal hook, and rollback snapshot

- [ ] **Step 1: Run the transactional activation**

Run in the same production terminal:

```bash
sudo "$SIYUANXUE_WORK_DIR/ops/enable-https.sh" apply \
  --domain xuesiyuan.com \
  --email iammilesxue@gmail.com
```

Expected final line after staging validation, production issuance, Nginx reload, and renewal dry-run:

```text
HTTPS enabled for xuesiyuan.com and www.xuesiyuan.com.
```

If the command exits nonzero, do not manually edit Nginx or immediately repeat certificate issuance. The script automatically removes its temporary ACME configuration and restores the prior `xuesiyuan.com` Nginx state.

- [ ] **Step 2: Verify the installed command and active server state**

```bash
readlink -f /usr/local/sbin/siyuanxue-enable-https
sudo nginx -t
sudo certbot certificates
sudo certbot renew --cert-name xuesiyuan.com --dry-run
```

Expected:

- `readlink` prints `/usr/local/lib/siyuanxue-https/enable-https.sh`.
- `nginx -t` reports successful syntax and configuration tests.
- Certbot lists certificate name `xuesiyuan.com` with DNS names `xuesiyuan.com` and `www.xuesiyuan.com`.
- The targeted renewal simulation succeeds.

### Task 5: Verify Public Redirects and Existing Domains

**Files:**
- Modify: none

**Interfaces:**
- Consumes: Task 4's active certificate and Nginx configuration
- Produces: public evidence for all four new-domain endpoints, exact SAN coverage, canonical health, and unchanged `.com.cn` behavior

- [ ] **Step 1: Verify all four path-preserving redirects**

Run in the production terminal. These requests use the public domain names and
therefore validate the same externally published DNS and TLS endpoints:

```bash
for url in \
  'http://xuesiyuan.com/https-probe/path?source=acceptance' \
  'http://www.xuesiyuan.com/https-probe/path?source=acceptance' \
  'https://xuesiyuan.com/https-probe/path?source=acceptance' \
  'https://www.xuesiyuan.com/https-probe/path?source=acceptance'
do
  curl -sS -o /dev/null \
    -w '%{http_code} %{redirect_url}\n' \
    "$url"
done
```

Expected output for every request:

```text
301 https://siyuanxue.com/https-probe/path?source=acceptance
```

- [ ] **Step 2: Verify exact certificate SAN coverage**

```bash
openssl s_client \
  -connect xuesiyuan.com:443 \
  -servername xuesiyuan.com </dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
```

Expected SAN values: `DNS:xuesiyuan.com` and `DNS:www.xuesiyuan.com`, with no unrelated domain names.

- [ ] **Step 3: Verify the canonical site and `.com.cn` remain healthy**

Continue in the production terminal:

```bash
test "$(curl --fail --silent https://siyuanxue.com/__health)" = \
  "$(curl --fail --silent http://82.156.77.131/__health)"

curl --fail --silent --show-error https://siyuanxue.com/ >/dev/null

curl -sS -o /dev/null \
  -w '%{http_code} %{redirect_url}\n' \
  'https://xuesiyuan.com.cn/https-probe/path?source=acceptance'

sudo certbot renew --cert-name xuesiyuan.com.cn --dry-run
```

Expected: the health comparison and canonical page request exit `0`; `.com.cn` returns the same `301` canonical redirect; its independent renewal simulation succeeds.

- [ ] **Step 4: Keep the activation when all checks pass**

No additional Nginx, DNS, GitHub, or application change is required after all Task 5 checks pass.

### Task 6: Domain-Scoped Rollback Only if Acceptance Fails

**Files:**
- Restore from: `/var/lib/siyuanxue-https/xuesiyuan.com/rollback/`
- Modify: only the `xuesiyuan.com` Nginx site state

**Interfaces:**
- Consumes: a Task 5 failure attributable to the new `xuesiyuan.com` activation
- Produces: restored pre-activation Nginx state while retaining certificate files

- [ ] **Step 1: Roll back only when the new domain caused an acceptance failure**

Run in the production terminal only if Task 5 fails because of the new configuration:

```bash
sudo siyuanxue-enable-https rollback --domain xuesiyuan.com
sudo nginx -t
curl --fail --silent --show-error https://siyuanxue.com/__health
```

Expected: rollback reports that the previous Nginx configuration was restored, `nginx -t` succeeds, and the canonical health endpoint remains available. The new certificate files are intentionally retained for a later retry.
