# Production deployment

The production target is the Tencent Cloud Lighthouse server at
`82.156.77.131`. Nginx serves the static Astro build over HTTP from
`/var/www/siyuanxue.com/current`. DNS, ICP filing, and HTTPS are intentionally
outside this setup.

## 1. Generate the CI-only SSH key

Generate an Ed25519 key outside the repository. The private key is intentionally
unencrypted because GitHub Actions must use it unattended; protect it as a
production credential.

```bash
ssh-keygen -t ed25519 -a 100 \
  -C github-actions-siyuanxue \
  -f /absolute/private/path/siyuanxue-deploy \
  -N ''
```

Never commit either key. Keep the private key in a secure local backup and put
its complete contents only in the GitHub `DEPLOY_SSH_KEY` Environment Secret.

## 2. Preflight and bootstrap Ubuntu

From the repository root, run the bootstrap helper. The existing `ubuntu`
password is entered only at the SSH and sudo prompts and is never recorded.

```bash
bash ops/bootstrap-remote.sh \
  /absolute/private/path/siyuanxue-deploy.pub
```

The helper runs the read-only preflight before applying changes. It aborts if
the host is not Ubuntu 24.04 or if a non-Nginx process owns TCP 80. The apply
step installs Nginx and Fail2ban, creates the password-locked
`deploy` user, installs `/usr/local/bin/siyuanxue-release`, and creates a
bootstrap release. It does not modify Docker or the existing `ubuntu` password
login. Re-running it updates the managed configuration without resetting an
existing `current` release.

In the Tencent Cloud Lighthouse firewall, allow inbound TCP 80 from the public
internet. TCP 22 must remain reachable by GitHub-hosted runners for deployment.

Verify key-only deployment access from the local machine:

```bash
ssh -i /absolute/private/path/siyuanxue-deploy \
  -p 22 deploy@82.156.77.131 /usr/bin/id
```

The account must not be able to use `sudo`.

## 3. Configure the GitHub production Environment

Create the `production` Environment in repository settings, restrict deployment
branches to `main`, and do not add required reviewers.

Environment variables:

| Name | Value |
| --- | --- |
| `DEPLOY_HOST` | `82.156.77.131` |
| `DEPLOY_PORT` | `22` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_ROOT` | `/var/www/siyuanxue.com` |
| `DEPLOY_ORIGIN` | `http://82.156.77.131` |

Environment secrets:

| Name | Value |
| --- | --- |
| `DEPLOY_SSH_KEY` | Complete private Ed25519 key generated in step 1 |
| `DEPLOY_KNOWN_HOSTS` | Complete `82.156.77.131 ssh-ed25519 ...` line printed by the bootstrap script |

The known-hosts value must come from the trusted password-authenticated session;
do not replace it with an unchecked `ssh-keyscan` result. No GitHub PAT, server
password, root password, or Tencent Cloud API key is required.

## 4. Deploy and roll back

A push to `main` automatically builds, uploads, activates, and verifies the new
release. The workflow restores `previous` when the public health check fails.

For a manual deployment, run the **Deploy production** workflow with operation
`deploy`. For rollback, choose operation `rollback` and enter a retained full
40-character commit SHA. The server retains five successful releases plus the
bootstrap fallback.

Useful diagnostics:

```bash
curl --fail http://82.156.77.131/__health
sudo nginx -t
sudo systemctl status nginx fail2ban
sudo fail2ban-client status sshd
sudo tail -n 100 /var/log/nginx/siyuanxue.error.log
readlink /var/www/siyuanxue.com/current
readlink /var/www/siyuanxue.com/previous
```
