# Google 中文 sitemap 公网诊断

日期：2026-10-11，公网取证时间约 **21:30–21:31 北京时间**（响应为 13:30–13:31 UTC），本地 XML 对照完成于随后几分钟。范围：只读比较中英文 sitemap 的 DNS、HTTPS、HTTP 方法/版本/压缩、XML 与引用关系；未操作百度、Search Console、服务器配置、DNS 或源码。本文件不替代同期 Search Console 平台报告。

## 结论与边界

本轮没有重现持续的公网访问、压缩或 XML 格式故障，也没有找到能解释「英文成功、中文读取失败」的协议差异。**Google 中文 sitemap 报告失败的具体原因仍未知，不能据此宣称已经修复，也不能认定是缓存、备案、抓取需求或临时延迟。**

此前约 19:11 的中文报告显示 `Couldn't fetch / Sitemap could not be read`，19:11:49 的 Google 实时测试抓取 XML 成功，中文 Manual actions 无问题，见[此前接入审计](2026-10-11-search-console-onboarding.md)。这些是历史平台证据；本轮独立公网诊断不冒充 Google 抓取，不把本机成功当作所有地域或 Google 抓取节点均成功。

主任务随后同步的本轮平台证据：中文 index 报告刷新仍为 `Sitemap could not be read`，没有可展开的具体错误；再次 Live test 的平台时间原样为 `Oct 11, 2026, 9:31:19 PM`，Google Inspection Tool smartphone 返回 Crawl allowed Yes、Page fetch Successful、Indexing allowed Yes。没有给 XML 申请索引。该证据来自主任务的 GSC 操作，本独立诊断未操作浏览器；其后的子 sitemap 对照提交及平台结果见[后续审计](2026-10-11-search-followup.md)。

