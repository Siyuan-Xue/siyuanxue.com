# Google Search Console 接入与索引检查

日期：2026-10-11。操作时间为北京时间；Google 抓取时间按平台原样记录，不推断或换算时区。范围：在用户已登录后继续此前授权的搜索平台核查与所有权验证。保存 DNS TXT 前，用户明确确认授予当前 Google 账号两个域名的 Search Console 所有者权限。账号邮箱与验证值不写入公开文档。

## 平台与 DNS 证据

| 项目 | 实际状态 |
|---|---|
| 原有资源 | Chrome 登录 Google 后，原资源列表只有 X 和 YouTube，没有两个人网站；因此新增两个 Domain 属性 |
| DNS 服务商 | 两域名公开 NS 均为 `lennon.dnspod.net` / `radius.dnspod.net`，确认 DNSPod 解析；用户随后完成腾讯云/DNSPod 登录 |
| 既有解析 | 控制台核对：两个域名原有 `@` / `www` A 均为 `82.156.77.131`，TTL 600；此次保持不变 |
| 新增验证记录 | 19:01 分别保存 `@` Google 验证 TXT，默认线路、TTL 600；公开 DNS 查询确认两值与平台要求完全匹配 |
| 英文所有权 | `sc-domain:siyuanxue.com` 显示 **Ownership verified**，方式为 **Domain name provider** |
| 中文所有权 | `sc-domain:xuesiyuan.com` 显示 **Ownership auto verified**，方式为 **Domain name provider** |
| 英文 sitemap | `https://siyuanxue.com/sitemap-index.xml` 提交成功；列表最初为 Unknown / Couldn't fetch，随后详情为 **Sitemap index processed successfully**。最终列表复查 Type 为 Sitemap index、Status 为 **Success**，Submitted / Last read 均为 Oct 11, 2026，discovered pages / videos 为 0；早期状态不能记为持续故障 |
| 中文 sitemap | `https://xuesiyuan.com/sitemap-index.xml` 提交成功；约 19:11 再次复查仍为 **Couldn't fetch / Sitemap could not be read**。其 XML 实时抓取成功（见下文），sitemap 报告尚未处理成功，需后续复查 |
| sitemap 初始计数 | 两站 Last read 均显示 `10/11/26`，discovered pages / videos 均为 0；初始计数不能代替 URL 索引检查 |
| 总览报告 | 两站均为 processing data，平台提示约一天后查看；只记录提示，没有创建提醒或自动化 |

此前[全站治理审计](2026-10-11-discoverability-header.md)中的平台未登录状态为前一阶段事实。Bing/百度尚未取得登录后的新证据。DNS 服务商不等于注册商，注册商、域名到期日及自动续费仍待核查。

## 同次公网检查

以普通 UA 和 Googlebot UA，分别请求两域名 `/sitemap-index.xml`、`/sitemap-0.xml`、`/sitemap-images.xml`、`/sitemap-videos.xml`、`/robots.txt`，共 20 次请求全部返回 HTTP 200，没有重定向。

- XML 均可解析，`Content-Type: text/xml`，没有 `X-Robots-Tag`；两个 index 均引用本域名的三个正确子 sitemap。
- 每域名页面 sitemap 有 14 个 URL；图片 sitemap 有 10 个来源页，视频 sitemap 有 2 个来源页。来源页数与图片/视频资源数不是同一指标。
- robots 均为 `User-agent: *`、`Allow: /`，并指向正确的本域名 sitemap index。
- Googlebot UA 仅证明当前访问来源使用该标识时没有被区别阻止，不代表真实 Google 抓取来源；公网检查不能代替 GSC 抓取/索引证据。没有重复提交 sitemap，也没有因此修改代码或部署。

## 28 URL 检查清单

候选路径来自当前构建清单，每域名 14 个；本次全部 28 个 URL Inspection 报告已逐项检查。合计 **8 个已索引、19 个 URL is unknown to Google、1 个历史抓取显示 noindex 排除**。Unknown 不等于被 robots/noindex 阻止；索引历史与当前实时页面、请求收录分别记录。

| canonical URL | 索引状态 / 原因 | 检查时间 | 实时测试 / 请求收录 |
|---|---|---|---|
| `https://siyuanxue.com/` | 已索引（URL is on Google） | 2026-10-11 | Indexing requested，已加入优先抓取队列 |
| `https://siyuanxue.com/chat/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/essay/why-this-site/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/b-spline-policy/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/bnds-life/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/family/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/finding-li-bai/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/imathbook/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/leda-agent/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/pixeldone/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/gallery/volleyball/` | 历史抓取：Excluded by noindex（当前 HTML 无 noindex，见下文） | 2026-10-11 | 实时测试通过；Indexing requested，已加入优先抓取队列 |
| `https://siyuanxue.com/gallery/walking-with-light/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/post/congrats-you-hit-the-limit/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |
| `https://siyuanxue.com/post/first-note/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/` | 已索引（URL is on Google） | 2026-10-11 | Indexing requested，已加入优先抓取队列 |
| `https://xuesiyuan.com/chat/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/essay/why-this-site/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/b-spline-policy/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/bnds-life/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/family/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/finding-li-bai/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/imathbook/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/leda-agent/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/pixeldone/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/volleyball/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/gallery/walking-with-light/` | 未索引：URL is unknown to Google | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/post/congrats-you-hit-the-limit/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |
| `https://xuesiyuan.com/post/first-note/` | 已索引（URL is on Google） | 2026-10-11 | 未执行 |

