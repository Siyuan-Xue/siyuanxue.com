# xuesiyuan.com.cn HTTPS Activation Design

## Goal

Enable the already-filed alternate domain `xuesiyuan.com.cn` and its `www`
host on the existing production server. All HTTP and HTTPS requests must retain
their path and query string while permanently redirecting to the canonical
origin, `https://siyuanxue.com`.

## Execution

- Run the repository's existing `ops/enable-https.sh` workflow from a Tencent
  Cloud Web terminal with root privileges.
- Use `iammilesxue@gmail.com` as the Let's Encrypt contact email. The address
  is passed to Certbot only and is not stored in repository configuration.
- Run the read-only `check` command first, then the atomic `apply` command for
  `xuesiyuan.com.cn`.
- Reuse the existing Nginx template, which covers both `xuesiyuan.com.cn` and
  `www.xuesiyuan.com.cn` and redirects them to the canonical site.

## Safety and Failure Handling

- Require both DNS names to resolve to `82.156.77.131` before certificate
  issuance. Public DNS currently satisfies this requirement.
- Let the script perform Let's Encrypt staging validation before requesting the
  production certificate.
- Let the script snapshot the prior Nginx state, validate every configuration
  with `nginx -t`, and restore the snapshot automatically if activation fails.
- Do not change the existing `siyuanxue.com` certificate, canonical origin, or
  GitHub deployment environment.

## Acceptance Criteria

- The certificate SAN contains exactly `xuesiyuan.com.cn` and
  `www.xuesiyuan.com.cn`.
- HTTP and HTTPS requests to both names return `301` to
  `https://siyuanxue.com`, preserving the original path and query string.
- `https://siyuanxue.com/__health` remains healthy and the primary site is
  unaffected.
- `certbot renew --cert-name xuesiyuan.com.cn --dry-run` succeeds.
