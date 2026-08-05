# xuesiyuan.com.cn HTTPS Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable HTTPS for `xuesiyuan.com.cn` and `www.xuesiyuan.com.cn`, then permanently redirect both hosts to `https://siyuanxue.com` while preserving paths and query strings.

**Architecture:** Use the already-installed `siyuanxue-enable-https` command from a Tencent Cloud Web terminal. The command performs DNS and origin preflight checks, Let's Encrypt staging and production issuance, atomic Nginx installation, renewal validation, and automatic rollback on failure; public checks then verify the resulting redirects and primary-site health.

**Tech Stack:** Bash, Nginx, Let's Encrypt, Certbot snap, curl, OpenSSL, Tencent Cloud Lighthouse

## Global Constraints

- The canonical origin remains exactly `https://siyuanxue.com`.
- The certificate SAN must contain exactly `xuesiyuan.com.cn` and `www.xuesiyuan.com.cn`.
- Use `iammilesxue@gmail.com` only as the Certbot contact email; do not store it in repository configuration.
- Both alternate hosts must return `301` for HTTP and HTTPS while preserving the original path and query string.
- Do not change the existing `siyuanxue.com` certificate, GitHub deployment environment, or application source.
- Run privileged commands only in the Tencent Cloud Web terminal on production host `82.156.77.131`.

---

### Task 1: Production Preflight

**Files:**
- Read: `ops/enable-https.sh`
- Read: `ops/HTTPS.md`
- Modify: none

**Interfaces:**
- Consumes: installed command `/usr/local/sbin/siyuanxue-enable-https`, production site under `/var/www/siyuanxue.com/current`, public DNS for the apex and `www` hosts
- Produces: a successful read-only preflight proving the site, Nginx listener, local health endpoint, and both DNS records are ready

- [ ] **Step 1: Open the production terminal**

Open the Tencent Cloud Lighthouse Web terminal for `82.156.77.131` and log in as an account with `sudo` access.

- [ ] **Step 2: Run the read-only domain preflight**

```bash
sudo siyuanxue-enable-https check --domain xuesiyuan.com.cn
```

Expected final line:

```text
Preflight passed for xuesiyuan.com.cn and www.xuesiyuan.com.cn.
```

If this command fails, stop before certificate issuance. Resolve the exact reported DNS, Nginx, release, or local-health prerequisite and rerun the same check.

### Task 2: Atomic Certificate and Nginx Activation

**Files:**
- Read: `ops/nginx/xuesiyuan.com.cn.conf`
- Server-managed: `/etc/letsencrypt/live/xuesiyuan.com.cn/`
- Server-managed: `/etc/nginx/sites-available/siyuanxue-xuesiyuan-com-cn`
- Server-managed: `/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com-cn`

**Interfaces:**
- Consumes: Task 1's successful preflight and contact email `iammilesxue@gmail.com`
- Produces: a valid two-name certificate, enabled Nginx redirect configuration, renewal deploy hook, and rollback snapshot

- [ ] **Step 1: Run the atomic activation command**

```bash
sudo siyuanxue-enable-https apply \
  --domain xuesiyuan.com.cn \
  --email iammilesxue@gmail.com
```

Expected final line after staging, production issuance, Nginx validation, reload, and renewal dry-run:

```text
HTTPS enabled for xuesiyuan.com.cn and www.xuesiyuan.com.cn.
```

The script restores the prior Nginx state automatically if any activation step fails. If it exits nonzero, retain the complete terminal output and do not manually edit Nginx or request another certificate.

- [ ] **Step 2: Verify the active server configuration**

```bash
sudo nginx -t
sudo certbot certificates
```

Expected: `nginx -t` reports successful syntax and configuration tests; Certbot lists certificate name `xuesiyuan.com.cn` with both DNS names.

- [ ] **Step 3: Verify renewal independently**

```bash
sudo certbot renew --cert-name xuesiyuan.com.cn --dry-run
```

Expected: Certbot reports a successful simulated renewal for `xuesiyuan.com.cn`.

### Task 3: Public Acceptance and Rollback Gate

**Files:**
- Modify: none

**Interfaces:**
- Consumes: Task 2's active certificate and Nginx configuration
- Produces: public evidence for all four redirects, exact SAN coverage, and unchanged primary-site health

- [ ] **Step 1: Verify all four path-preserving redirects**

Run these commands from the local terminal:

```bash
curl -sS -o /dev/null -D - 'http://xuesiyuan.com.cn/https-probe/path?source=acceptance'
curl -sS -o /dev/null -D - 'http://www.xuesiyuan.com.cn/https-probe/path?source=acceptance'
curl -sS -o /dev/null -D - 'https://xuesiyuan.com.cn/https-probe/path?source=acceptance'
curl -sS -o /dev/null -D - 'https://www.xuesiyuan.com.cn/https-probe/path?source=acceptance'
```

Expected for every request: status `301` and this exact location:

```text
Location: https://siyuanxue.com/https-probe/path?source=acceptance
```

- [ ] **Step 2: Verify certificate SAN coverage**

```bash
openssl s_client \
  -connect xuesiyuan.com.cn:443 \
  -servername xuesiyuan.com.cn </dev/null 2>/dev/null \
  | openssl x509 -noout -text \
  | sed -n '/Subject Alternative Name/{n;p;}'
```

Expected SAN line contains only:

```text
DNS:xuesiyuan.com.cn, DNS:www.xuesiyuan.com.cn
```

- [ ] **Step 3: Verify the canonical site remains healthy**

```bash
test "$(curl --fail --silent https://siyuanxue.com/__health)" = \
  "$(curl --fail --silent http://82.156.77.131/__health)"
curl --fail --silent --show-error https://siyuanxue.com/ >/dev/null
```

Expected: both commands exit with status `0`.

- [ ] **Step 4: Roll back only if public acceptance fails**

If any check in Steps 1–3 fails because of the newly activated alternate domain, run in the Tencent Cloud Web terminal:

```bash
sudo siyuanxue-enable-https rollback --domain xuesiyuan.com.cn
sudo nginx -t
curl --fail --silent --show-error https://siyuanxue.com/__health
```

Expected: rollback reports that the prior Nginx configuration was restored, `nginx -t` succeeds, and the canonical health endpoint remains available. Certificate files are intentionally retained.