### 抓取记录与英文排球页差异

- 中文首页已索引；Last crawl 为 `Sep 22, 2026, 4:49:10 AM`，Googlebot smartphone，允许抓取/索引均为 Yes，fetch Successful，canonical 为自身。
- 英文首页已索引；Last crawl 为 `Oct 11, 2026, 3:24:24 AM`，Googlebot smartphone，允许抓取/索引均为 Yes，fetch Successful，自报和 Google canonical 均为自身。
- 英文排球页历史报告：Last crawl 为 `Oct 11, 2026, 11:56:13 AM`，Googlebot smartphone，Crawl allowed Yes、fetch Successful，Indexing allowed No（robots meta 检出 noindex）；canonical 为自身，Sitemaps 显示 Temporary processing error。该结果只描述这次历史抓取。
- 同次读取当前英文排球 HTML：HTTP 200、无重定向，没有 `X-Robots-Tag`，也没有 robots/googlebot meta 或 noindex；canonical 为自身。英文 `/__health` 为 `c42d2fdd957c0d39470d2525d40d5c8a45ada785`；当前内容 `draft: false`、`preview: false`，构建清单允许索引。历史 noindex 与此前预览阶段相容，但不能据此认定现在仍被 noindex 阻止。
- 英文排球页 Google TEST LIVE URL 于平台显示的 `Oct 11, 2026, 7:09:45 PM` 成功：URL is available to Google / Page can be indexed。Google Inspection Tool smartphone，Crawl allowed Yes、Page fetch Successful、Indexing allowed Yes，自报 canonical 为自身；Google canonical 为 Only determined after indexing。Google 实际实时抓取已确认当前允许索引，历史排除不因此自动变成已索引。Request indexing 返回 **Indexing requested / URL was added to a priority crawl queue**，已请求重新抓取；尚不能记为已收录。

### 中文 sitemap 报告与实时抓取

约 19:11 复查中文 sitemap 报告仍显示 Couldn't fetch / Sitemap could not be read。按 [Google sitemap 抓取错误说明](https://support.google.com/webmasters/answer/7451001?hl=en#fetch_errors)，对 `https://xuesiyuan.com/sitemap-index.xml` 本身执行 Live test：平台显示 `19:11:49`，Google Inspection Tool smartphone 返回 URL is available to Google、Crawl allowed Yes、Page fetch Successful、Indexing allowed Yes。

此测试仅诊断 XML 当前可抓取，未对 XML 申请索引；实时成功不能替代 sitemap 报告处理成功。中文 Manual actions 报告为 **No issues detected**，未发现人工处置。结合公开 HTTP 检查，目前没有证实持续的网站访问故障，但 sitemap 报告失败的原因尚未确定，不能断言一定是延迟；继续保留报告待复查，没有反复提交或据此修改代码。

## 下一次继续

1. 复查中文 sitemap 详情及两站子 sitemap 的处理情况，按实际结果更新；读取失败原因未定，避免在没有新证据时反复提交。
2. 英文排球页和两站首页均已请求重新抓取并加入优先抓取队列；后续复查实际索引状态。其他未知 URL 依据 sitemap 处理及平台配额复查。请求成功不等于已收录。
3. 平台提示约一天后再查看总览数据；实际取得数据后分别记录查询曝光、点击和索引，AI 引用另按搜索指南抽查。没有创建定时自动化。
4. Bing/百度登录后核对已有站点并复用；注册/续费资料和独立 GitHub 主页项目名称继续保留待办。

## 联动、验证与恢复

- **已更新：**两域名 DNS TXT、Google Domain 属性所有权、sitemap 提交，维护总览、搜索指南及本次审计。文档不含验证值或账号邮箱。
- **待处理：**中文 sitemap 报告复查、英文排球及首页后续索引复查、平台统计及后续曝光/引用；Bing/百度接入、注册/续费资料。
- **不适用：**没有修改网站代码、服务器或部署配置，没有网站发布，也没有创建定时自动化；生产 SHA 继续为 `c42d2fdd957c0d39470d2525d40d5c8a45ada785`，IndexNow 回执保持原记录。
- **验证：**DNSPod 保存状态、公开 DNS 匹配、Google 验证/提交界面、28 项 URL Inspection 报告、英文排球页与中文 sitemap XML 的 Google 实时测试、两首页及英文排球的请求索引回执，以及 20 次 sitemap/robots 公网 HTTP 检查和当前英文排球 HTML / release SHA 核对。文档检查相对链接、路径和差异；前次源码/上线测试不作为本轮新验收。
- **恢复：**文档可按 Git 历史恢复。正常维护须持续保留 Google 验证 TXT；如需撤销当前账号所有权，应先核对属性归属与所有验证方式，只处理本任务实际新增的记录，保留既有 A 及其他解析。删除 TXT 可能使所有权失效，不能作为日常清理。
