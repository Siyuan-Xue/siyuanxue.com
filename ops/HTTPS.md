# 三域名 HTTPS 运行手册

本项目使用 **Let's Encrypt + Certbot 官方 snap + HTTP-01/webroot + Nginx**
为个人网站提供 HTTPS。唯一 canonical 地址是 `https://siyuanxue.com`。

生产主机：腾讯云 Lighthouse `82.156.77.131`（Ubuntu 24.04 + Nginx）。

## 域名与启用阶段

每个注册域名使用一张独立证书，证书同时覆盖根域名和 `www`。

| 阶段 | 证书名称 | SAN | 行为 |
| --- | --- | --- | --- |
| 当前阶段 | `siyuanxue.com` | `siyuanxue.com`、`www.siyuanxue.com` | apex 提供站点；www 301 到 apex |
| 备案后 | `xuesiyuan.com` | `xuesiyuan.com`、`www.xuesiyuan.com` | 全部 301 到 canonical |
| 备案后 | `xuesiyuan.com.cn` | `xuesiyuan.com.cn`、`www.xuesiyuan.com.cn` | 全部 301 到 canonical |

`xuesiyuan.com` 与 `xuesiyuan.com.cn` 在各自完成 ICP 备案前不得执行
`apply`。未启用的 HTTP Host 返回 444，未知 TLS SNI 会被拒绝。

所有跳转均保留 `$request_uri`，因此路径和查询参数不会丢失。

## 账号侧前置条件

人工只处理身份或账号所有权相关步骤，不手工编辑 Nginx、证书或 cron：

1. 确认即将启用的根域名已经完成 ICP 备案及腾讯云接入。
2. 确保根域名和 `www` 均解析到 `82.156.77.131`。
3. 登录腾讯云，允许 Lighthouse 入站 TCP 80 和 443。
4. 首次切换后登录 GitHub，把 production Environment 的
   `DEPLOY_ORIGIN` 设置为 `https://siyuanxue.com`。

`DEPLOY_HOST` 始终保留为服务器 IP。Let’s Encrypt 联系邮箱只作为
`apply --email` 参数传入，不写进 Git。

## 管理命令

从仓库 `ops` 目录运行，或在首次成功执行后使用服务器安装的
`siyuanxue-enable-https`：

```bash
# 只读检查：站点、80 监听、本机 health、两个 DNS 名称
sudo ./ops/enable-https.sh check --domain siyuanxue.com

# staging 验证成功后签发正式证书并原子启用 Nginx
sudo ./ops/enable-https.sh apply \
  --domain siyuanxue.com \
  --email you@example.com

# 恢复该域名启用前的 Nginx 配置；保留证书
sudo ./ops/enable-https.sh rollback --domain siyuanxue.com
```

允许的 `--domain` 只有：

- `siyuanxue.com`
- `xuesiyuan.com`
- `xuesiyuan.com.cn`

`apply` 是幂等的：已有证书必须尚未进入 30 天到期窗口，并且 SAN 必须
精确等于根域名与 `www`；满足时复用证书，不重复下单。

## `apply` 的固定行为

1. 验证静态站、`/__health`、Nginx TCP 80 与两个 DNS 名称。
2. 安装或复用 Certbot 官方 snap；若发现 apt Certbot 正在管理现有证书则停止，
   不自动破坏已有 renewal lineage。
3. 安装临时的 HTTP-01 server block 和 `/var/lib/letsencrypt` webroot。
4. 对相同双名称集合执行 `certbot certonly --dry-run`。
5. staging 成功后签发正式证书；证书固定存放在
   `/etc/letsencrypt/live/<根域名>/`。
6. 安装对应的仓库 Nginx 模板，执行 `nginx -t`，再 reload。
7. 安装 renewal deploy hook，并运行该证书的 `certbot renew --dry-run`。
8. 将管理工具安装为 `/usr/local/sbin/siyuanxue-enable-https`，供后续备案阶段复用。

任何步骤失败都会删除临时 ACME 配置并恢复事务开始前的 Nginx 文件和 symlink。
证书私钥永远只存在于服务器 `/etc/letsencrypt/`。

## Nginx 不变量

- `http://127.0.0.1/__health` 始终直接返回当前 release SHA，不做 301。
- IP HTTP 站点保留为应急访问路径。
- 已启用域名的 HTTP 请求除 ACME challenge 外全部 301 到 canonical。
- `https://siyuanxue.com` 提供静态站、现有安全头、gzip 和资源缓存。
- 其余已启用 HTTPS 名称全部 301 到 canonical。
- TLS 仅允许 1.2/1.3；不启用 HSTS 或 HSTS preload。
- `bootstrap-server.sh` 总会更新无证书 HTTP fallback；只有证书与活动 HTTPS
  配置同时存在时才保留 HTTPS，避免重复 bootstrap 降级或缺 pem 无法启动。

## 首次切换顺序

```text
功能分支 CI 通过
      ↓
腾讯云确认备案并放行 80/443
      ↓
check siyuanxue.com
      ↓
apply siyuanxue.com
      ↓
公网 HTTPS / redirect / health / renewal 验收
      ↓
GitHub production.DEPLOY_ORIGIN = https://siyuanxue.com
      ↓
合并功能分支并验证 Deploy production
```

必须先让服务器 HTTPS 通过，再修改 `DEPLOY_ORIGIN`。部署工作流只接受：

- 正常值：`https://siyuanxue.com`
- 紧急回退值：`http://82.156.77.131`

## 验收

```bash
curl -sI http://siyuanxue.com/
curl -sI http://www.siyuanxue.com/
curl -sI https://www.siyuanxue.com/
curl --fail https://siyuanxue.com/ >/dev/null
curl --fail https://siyuanxue.com/__health

# 服务器本机
curl --fail http://127.0.0.1/__health
sudo certbot certificates
sudo certbot renew --cert-name siyuanxue.com --dry-run
systemctl list-timers --all | grep -E 'certbot|snap.certbot'
```

第一阶段完成标准：

- apex HTTPS 返回 200。
- apex HTTP 与 www HTTP/HTTPS 返回指向 canonical 的 301。
- 证书 SAN 精确包含 `siyuanxue.com` 和 `www.siyuanxue.com`。
- HTTPS health 返回当前 release SHA，本机 HTTP health 仍返回相同 SHA。
- renewal dry-run 和 production deployment 均成功。

最终阶段还需逐一验证另外四个名称能完成有效 TLS 握手，并保留路径跳转。

## 应急回退

```bash
sudo siyuanxue-enable-https rollback --domain siyuanxue.com
```

如 production workflow 也需要回到 IP：

1. 把 GitHub `production.DEPLOY_ORIGIN` 改为 `http://82.156.77.131`。
2. 验证 `curl --fail http://82.156.77.131/__health`。
3. 运行一次 Deploy production。

回退不会删除 `/etc/letsencrypt`，恢复 HTTPS 时可重新执行同域名的 `apply`。

## 工程验证

```bash
bash ops/test-enable-https.sh
bash ops/test-install-nginx-config.sh
bash ops/test-nginx-config.sh
bash ops/test-release.sh
bun run build
```

CI 会验证脚本语法、签发顺序、幂等、失败恢复、bootstrap 防降级、三域名
Nginx 语法以及 Astro canonical 输出。