Google 官方将 sitemap 文件抓取错误与已获取文件后的解析错误分开；建议展开报告详情，并对报告中的精确 URL 做实时检查。实时检查成功说明当次可取，不能替代 sitemap 报告处理成功。参见 [Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en#fetch_errors) 和[构建 sitemap 指南](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。

## 方法与生产版本

- 开始时工作区干净，`main` 为 `4b154a1`，仅一个工作树；没有切换分支或改动已有文件。
- 两域名 `/__health` 本轮均为 `57a0c8a9d744e9ed511594452737c75e09db65dc`。本地后续文档提交不等于新生产版本。
- 使用公开 Google DNS-over-HTTPS 查询 A、AAAA、NS；随后以已核对的 IP `82.156.77.131` 固定连接，保留真实域名 Host/SNI 和证书校验，避免本机 DNS/fake-IP 对诊断的影响。使用普通 curl UA，没有将请求伪装成真实 Google 来源。
- 每域名检查 `/sitemap-index.xml`、`/sitemap-0.xml`、`/sitemap-images.xml`、`/sitemap-videos.xml`、`/robots.txt`。每入口分别进行 HTTP/2 GET identity、HTTP/2 HEAD、HTTP/2 GET gzip、HTTP/1.1 GET gzip，共 **40 次**；未跟随重定向。
- 原始公开响应、修正为不区分大小写的 HTTP 头解析结果和 XML 摘要临时保存在 `/private/tmp/sitemap-diag-20261011/`，不是长期备份；未存账号、验证值、私有配置或服务器日志。

## DNS 与 HTTP 证据

| 检查 | 中文 `xuesiyuan.com` | 英文 `siyuanxue.com` |
|---|---|---|
| Google DoH A | `82.156.77.131`，TTL 600 | `82.156.77.131`，TTL 600 |
| Google DoH AAAA | NOERROR，无 AAAA 回答 | NOERROR，无 AAAA 回答 |
| NS | `lennon.dnspod.net`、`radius.dnspod.net` | 相同 |
| HTTPS canonical 的 20 次请求 | 全部 200，无跳转 | 全部 200，无跳转 |
| TLS 校验 | 全部通过；未使用 `--insecure` | 相同 |
| XML / robots 类型 | `text/xml` / `text/plain` | 相同 |
| 缓存 / 索引响应头 | `Cache-Control: no-cache`，无 `X-Robots-Tag` | 相同 |
| HEAD 与未压缩 GET | 状态、Content-Length、Content-Type、ETag、Last-Modified 一致 | 相同 |
| HTTP 与 HTTPS www 的 index | 分别 301 至本域名 HTTPS apex 的相同路径 | 相同 |

canonical index 是直接 200；HTTP/www 的 301 不是已提交精确 HTTPS apex URL 的必经步骤。HTTPS www 响应的安全头有细节差异，但不涉及上述已提交 URL 的获取。

两个 index 均为 324 字节；即使请求 gzip 也未压缩。robots 均为 72 字节、未压缩。三个子 sitemap 在请求 gzip 时均实际 gzip 压缩：HTTP/1.1 使用 chunked 传输，HTTP/2 不使用该传输头；解压后的 SHA-256 与各自 identity 版本全部一致，无截断或解压错误。gzip 响应携带 `Vary: Accept-Encoding`，ETag 为对应弱验证标记；两站行为相同。请求总耗时约 0.036–0.057 秒，仅代表本次来源。

仓库内两域名 Nginx 模板都配置 XML gzip 和 1024 字节阈值，与上述结果相符；这里只读取了仓库模板，**没有将其当作当前服务器安装配置的完整证明**。

## XML 与集合核对

| 文件 | 中文未压缩字节 | 英文未压缩字节 | 解析后的内容 |
|---|---:|---:|---|
| `sitemap-index.xml` | 324 | 324 | 各 3 个同域 HTTPS 子 sitemap，无嵌套 index |
| `sitemap-0.xml` | 5,117 | 5,117 | 各 14 个唯一页面 URL |
| `sitemap-images.xml` | 10,179 | 10,179 | 各 10 个来源页、64 个图片条目 |
| `sitemap-videos.xml` | 3,175 | 3,246 | 各 2 个来源页、5 个视频条目 |

- 八个 XML 均可严格 UTF-8 解码并由 XML 解析器解析；以 XML 声明开头，无 BOM/前置空白，根元素及 sitemap/image/video/xhtml 命名空间符合对应用途。
- 每个 index/页面条目恰有一个 `<loc>`；URL 为完整同域 HTTPS 地址，无空白字符、重复页面 URL 或错误 www/层级；引用的三个子文件均在本轮成功取得。最长检查到的资源 URL 为 97 字符，各文件远低于大小/条数上限。
- 两站 index 与图片 sitemap 在替换自身域名后逐字相同；页面 sitemap 在仅统一每条页面 `<loc>` 的域名后结构完全一致，hreflang 链接本来即一致。
- 两站 14 个路径相同。每条均有准确的 `en`、`zh-CN`、`x-default` 三个 alternate，其中 `x-default` 指向英文对应页，没有错语言、错路径或漏回链。
- 图片/视频来源页集合均为 14 个页面候选的子集。日期可解析；每个视频都有缩略图、标题、描述、内容 URL，标题/描述长度及 duration 均在对应限制内。中英文视频文本存在正常语言差异。
- robots 都只含 `User-agent: *`、`Allow: /` 及正确的本域名 sitemap index。没有阻止 sitemap 的规则。

这是实际响应的语法、必要字段和集合校验，不声称已经通过 Google 的完整语义处理或媒体收录验收。本轮没有为排查 index 失败而重新批量抓取全部 HTML/媒体。

## 最小后续步骤与维护清单

1. 优先从 Google 中文 sitemap 详情记录精确提交 URL、Last read、展开后的错误类型/HTTP 状态与时间，和英文/子 sitemap 状态对照；平台状态由同期主任务另记。
2. 如仍失败且提供新抓取时间，下一证据是该时段服务器访问/错误记录与实际安装配置，定位是否真的收到请求以及返回了什么。核验真实 Google 来源需遵循其官方验证办法，不能只看 UA。只汇总相关公开路径、时间、状态，不复制完整访客日志或私人配置。
3. 若平台不提供具体原因，保留明确的未知状态并复查后续报告。当前没有证据支持重写 XML、更名 sitemap、修改 DNS/备案、切换压缩或反复重提；有新失败证据后再针对单一假设验证。

- **已更新：**本独立公网诊断审计；维护总览及搜索指南由主任务汇总本轮平台结果时联动。
- **待处理：**Google 中文 sitemap 平台处理结果及真实失败原因；本检查不验收索引、曝光或 AI 引用。
- **不适用：**没有代码、页面、交互、媒体、账号、DNS、Nginx、服务或 secret 变更，没有部署、提交 sitemap 或创建自动化；百度备案继续按用户要求暂缓。
- **验证与恢复：**核对本文件相对链接、路径、差异与敏感信息；仅新增文档，可通过 Git 历史恢复，不需要服务器回滚。临时公网响应不是运行所需资源。
