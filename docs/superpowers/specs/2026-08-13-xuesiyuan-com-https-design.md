# xuesiyuan.com HTTPS Activation Design

## Goal

Enable the filed alternate domain `xuesiyuan.com` and its `www` host on the
existing production server. All HTTP and HTTPS requests must retain their path
and query string while permanently redirecting to the canonical origin,
`https://siyuanxue.com`.

## Current State

- Public DNS is hosted by DNSPod.
- `xuesiyuan.com` and `www.xuesiyuan.com` already have A records pointing to
  `82.156.77.131` with a 600-second TTL, matching `xuesiyuan.com.cn`.
- The production server currently rejects the two HTTP hosts and their TLS SNI,
  so DNS must not be duplicated or changed; only server activation remains.
- The repository already contains the matching Nginx template and domain
  allow-list entry for `xuesiyuan.com`.

## Activation Design

- Reuse the repository's existing `ops/enable-https.sh` workflow from a Tencent
  Cloud terminal with root privileges.
- Synchronize the management bundle from pinned repository revision
  `14ba15a47c4009068dbb7b326e2359379cd256a4` before activation. That revision
  includes the fixed script-path resolution and the `xuesiyuan.com` Nginx
  template.
- Use `iammilesxue@gmail.com` as the Let's Encrypt contact email. The address is
  passed to Certbot only and is not stored in repository configuration.
- Run the read-only `check` command before the atomic `apply` command.
- Issue an independent certificate whose SAN contains exactly `xuesiyuan.com`
  and `www.xuesiyuan.com`.
- Redirect both names over HTTP and HTTPS to `https://siyuanxue.com`, preserving
  `$request_uri`.

## Safety and Failure Handling

- Do not change DNS because both required records already resolve correctly.
- Do not modify the `siyuanxue.com` or `xuesiyuan.com.cn` certificates, Nginx
  configurations, or GitHub deployment environment.
- Let the script perform Let's Encrypt staging validation before production
  issuance, validate Nginx before every reload, and restore the prior
  `xuesiyuan.com` state automatically if activation fails.
- Provide server commands in the Codex conversation for the user to run; Codex
  must not execute commands on the production server.
- If public acceptance fails due to the new domain, use the domain-scoped
  rollback command. Certificate files remain available for a later retry.

## Acceptance Criteria

- The certificate SAN contains exactly `xuesiyuan.com` and
  `www.xuesiyuan.com`.
- HTTP and HTTPS requests to both names return `301` to
  `https://siyuanxue.com`, preserving the original path and query string.
- `https://siyuanxue.com/__health` remains healthy and the primary site is
  unaffected.
- `xuesiyuan.com.cn` continues to redirect and renew independently.
- `certbot renew --cert-name xuesiyuan.com --dry-run` succeeds.
