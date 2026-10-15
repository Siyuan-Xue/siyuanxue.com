# 维护总览与更新清单

维护负责人：Siyuan Xue / 薛思远。整理日期：2026-09-16。

**2026-10-15 跨域页面状态扩展（本地，未发布，基线 `05976b6`）：**现有 `themeHint.ts` 自包含 factory 扩展为 `theme=light|dark`、`header=open`、`media=shown`；第 3 项确认仅首页 `RomanticPortrait` 单个实例的隐藏图片展开布尔值，不包含灯箱或逐图状态。`theme.js` 在 head 设置首帧布局并在 SSR 节点出现时同步语义，`header-actions.css` / `romantic.css` 与对应控制器无展开动画接管；`themeLink.ts` 订阅主题/操作行/肖像/pageshow，保留聊天 hydration 及 storage 联动。header/media 不持久化，BFCache 保留当前视图，清理 URL 后刷新恢复折叠；只移除有效消费的键，其余编码/锚点原样保留。更新入口、验收、浏览器证据、媒体代理限制与恢复见[跨域状态审计](audits/2026-10-15-state-across-domains.md)。不提交、不推送、不部署；nginx/server/ops、媒体清单及独立服务未改动。

**2026-10-15 跨域主题一致性（本地，未发布）：**语言链接在浏览器中携带明确的 `#theme=light|dark`，系统跟随者不携带提示；接收站在阻塞 head 脚本中优先应用、保存同一 `color-mode`，再清理 URL 并保留其他锚点。唯一规则源为 `src/utils/themeHint.ts`，`BaseHead.astro` 将其编译后的自包含函数与 `src/scripts/theme.js?raw` 一起内联；`themeLink.ts` 经顶栏控制器和聊天 hydration 更新真实 href，保留静态干净链接及既有 SEO。已修复存储只读时缓存返回覆盖内存选择、ProbFun 同源跳转丢失内存选择，并同步同源其他标签页的存储变更；更新、验证、恢复、两 origin 首帧证据与未验证项见[本次审计](audits/2026-10-15-theme-across-domains.md)。不提交、不推送、不部署；nginx/server/ops 及独立服务未改动。

**2026-10-15 顶栏折叠与语言切换（本地，未发布）：**静态页与聊天页默认只显示姓名和左箭头；展开为目录（有时）、首页（非首页）、聊天（非聊天页）、主题、语言、右箭头，聊天页为新对话、首页、主题、语言、右箭头。语言作为用户明确例外固定靠右，静态 `LanguageSwitch.astro` 与 React `chat/ChatApp.tsx` 均使用 Lucide `Languages` 无框图标（20px、1.8 描边），复用相邻按钮的 hover/focus-visible 样式；无可见文字，SVG `aria-hidden`，英文页 `aria-label`/`title` 为 `Switch to 中文`，中文页为 `切换到 English`，真实链接及目标 `lang`/`hreflang` 保留；≤767px 操作行在姓名下方占据布局空间，44px 点击区，无 JS 直接显示导航链接。展开/焦点/手机目录锁定顶栏显示，既有滚动显隐、聊天输入与 Safari 主题同步保留。入口为 `HeaderActions.astro` / `chat/ChatHeaderActions.tsx`、`headerActions.ts`、`header-actions.css`；语言链接由 `langSwitchContent.ts` 读取双语构建清单、`langSwitch.ts` 解析，始终使用 `locale.ts` 的 HTTPS apex（本地/preview 也指向正式另一站）。仅双方已发布同路径互链，缺译/草稿/404/未知页回退另一首页；初版不传 query/hash/主题/聊天状态；同日跨域主题后续仅允许运行时携带明确主题 hash，构建 href 仍干净，不传聊天状态，不做自动语言跳转或展开记忆。原 ProbFun 跳转改为共享布局页面，保留跳转目标、canonical/noindex/sitemap 行为。更新、验证、恢复与可选项见[本次审计](audits/2026-10-15-header-collapse-language-switch.md)；不提交、不推送、不部署，实体 Safari/iOS 与生产跨域点击仍待验收。

**2026-10-15 文章排版对齐 Dario（本地，未发布）：**`Prose.astro` 的 essay/post 使用独立 `prose-page` 样式，正文列宽 580px、标题桌面 62px/手机 48px，英文副标题斜体、日期仅显示年月、目录透明度 .5/1；`article-fonts.css` 使用现有 OFL Newsreader 的双轴文件并固定 `opsz=24`，中文保留 Noto Serif SC 正体。`EssayContent.astro` 的响应式 `sizes` 与图注跟随新列宽，正文/媒体不变。首页、图集、聊天及 Safari 主题脚本/顶栏兼容措施保持原规则。更新与恢复入口为上述模板及 `src/styles/article*.css`；本次指定五项检查通过，Chrome 双语桌面/手机明暗计算值、许可、保留差异和恢复见[本次审计](audits/2026-10-15-dario-essay-style.md)。不提交、不推送、不发布；实体 Safari 验收仍待处理。

**2026-10-15 Safari 主题色同步（本地，未发布）：**`src/components/BaseHead.astro` / `src/scripts/theme.js` 保留单个无 media 的 theme-color、切换时替换节点，并补系统偏好监听及存储异常时的手动优先级；`src/styles/base.css` 的不透明顶栏使用零半径 backdrop-filter 规避 Safari 26 固定边缘单色采样，原配色、滚动显隐和控件顺序保留。依据已读取的 [Safari 15 官方说明](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)、[Safari 26 固定边缘说明](https://bugs.webkit.org/show_bug.cgi?id=301756#c2)、Apple release notes/深色模式/meta 文档及 WebKit 源码；完整 URL、测试、联动清单与恢复见[本次审计](audits/2026-10-15-safari-theme-color.md)。本机没有实体 Safari，原生工具栏即时更新和手机/桌面各版本仍待验收；没有提交、推送或部署。

**2026-10-14 具身智能体文章草稿：**新增 `src/content/essays/embodied-agent/{en,zh}.md`，新增时两语言均为 `draft: true`。文章可用 frontmatter `figures`（`id`、媒体 `src`、双语 `alt`/`caption`）和正文独立行 `<!-- figure:id -->` 插入图片；`content.config.ts` 校验媒体 ID，`EssayContent.astro` 复用 `MediaPicture`，`essayFigures.ts` 检查标记。四张架构图已用默认 `photos` profile 本机准备，清单在 `src/data/media.json`，原图与派生文件在忽略目录 `media-local/`；本机媒体摘要核验通过。本次收尾在实际仓库的 `blog/embodied-agent` 分支使用 Node v22.23.3、Bun 1.4.2 重新完成验证：`bun install` 成功，`bun run check` 0 errors/0 warnings，`bun run test` 176 pass/0 fail，`bun run build` 成功，`bun run test:output` 34 pass，`bun run test:gallery` 1 pass。本次仅在该分支提交，不推送；提交排除 `media-local/` 和图片文件，依赖及锁文件未变更。当时服务器媒体上传、PR 和发布待处理。**2026-10-15 后续：**用户已批准公开，两语言改为 `draft: false`；上述四个媒体 ID 的 40 个文件已上传并安装，恢复快照为 `/var/backups/siyuanxue-media/618b9fa2241d68a71b1f68dd380868b8abeba7ac76662ee3839c06856442fe1e/`。部署验收仍待完成，见 [PR #4](https://github.com/Siyuan-Xue/siyuanxue.com/pull/4)。位置、验证边界、交接与恢复见[本次审计](audits/2026-10-14-embodied-agent-essay.md)。

**2026-10-12《与光同行》链接追加：**用户提供的微信文章此前未列入条目，已追加到 `src/content/galleries/walking-with-light/{zh,en}.json` 的 `links`，使用「微信公众号文章 / WeChat article」中性入口，完整保留地址参数。外部正文因访问限制未核验，不新增其标题或内容事实。[Actions 38188122799](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38188122799) 已成功发布 `b5df50113d5812d6ab4b20e984c9bcfe047a1190`，验证、部署及通知均成功；两域名完整目标 SHA、五条来源入口和新增 URL 仅出现一次已核对。后续 `[skip ci]` 文档提交不改变该静态 release。联动、实际验收、发布状态与移除/回退方式见[链接审计](audits/2026-10-12-walking-with-light-wechat-link.md)。

**2026-10-11 首页格言后续修正：**用户要求查证出处并整理引述标点。已核对 1974 年《Whole Earth Epilog》封底扫描和斯坦福 2005 年 6 月 12 日 Jobs 演讲官方文字稿，使用 `Stay hungry. Stay foolish.`；引导语与带双引号的引文合段，中文补冒号，英文按表语引述不加冒号。已确认的简介首段、分享摘要及身份事实不变，不误署为 Jobs 原创。更新位置仍为 `src/data/site.ts`，[Actions 38151893543](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38151893543) 已成功发布 `3c159d95c8a54d65fac0492d8daaee0561bd1e51`，验证、部署及通知均成功；两站完整目标 SHA、正文标点、元信息、桌面及窄屏排版已核对。后续 `[skip ci]` 文档提交不改变该静态 release。来源、联动、不适用项、实际验收和恢复入口见[格言审计](audits/2026-10-11-homepage-quote.md)；下段保留此前发布时的事实。

**2026-10-11 首页简介更新：**用户确认第三人称中文定稿并明确授权中英文上线。双语文字和分享摘要在 `src/data/site.ts`，沿用 `Bio.astro` 的段落渲染，首页人物结构化数据自动引用同一简介；以专业身份、探索未知、追求极致与完美、产品技术热情和生活态度介绍本人，末段保留 `Stay hungry, stay foolish.`。联动核对了网站 README、公开 GitHub 账号、独立主页 README 与两仓库 About，学校/专业、姓名别名、域名一致，无需因首页措辞更新而改动其他平台资料或独立服务。[Actions 38150083083](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38150083083) 已成功发布 `b1a0a3919cc323f391afce6a6b873b6a9315bdd9`，共享验证、部署、通知成功；两域名完整目标 SHA、定稿正文、元信息、固定语言/跳转/旧照片拒绝，以及生产两语言桌面与390px窄屏显示均核对通过。后续 `[skip ci]` 文档提交不改变该静态 release。更新与恢复通过该数据文件及原 Actions 双语发布；本次验证、发布状态与回滚入口见[简介审计](audits/2026-10-11-homepage-bio.md)。

**2026-10-11 全站可发现性治理：**用户长期意图已落入根目录 [AGENTS.md](../AGENTS.md)。治理覆盖所有现有及未来公开内容、查询方式和 AI 检索方式；稳定路由不因 SEO 更名，可见正文保持不变。此次明确授权顶栏改为纯色和滚动自动显隐，聊天页保持可见，替代旧的始终可见/70% 模糊背景约定；历史段落保留当时事实。已由 [Actions 38132649214](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38132649214) 发布 `c42d2fdd957c0d39470d2525d40d5c8a45ada785`，两域名 38 页验收通过，IndexNow 每域名 14 URL 返回 202（待平台验证，不等于收录）。实现、核验、搜索平台待办与恢复见[本次审计](audits/2026-10-11-discoverability-header.md)。

**同日后续搜索平台接入：**用户确认后，已在 DNSPod 为两域名添加 Google 验证 TXT，公开 DNS 匹配且 Search Console 两个 Domain 属性均验证成功；原有网站 A 记录保持不变。两站 sitemap 已提交，英文 index 最终复查 Success；中文报告复查仍显示读取失败，但 Google 对 XML 的实时抓取成功、Manual actions 无问题，失败原因尚未确定，后续仍待复查。两站总览均在处理数据，平台提示约一天后查看；28 URL 已逐项检查：8 已索引、19 为 Google 未知、1 为英文排球页历史 noindex（当前 HTML 无 noindex，Google 实时测试已确认允许索引，已请求重新抓取）；曝光数据仍待处理，没有创建自动化。证据及 28 URL 检查清单见[接入审计](audits/2026-10-11-search-console-onboarding.md)；此前“未登录”保留为此前阶段事实。

**同日用户明确平台优先级：**中文站 `xuesiyuan.com` 重点在百度，下一阶段优先核查百度站点归属、提交能力、抓取、收录及中文查询曝光。Google、Bing 与 AI 跨平台发现继续维护，已完成的 Google 验证和稳定路由保留；英文站继续安排 Google/Bing 维护，该安排不是用户另行指定的英文平台排序。Google 的 28 URL 检查结果和 IndexNow 202 回执均不能用作百度状态。具体步骤与平台证据见[百度优先级审计](audits/2026-10-11-baidu-priority.md)。

**同日约 21:31 起后续核查：**独立 GitHub 主页已将项目展示名统一为 `Pixel Done`，仅改一行链接文字，实际项目 URL 不变；远端 `main` 与提交差异复核通过。Google 中文 index 再次 Live test 成功，但 sitemap 报告仍读取失败；额外提交页面子 sitemap 取得提交成功回执，随后两条报告仍为 `Couldn't fetch`，原因未知。同期 40 次公网协议检查通过，不能替代 Google 的 sitemap 处理结果。该阶段 Bing 已完成基本登录，GSC 只读授权与两站导入尚未完成；百度备案继续暂缓。证据、状态边界与恢复见[后续审计](audits/2026-10-11-search-followup.md)。

**同日约 21:47 起 Bing 接入：**用户随后明确确认 GSC 只读授权，并限定仅导入两域名。导入后站点选择器只显示两站、无验证待办；各提交原 sitemap index，约 21:53–21:54 均已处理成功。中文三个子 sitemap 均 Success、来源 URL 计数 26；英文 index 显示来源 URL 3、子 sitemap 0，明细尚未出现，分开保留平台状态。全部 28 个候选 URL 通知有记录，两首页分别实时抓取 HTTP 200、允许索引；提交、实时可读与已索引分别记录。详细权限范围、平台状态和后续验收见[Bing 接入审计](audits/2026-10-11-bing-onboarding.md)。

这是网站及关联资源的维护入口。[本轮工作总结](WORK-SUMMARY-2026-09-16.md) 解释已做的工作；本文记录资源在哪里、怎样更新、怎样验收与恢复。以仓库和既有部署记录为依据，不包含密码、令牌、微信身份 ID、日记正文或恢复密钥。

## 1. 如何判断信息是否仍然有效

| 标记 | 含义 |
|---|---|
| 本次核对 | 2026-09-16 整理文档时重新检查了本地文件或 GitHub API |
| 部署记录 | 之前有部署/验收证据，本次没有重新登录服务器全面审计 |
| 待确认 | 没有足够证据；不能当作已完成 |

本次核对的代码基线为 `93680bdca879bbbc1a024a3e770565f99e7ae999`。对应 [Actions 发布](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/35073209596) 已成功。这是时间点记录，后续当前版本应查 Actions 和两个域名的 `/__health`，不能永远使用此 SHA。

当前行为看代码，实际安装状态看服务器，历史审计看其日期。设计稿和计划不代表已经上线。若三者冲突，先记录差异、核对实际配置，再修改；不能直接把旧模板整份覆盖上去。

**已知文档差异：**早期 Hermes 说明是「8 个公共只读工具、普通 GLM API 端点、原生文件记忆」基线。9 月 15 日后续部署记录增加长期记忆的 4 个只读工具，公共 profile 共 12 个，并统一到 GLM Coding Plan。`ops/README.md`、`services/hermes-chat` 下的旧 overlay/验证器尚未完整表达这一后续状态。恢复或升级前必须核对第 4 节，不能按旧的“必须恰好 8 个工具”撤掉长期记忆，也不能未经检查修改测试来掩盖差异。

## 2. GitHub、域名、服务器与搜索资源

| 资源 | 作用与权威位置 | 更新方式 / 当前状态 |
|---|---|---|
| 网站代码仓库 | [Siyuan-Xue/siyuanxue.com](https://github.com/Siyuan-Xue/siyuanxue.com)，默认 `main`；源码、构建、测试、运维脚本 | Git 提交并推送；Actions 发布静态网站。本次核对 |
| GitHub 个人主页仓库 | [Siyuan-Xue/Siyuan-Xue](https://github.com/Siyuan-Xue/Siyuan-Xue) 的 `README.md` | **独立仓库**，网站提交不会更新它。2026-10-11 经授权通过带原 blob SHA 的 Contents API 将旧标签改为 `Pixel Done`，[提交 7edf6cf](https://github.com/Siyuan-Xue/Siyuan-Xue/commit/7edf6cfb902f98a77dfa1129bfabf81037d500cc)；重新读取远端 `main` 确认仅一行变化、全部 URL 不变。恢复入口见[后续审计](audits/2026-10-11-search-followup.md) |
| GitHub 账号资料 | [公开主页](https://github.com/Siyuan-Xue) / [Profile 设置](https://github.com/settings/profile) 的姓名、Bio、Website | 与主页 README 是两种资源；本次通过 API 核对已有更新。账号编辑 CLI 权限见第 7 节 |
| 两仓库的 About | 仓库 description、homepage；网站仓库另有 topics | `gh repo edit` / 仓库设置；与两个 README 不自动同步。本次核对 |
| 本机 GitHub CLI 登录 | `/opt/homebrew/bin/gh`；本轮使用 macOS Keychain 中的既有凭据 | `gh auth status` 检查账号/权限；不打印或复制 token。重新登录不会自动改变 README 或账号资料，权限缺口见第 7 节 |
| 中文域名 | `xuesiyuan.com`；`www.xuesiyuan.com` 跳到其 apex | DNS、TLS、Nginx、站点元数据一起维护。固定中文，不按浏览器语言判断 |
| 英文域名 | `siyuanxue.com`；`www.siyuanxue.com` 跳到其 apex | 固定英文；语言按钮指向对应译文。上述域名路由有部署记录 |
| 旧域名 | `xuesiyuan.com.cn` 及 www 已退出本站配置 | 不作为当前入口；退役不等于注销域名或关闭续费 |
| 域名注册与 DNS | 注册商控制台管理注册/续费；[DNSPod 控制台](https://console.dnspod.cn/)管理当前解析 | 2026-10-11 NS 查询确认两域名均为 `lennon.dnspod.net` / `radius.dnspod.net`。19:01 经用户确认分别新增 `@` Google 验证 TXT，默认线路、TTL 600；公开 DNS 与所需值匹配。原有 `@` / `www` A 均为 `82.156.77.131`、TTL 600，保持不变；Google 持续验证需要保留 TXT。注册商、到期日、自动续费及完整解析导出仍待补 |
| 腾讯云 Lighthouse | Ubuntu 24.04 / Nginx；IP `82.156.77.131`；实例 `lhins-aftjtoo4`，北京七区 / `ap-beijing` | 管理员 `ubuntu`，CI `deploy`，SSH 22；腾讯云控制台 OrcaTerm 为备用。2026-10-10 控制台核对：锐驰型 2 核 / 8GB / 80GB、无限流量 / 200Mbps 峰值带宽，到期 2027-08-23 07:46:25；自动续费与快照策略待核对。套餐峰值不代表实际跨境吞吐量 |
| TLS 证书 | 两 apex 分别管理含自身 www 的证书；`/etc/letsencrypt/` | Certbot 自动续期及 Nginx reload hook；见 [HTTPS 运维](../ops/HTTPS.md)。当前有效期和最近续期结果需定期查证 |
| Google Search Console | [控制台](https://search.google.com/search-console)；属性 `sc-domain:xuesiyuan.com` / `sc-domain:siyuanxue.com` | 2026-10-11 两属性通过 Domain name provider 验证，用户已确认当前账号所有者权限。两站 index 已提交，英文此前复查 Success；中文 index 约 21:31 再次实时抓取成功，约 21:34 额外提交 `/sitemap-0.xml` 取得成功回执后，index 与子文件报告均为 Unknown / Couldn't fetch，原因未知，见[后续审计](audits/2026-10-11-search-followup.md)。此前两站总览 processing data；28 URL 为 8 已索引、19 未知、1 历史 noindex，英文排球页实时测试已允许索引并请求重新抓取，见[接入审计](audits/2026-10-11-search-console-onboarding.md)。本轮未重新验收这些 URL 的索引或曝光；账号邮箱与 TXT 值不入文档 |
| 百度搜索资源平台 | [链接提交](https://ziyuan.baidu.com/linksubmit/index)；中文站优先搜索平台 | 2026-10-11 约 21:00 apex 已验证。约 21:10–21:15 复核：上一轮手动提交显示验证码错误；重填 14 URL 并由用户完成第二次验证码后，平台返回“您今日的链接提交量已达上限，请改天提交”，仍无成功回执，当前不再等待手动提交验证码。sitemap 当日上限/余额均 0，存量上限/余额均 1，入口禁用、文件列表暂无数据；不能提交索引型 sitemap，候选为 `/sitemap-0.xml`。Robots 平台检测已生效、无错误；索引量数据计算中。API token 未抄录使用，未配置自动推送；完整报告与限制见[本次审计](audits/2026-10-11-baidu-priority.md) |
| 百度 HTML 验证配置 | GitHub Actions repository variable `BAIDU_SITE_VERIFICATION_ZH` → CI 环境 → 中文首页 `<head>` 的 `baidu-site-verification` | apex 新值已保存；[Actions 38141044881](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38141044881) 于约 21:01:40 确认整体成功，verify、deploy、IndexNow 通知三个 job 均成功，rollback skipped。约 20:58 独立检查 38 路由通过，两站 SHA 为 `57a0c8a9d744e9ed511594452737c75e09db65dc`，中文首页直接 200、不跟随跳转，唯一标签与新变量匹配。约 21:00 百度验证通过；保留标签，变量修改/移除须新 commit SHA，不能只重跑同 SHA。停用前核对所有权影响，不改 Google TXT 或现有 DNS |
| Bing Webmaster Tools | [控制台](https://www.bing.com/webmasters/)；通过 GSC 导入 `xuesiyuan.com`、`siyuanxue.com` | 2026-10-11 用户确认 GSC 只读授权，实际仅导入两域名。两站 index 均 Success；中文三个子文件均 Success、来源 URL 26 为 14+10+2、有重叠；英文来源 URL 3、子文件计数 0且明细未出现，待后续报告。均不能当作独立页面/媒体收录数。28 候选有提交通知，两首页 Live URL 均 HTTP 200、允许索引；英文历史已索引、中文历史未抓取，其他 26 页未逐页验收。Bing 持续向 GSC 复核所有权，撤销连接需重连或替代验证；保留 Google TXT。[Google 连接管理](https://myaccount.google.com/connections)、AI 报告范围及恢复见[Bing 接入审计](audits/2026-10-11-bing-onboarding.md)。IndexNow 仍是独立通知渠道 |
| IndexNow | `ops/indexnow.mjs`、CI/Deploy 工作流；GitHub 仓库 secrets `INDEXNOW_KEY_EN` / `INDEXNOW_KEY_ZH` | 2026-10-11 已配置两域名验证键；CI 从环境生成公开验证文件，源码和文档不存值。正常发布成功后独立通知；具体上线结果见当次审计 |
| SEO 公共入口 | 每个域名的 `/robots.txt`、`/sitemap-index.xml`、`/sitemap-0.xml`、`/sitemap-images.xml`、`/sitemap-videos.xml`、`/rss.xml`、`/indexnow-manifest.json`；HTML canonical / hreflang / JSON-LD | 统一清单由 `src/utils/discoveryContent.ts` / `discovery.ts` 生成，构建集成逐页校验；详细清单与缺项报告只留 `.build/discovery/`。可被发现不等于已收录或有固定排名，维护规则见[搜索指南](SEARCH.md) |
| AI 检索与引用验收 | [2026-10-11 AI 检索审计](audits/2026-10-11-ai-retrieval-validation.md)的全部候选、原样查询与直接读取矩阵 | 78 查询样本中自然文本仅返回两个不同本站页面；28 次 AI web 读取为 24 不可访问、1 Cache miss、3 旧快照，无当前正文读取确认。普通 HTTPS 28/28、媒体 HEAD 276/276 正常；3 个提供实时正文的受控综合不等于自然发现成功。另做 Gemini Auto 两次临时聊天，找到两域名与英文排球详情，但六个指定中文详情未获对应正文读取证据，出现角色错字、占位研究扩写和贡献遗漏。按产品/入口分别复跑、检查实际来源，不凭工具失败改页面或爬虫策略；只新增审计，无需服务恢复 |

注册商、实例和搜索平台的缺项只需补非敏感信息；账号密码、证件、付款信息不要写入公开仓库。

**IndexNow 更新、验证与恢复：**仓库 secrets 通过可复用 CI 的可选输入提供给构建；修改后走正常双语发布，检查两域名验证文件及通知 job summary。发布前清单 `indexnow-before-<run_id>`、通知状态 `indexnow-state-<run_id>-<attempt>` 在 GitHub Actions artifacts 保存 90 天，记录未确认地址与上次清单，失败后重跑工作流或在下次成功发布补交。通知 job 独立于已完成的静态发布，失败不触发网站回滚；超过保留期后没有历史状态则全量提交当前 URL，历史删除地址需要从此前清单补回。现有 rollback 不主动发送通知，后续正常发布会重新比较；必要时按历史 URL 清单人工复核删除状态。HTTP 200/202 仅证明收到/待验证，不代表收录。恢复代码用 Git/Actions，停用通知可移除对应 secret，地址队列仍保留；无需服务器安装额外服务。

**百度构建变量生效与恢复：**`ops/release.sh` 按 `releases/<SHA>` 复用已存在产物，当前 SHA 已激活时直接返回。因此首次验证标签发布前须先配置变量；此后修改或移除 `BAIDU_SITE_VERIFICATION_ZH` 必须使用新 commit SHA 走正常 Actions。同 SHA 的重跑或 `workflow_dispatch` 即使成功，也不能证明新变量已反映到线上 HTML。每次以实际页面标签、两域名 SHA 和百度平台结果验收；停用标签前核对所有权影响。

## 3. 网站发布链路及维护边界

2026-10-10 本轮图集发布复用完整双语产物，两域名必须在同一 release 上一起验收。此前 runner→服务器 SCP 上传持续缓慢；本轮在现有 Actions 内改用 `ops/upload-release.py`，由服务器通过短时 HTTPS 地址下载当前工作流的已验证产物，校验 ZIP 摘要、成员及归档 SHA-256 后交给原 helper 激活。单连接 HTTPS 也超时；OrcaTerm 只读诊断确认服务器资源充足、国内下载正常，GitHub 四路小额下载比单连接提高约三倍。因此大产物改用最多 16 路严格校验范围的下载；首次已收到约 99.4%，仅最后慢分段触及十分钟上限，随后根据实际进度调整为 900 秒下载、960 秒 SSH 和 17 分钟 step 上限，部署 job 仍为 20 分钟。部署 job 仅增加 `actions: read`，GitHub token 留在 runner，签名地址遮罩且仅经 SSH stdin 传递；没有新增 secret 或安装服务器组件。更新入口为工作流、传输脚本和共享验证；恢复可按 Git 历史还原 SCP 上传步骤，或用原 Actions rollback 恢复已保留的成功版本。实际传输及两站上线结果见 [图集发布审计](audits/2026-10-10-gallery-release.md)，未通过公网目标 SHA 检查前不能标记上线。

**本轮最终发布状态（2026-10-11，北京时间）：**[Actions 38065498153](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38065498153) 成功发布 `a1edc9fcaa03e900fddd7b67e282feb91c4229e4`。两域名目标 SHA、固定语言、HTTP/www 跳转、旧照片 410、两项目的正文/五图/资料链接/索引元信息及 40 个原图与缩略图资源验收通过；PixelDone 线上两语言均为三列、180 × 404px，并完成灯箱键盘切换、关闭和焦点返回检查。此前 BNDS.life、PixelDone 和产品布局段落的「未上线」保留为对应阶段的历史事实；此次一起发布后已解除发布阻塞。发布始终由 GitHub Actions 完成，本机 OrcaTerm 仅只读诊断，没有本地 SSH 上传或切换；完整结果及边界见 [图集发布审计](audits/2026-10-10-gallery-release.md)。

源码入口：[站点资料](../src/data/site.ts)、[页面元信息](../src/components/BaseHead.astro)、[构建脚本](../scripts/build.mjs)、[依赖和命令](../package.json)。文章按 `src/content/essays/<slug>/{en,zh}.md` 或 `src/content/posts/<slug>/{en,zh}.md` 配对。两语言必须一起发布。

运行要求以 `package.json`、`bun.lock` 和工作流为准；本次基线为 Bun 1.3.14、Node ≥22.12。Astro 静态生成页面，聊天单独使用 React/AI SDK；PhotoSwipe/GSAP 按需加载，字体本地托管。无需为了维护另外引入 CMS。

**2026-10-11 用户更新媒体维护约定：**图片、视频和派生缩略图通过原生 SSH/rsync 直传服务器，不再进入当前 Git 源码或 CI 静态包；Git 仅保存 `src/data/media.json` 的资源 ID、哈希地址、尺寸、格式、大小与摘要。所有现有栅格图已迁移，正文和代码继续使用原 Actions 双语发布。提示词与生成依据仍放在对应审计记录；本机忽略目录 `media-local/` 保存素材和派生文件，临时预览图、浏览器缓存和工具会话不是备份。升级 PhotoSwipe、GSAP、Lucide、Fontsource 或适配的 AI Elements 代码时，一并检查版本、许可证和归属说明。

2026-10-08 悬停反馈调整：共享 `src/styles/tokens.css` 中的 Claude 粘土色系；悬停统一使用 `transition: none` 即时响应（已按后续要求取消80ms），覆盖首页、文章目录/正文与聊天控件；明暗模式分别使用可读的交互色，键盘焦点同步反馈。已通过[生产Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37717307878)发布 `8d902f66a258e551fe414361160241bafc0af504`，两域名目标SHA、固定语言、HTTP/www跳转与旧照片410检查通过；更新、验收边界与恢复见[悬停反馈审计](audits/2026-10-08-hover-feedback.md)。

同日聊天布局调整已随上述版本发布：消息区和输入区共用主页的 `--narrow` / `--page-pad-x`，欢迎与对话状态宽度一致；中文问候与用户确认的英文问候更新，线上两站顶栏顺序核对为「首页、新对话、主题」。中文站完成一次真实回复，英文站完成只读UI检查；不将其当作模型和记忆服务的全面验收。验证及边界见[聊天宽度与问候审计](audits/2026-10-08-chat-width-greeting.md)。后续补审计的 `[skip ci]` 文档提交不改变该静态release SHA。

同日后续用户明确最终顶栏顺序为「新对话、首页、主题」。已交换前两个按钮并通过[Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37718314174)发布 `5aa16cffdd6eaa9b50264ba8701cdee679f669e5`，两域名SHA、语言、跳转、旧照片410及生产浏览器图标顺序均核对通过。验证与恢复见[按钮顺序修正审计](audits/2026-10-08-chat-header-order.md)；上段保留此前版本的验收事实，不代表最终顺序。

**2026-10-11 聊天欢迎句单行调整：**英文欢迎句保留原有措辞，将重复 o 减为三个：`Missed you sooo much, babe!`；仅英文窄屏欢迎标题的字号随宽度适配，字体家族、颜色、背景和 Baby 图标沿用当前主页样式。独立工作区已完成 320px 至桌面及矮屏单行检查、双语构建；与图集任务协调后接入其最终文档提交 `5354a89`，由 [Actions 38110862821](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38110862821) 成功发布 `0203f76e1db9e7e69ef1f863a2b7fd6bb2b515ad`。两域名目标 SHA、固定语言、跳转与旧照片拒绝，以及英文线上 320px / 390px / 桌面和矮屏单行检查均通过；中文 320px 仍为原句与 28px。后续 `[skip ci]` 文档提交不改变该静态 release。修改位置、验证范围与恢复见[单行欢迎句审计](audits/2026-10-11-chat-greeting-single-line.md)。

同日图集与博客调整已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37725358463)发布 `24b3a57c1e666d7a1b8f824cb5937deb0b51f3af`，两域名目标 SHA、首页顺序、旧文章链接和草稿隔离均核对通过：首页顺序为简介、项目、研究、兴趣爱好、博客；博客合并长短文，保留 `/essay/`、`/post/` 及 RSS 身份。项目和活动素材未齐时显示「整理中」，原外链保留在 `src/data/site.ts`，首页不外跳。图集源文件为 `src/content/galleries/<slug>/{en,zh}.json`，图片由 Astro 本地资源处理；完整公开对生成 `/gallery/<slug>/`、独立封面及 `ImageGallery` 元信息，任一语言草稿均不公开。更新步骤、验证与草稿恢复见[图集作者指南](GALLERIES.md)，本次边界与验收见[图集与博客审计](audits/2026-10-08-gallery-blog.md)。`layout-preview` 在该次发布中仍仅开发环境可见，不是真实成果；待补真实图片与参与事实后再制作正式图集。

2026-10-10 用户明确要求占位预览也上线以查看效果。本次将 `/gallery/layout-preview/` 设为固定公开预览：保留双语示意说明、`draft: true` 与 `noindex`，不进入首页项目列表或 sitemap；其他普通草稿仍不生成生产页面。已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38013892959)发布 `5040c31a6a66f1e5d03e3507380d7f065eb6abeb`，两域名目标 SHA、预览 200、四张图片与图注、noindex、canonical/hreflang、资源与跳转均核对通过，中文线上灯箱可打开、切图和关闭。位置与更新步骤见[图集作者指南](GALLERIES.md)，本次验收、发布与恢复记录见[公开图集预览审计](audits/2026-10-10-gallery-preview.md)。

同日后续要求将七个现有条目全部接入各自图集。该轮在 `codex/all-gallery-previews`（源码基线 `3fdf802`）完成实现：`src/content/galleries/<slug>/{en,zh}.json` 使用 `draft: false`、`preview: true`，复用四张明确标注的抽象占位图，沿用真实标题、已知年份与既有资料链接，不补造角色或贡献。首页指向各自稳定地址，条目预览公开但 `noindex`，sitemap 依据内容 JSON 的草稿及预览状态排除，无需维护七个 slug 的硬编码名单。`layout-preview` 继续是草稿公开的固定例外，仍不进首页或 sitemap；普通草稿仍不生成。以后补齐真实素材与参与事实，将双语 `preview` 改为 `false` 并保持 `draft: false`，即可在原址转为正式图集并进入 sitemap。本轮类型检查、测试、双语构建及本机首页到灯箱流程已通过；已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38015691697)发布 `afa2b2142ec96ceb4ce9ade59636fc87814f8fb5`。两域名目标 SHA、每站七个入口及七个图集页、语言、图片/脚本/样式资源、元信息和跳转均核对通过，中文生产浏览器完成首页至活动图集再返回。更新、验证和撤下步骤见[图集作者指南](GALLERIES.md)，新验收证据见[全部条目预览审计](audits/2026-10-10-all-gallery-previews.md)。

2026-10-10 后续新增 BNDS.life 正式项目图集，来源为用户确认的 2026 年 9 月一周开发经历及五张真实网站截图。内容位置为 `src/content/galleries/bnds-life/{en,zh}.json` 与同目录 `images/`，首页关联在 `src/data/site.ts`；项目资料链接为 [BNDS.life](https://bnds.life) 和 [公开源码](https://github.com/Siyuan-Xue/bnds.life)。双语页面使用 `draft: false`、`preview: false`，构建产物进入 sitemap；更新与恢复沿用[图集作者指南](GALLERIES.md)。内容及完整 CI 验证通过，但本轮上传受低吞吐量阻塞，最后诊断约 12 分钟仅写入约 8 MB / 92 MB，未激活新版。两域名仍为 `afa2b2142ec96ceb4ce9ade59636fc87814f8fb5`，新页尚未上线；记录及 Actions 证据见 [BNDS.life 图集审计](audits/2026-10-10-bnds-life-gallery.md)。临时 CI 连接、协议及进度诊断已还原，原发布流程及严格主机校验保持不变；需要可用服务器管理入口排查传输和资源状态、核对未完成的 incoming 归档，再通过 Actions 发布和验收。该项目的域名和服务仅作为资料链接，此次没有修改其配置。

2026-10-10 同日补充 PixelDone 真实图集：`src/content/galleries/pixeldone/{en,zh}.json` 与同目录 `images/` 保存用户确认的期末考试周开发经历和五张原始 App 截图。沿用现有 `src/data/site.ts` 的关联、首页位置、双语标题和 `/gallery/pixeldone/` 地址，双语 `preview` 改为 `false`；页末保留 [PixelDone 公开源码](https://github.com/Siyuan-Xue/PixelDone)。更新、验证和恢复沿用[图集作者指南](GALLERIES.md)，本轮验收见 [PixelDone 图集审计](audits/2026-10-10-pixeldone-gallery.md)。本轮先完成内容与本机预览，上一轮已确认的服务器上传阻塞尚未解决，不重复触发生产上传或声称新图集已经上线。没有修改该 App、云同步服务、仓库设置或网站独立服务。

2026-10-10 后续按用户反馈缩小 PixelDone 竖屏产品截图。图集新增可选 `layout: product`，位置为 `src/utils/gallery.ts`、`src/components/GalleryContent.astro` 与 `src/styles/gallery.css`，在 PixelDone 两份 JSON 中同时启用：桌面三列、600px 及以下两列，图片宽度上限 180px，首图采用相同尺寸。随后按要求将 PixelDone 和 BNDS.life 中文资料链接改名为「GitHub 仓库」。更新规则见[图集作者指南](GALLERIES.md)，本轮验证、待办及恢复见[产品图集尺寸审计](audits/2026-10-10-product-gallery-layout.md)。仍保留原图和灯箱；本轮为分支修改及本机预览，生产发布继续等待既有服务器上传阻塞解决。


**2026-10-11 媒体直传与名称更新：**现有 18 张栅格图及缩略图/封面共 140 个文件（17,247,338 字节）已通过本机 SSH/rsync 直传，服务器逐文件 SHA-256/大小验证，公网两域名 280 次 GET 的摘要/长度/类型/缓存核验通过。实际启用的两个 Nginx 配置仅插入媒体读取路由，已备份、`nginx -t` 并 reload；与静态 CI 安装边界分开记录。源码取消跟踪上述二进制文件，`.gitignore` 防止重新提交；保留历史 Git 对象、旧 release 与 `shared/_astro`。准备/上传/公网验证命令见 [ops/README.md](../ops/README.md#direct-media-uploads)，恢复入口为上表本机素材及媒体快照。Pixel Done 两语言统一名称，地址和实际仓库 URL 保持不变。[Actions 38070306413](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38070306413) 已成功发布 `59ce068ca675c54e383eb29e628dc7d35b6a03ab`；两站目标 SHA、固定语言、跳转、旧照片拒绝、图集元信息、五图与灯箱均通过验收。发布后全量媒体 GET 再次通过；本机静态包由 96.27MB 减至 13.34MB。默认直传连接的 macOS socket 长路径问题也已修复并补测试。完整证据、维护边界和恢复见 [本轮审计](audits/2026-10-11-direct-media.md)，后续 `[skip ci]` 文档提交不改变此静态版本。

**2026-10-11 B-Spline Policy 图集：**双语正文位于 `src/content/galleries/b-spline-policy/{en,zh}.json`，首页关联在 `src/data/site.ts`，公开路径为 `/gallery/b-spline-policy/`。实际材料为极智深诣公司 2026 年 7–8 月实习 Demo 的三个模拟视频及一张真机实验图，资料链接为 [项目仓库](https://github.com/Siyuan-Xue/openpi05-bsp) 和 [论文](https://arxiv.org/abs/2607.09648)。新增可选视频与四列表格内容，更新方式见 [图集指南](GALLERIES.md)；播放无需页面脚本，图片仍独立进入灯箱。7 个媒体 ID 对应 19 个文件（1,304,018 字节）已直传并逐文件核验；服务器恢复快照为 `/var/backups/siyuanxue-media/587ad4b11888d4a497154c77546b33414a9b9efd93dc3059e7e63fec345d63a2/`。本机源副本与派生资源仍在忽略目录 `media-local/`。恢复时先还原双语 JSON 和清单，媒体缺失再从本机或快照恢复并核验；不改仓库设置、账户、CI secret 或独立服务。最终 [Actions 38103212931](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38103212931) 已成功发布 `5f6df9621535d03c50eb01d029eb47226e0e8b70`，两域名目标 SHA、固定语言、旧照片拒绝、新图集入口、视频、数据表、资料链接和索引元信息均验收通过。公司名已按用户确认统一为中文「极智深诣」、英文「SEEN-E」。页面发布、本轮检查与前一阶段记录见 [审计](audits/2026-10-11-b-spline-gallery.md)；随后 `[skip ci]` 文档提交不改变静态版本。

**2026-10-11 LeDA 正式图集：**用户确认项目名为「LeDA 智能体 / LeDA Agent」。原址 `/gallery/leda-agent/` 的两份 JSON 补充 2025 年 7–8 月与室友合作开发的 LangGraph / Neo4j 图谱 RAG、长期个性化推荐及 2026 年 7 月国家级项目结题；首页源资料同步时间范围。媒体位于本机忽略目录 `media-local/originals/leda-agent/` 与 `media-local/`，由 `src/data/media.json` 的五个 `leda-agent/*` ID 引用。两个 MP4、真实录制帧和证书共 16 个文件已按原 SSH/rsync 方式上传并通过服务器摘要/大小校验；正文仍须由 Actions 同步发布两站。视频模板增加可选双语标题与单列 `demos` 布局（最大 480px），B-Spline 仍用默认三列紧凑布局。更新、验证、恢复和发布状态见 [LeDA 审计](audits/2026-10-11-leda-gallery.md)；已由 [Actions 38105350553](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38105350553) 成功发布 `0aea94118bdcacf030ab12ab4b3a77b2b30fbcb0`；两域名 SHA、固定语言、旧照片 410、正文与原首页入口、两视频/封面/证书/资料链接、索引元信息均通过公网检查，两语言线上播放、明暗与窄屏、证书灯箱放大和键盘关闭/焦点返回通过。后续 `[skip ci]` 文档提交不改变该静态版本。恢复先还原双语内容与清单并发布；媒体损坏时从本机副本或 `/var/backups/siyuanxue-media/5edffcf7cdf3a6b5469c419ca12c0835cf38af4b5016f0ac0763452644387eff/` 恢复、核验，不随静态回滚删除媒体。未改独立服务、账号、CI secret 或 Nginx。

**2026-10-11 LeDA 视频布局后续调整：**按用户反馈取消 `demos` 的 480px 上限，播放器与正文共用窄栏宽度；两语言 LeDA JSON 将 `videoTitle` 显式设为 `null`，移除总标题，保留各视频标题、图注及辅助技术名称。更新位置为 `src/utils/gallery.ts`、`src/components/GalleryContent.astro`、`src/styles/gallery.css` 与双语 JSON；当前作者规则见 [图集指南](GALLERIES.md)，本轮验证、发布与恢复见 [布局审计](audits/2026-10-11-leda-video-layout.md)。上述正式图集段落保留首次上线时的 480px 验收事实。本次不涉及媒体直传或服务器配置；[Actions 38107179283](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38107179283) 成功发布 `0d5be1dc763ee72d16d66f4feec9cfdfb343d701`，两站目标 SHA、固定语言、跳转、旧照片拒绝、图集正文及索引元信息通过公网检查。两语言生产浏览器确认视频与正文桌面同宽 624px、390px 窄屏同宽 358px，总标题缺席；B-Spline 的三列与默认标题保持原样。后续 `[skip ci]` 文档提交不改变此静态 release；恢复沿用 Git 还原或 Actions rollback，无需重新上传媒体。

**2026-10-11 图片与演示视频一致性后续调整：**LeDA 的 `demos` 改为与图片一致的下方图注，取消各视频上方的小标题，并把视频之间及视频区到图片区的留白统一为 2rem。修改位置为共享 `GalleryContent.astro` 和 `gallery.css`，两语言同步；媒体、正文事实、播放器控件和 `comparison` 速度标题不变。当前规则见 [图集指南](GALLERIES.md)，本轮验证、发布和恢复见 [展示一致性审计](audits/2026-10-11-gallery-media-consistency.md)。本轮类型检查、双语构建、产物检查、临时图集构建及合并前审查完成；[Actions 38108808391](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38108808391) 成功发布 `5d9436db7555ae0c1b6c8809ee8f2744e81344e7`。两站目标 SHA、固定语言、跳转、旧照片拒绝、图集及索引元信息通过公网检查；两语言生产浏览器确认视频和图片桌面均宽 624px、390px 窄屏均宽 358px，无横向溢出，说明样式和 32px 间距一致。后续 `[skip ci]` 文档提交不改变此静态版本；恢复沿用 Actions rollback 或 Git 还原模板/CSS，无需重传媒体。

**2026-10-11《与光同行》正式图集：**双语内容位于 `src/content/galleries/walking-with-light/{en,zh}.json`，`src/data/site.ts` 同步标题；沿用 `/gallery/walking-with-light/`，中文改为「话剧《与光同行》· 饰 叶培大」。正文补齐用户确认的男主角、排练、演出与剧目获奖经历，16 张真实照片由清单中的 `walking-with-light/photo-01` 至 `photo-16` 引用，两语言同时设为正式、可索引图集。原图及派生文件共 160 个（9,686,978 字节）已原生 SSH/rsync 直传并通过服务器摘要/大小检查；本机副本位于忽略目录 `media-local/originals/walking-with-light/` 与 `media-local/`，服务器快照为 `/var/backups/siyuanxue-media/e3b88e15f4a45b1f8902cdfee3f7a24af34518d27a2077a1d722b93c5326a551/`（同盘恢复副本，不代替异地备份）。先恢复清单及双语 JSON，再通过原 Actions 发布；媒体缺失时从本机或快照恢复并核验，两站媒体不随网站 rollback 删除。更新方式见 [图集指南](GALLERIES.md)，来源、验证与发布状态见 [本轮审计](audits/2026-10-11-walking-with-light-gallery.md)。本轮构建、产物检查、合并前审查及媒体公网摘要检查通过；[Actions 38110160913](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38110160913) 成功发布 `24d1e0357c436bc919c48f38fcce1ce66705faa5`。两站目标 SHA、固定语言、跳转、旧照片拒绝、16 图和四个资料链接、索引及分享元信息通过公网检查；两语言生产浏览器确认桌面 624px/302px 图片布局、390px 窄屏 358px 单列、明暗模式及键盘灯箱，无横向溢出。后续 `[skip ci]` 文档提交不改变此静态 release；没有修改 Nginx/helper、账号、CI secret 或独立服务。

**2026-10-11《寻找李白》新增兴趣爱好图集：**双语内容位于 `src/content/galleries/finding-li-bai/{en,zh}.json`，首页在 `src/data/site.ts` 关联为「话剧《寻找李白》· 饰 田波 / Finding Li Bai · as Tian Bo」，位于《与光同行》之后、排球队之前。用户确认第二次演出、饰演田波及剧团友谊；年月未提供时使用相对经历，不猜测日期。稳定地址为 `/gallery/finding-li-bai/`，两语言均为正式图集。九张照片与缩略图/封面共 90 个文件（4,174,633 字节）已原生 SSH/rsync 直传并经服务器摘要/大小核验，Git 仅保存九个 `finding-li-bai/photo-*` 媒体 ID；原图副本在 `media-local/originals/finding-li-bai/`、派生资源在 `media-local/`，恢复快照为 `/var/backups/siyuanxue-media/97a9a7ea25d55e1bbbfdb9eeb721f23f4c9ef13732bdc508db3d5b922906417c/`（同盘副本，不代替异地备份）。更新方式见 [图集指南](GALLERIES.md)，本轮验证、发布与恢复见 [审计](audits/2026-10-11-finding-li-bai-gallery.md)。本轮类型检查、双语构建、产物测试、媒体公网摘要检查及独立审查通过；[Actions 38111409933](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38111409933) 成功发布 `c01926ba94958eed34f4cd9b1446b0bace1a344a`，两域名目标 SHA、固定语言、跳转、旧照片 410、首页顺序、九图/图注/元信息及 sitemap 核对通过。两站生产桌面/390px 窄屏、主题及 Enter/切换/放大/Escape/焦点返回验收通过，演出年月尚可补充。内容恢复走 Git 还原及原 Actions，媒体缺失再从副本恢复并核验，无需重新安装 Nginx/helper 或独立服务。

**2026-10-11《家》新增兴趣爱好图集：**双语内容位于 `src/content/galleries/family/{en,zh}.json`，`src/data/site.ts` 关联「话剧《家》· 饰 高觉新 / Family · as Gao Juexin」，稳定地址 `/gallery/family/`，位于《寻找李白》之后、排球队之前。用户确认首次登台及饰演男主角高觉新，没有提供演出年月，使用相对经历。九张真实照片及缩略图/封面共 90 文件（5,252,410 字节）已原生 SSH/rsync 直传并通过服务器摘要/大小核验，Git 只保存九个 `family/photo-*` 媒体 ID。原图副本位于 `media-local/originals/family/`，派生文件在 `media-local/`，服务器恢复快照为 `/var/backups/siyuanxue-media/06aa57f5a1a3cc92aa9ac1712bc1bd9e3882af3ab239551a58690c1e995c3ffa/`（同盘副本）。更新方式见 [图集指南](GALLERIES.md)，本轮检查及恢复见 [审计](audits/2026-10-11-family-gallery.md)。类型检查、双语构建、产物测试、独立审查和两域名媒体公网摘要检查通过；[Actions 38112284028](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38112284028) 已成功发布 `3df850bcf4effe2c62c8303924586d1ecc17953e`。两站目标 SHA、固定语言、跳转、旧照片拒绝、正文/九图/首页顺序/索引元信息，以及生产明暗主题、390px 窄屏和灯箱键盘切图/缩放/关闭/焦点返回均验收通过。后续 `[skip ci]` 文档提交不改变该静态 release。内容恢复走 Git 与原 Actions，媒体缺失再从本机或快照恢复并核验；未修改 Nginx/helper 或独立服务，实体手机、搜索实际收录及媒体异地备份仍沿用原有待办。

**2026-10-11 排球队真实图集与分区：**双语内容位于 `src/content/galleries/volleyball/{en,zh}.json`，沿用首页条目及 `/gallery/volleyball/`。十张用户照片按输入顺序保存为 `volleyball/photo-01` 至 `photo-10`，可选 `imageSections` 显示校排球队前四张、院排球队后六张；共享验证要求两语言分区起点和图片顺序一致，灯箱保持十图连续浏览。按用户后续要求，`period` 改为可省略、两语言须同时省略；排球条目及画廊均无时间信息或空括号，正文表达贯穿大学生活。《与光同行》双语 `period` 及源资料背景同步改为「北邮70周年校庆 / BUPT 70th anniversary」。更新入口为 `gallery.ts`、`GalleryContent.astro`、`GalleryImageGrid.astro`、图集样式及双语 JSON，规则见 [图集指南](GALLERIES.md)。本机原图副本在忽略目录 `media-local/originals/volleyball/`，派生文件在 `media-local/`；100 文件共 7,524,469 字节已完成本机摘要/大小校验。用户已明确授权上传及上线并完成原生 SSH 认证；100 文件直传、服务器逐文件校验和两域名公网 SHA-256/响应头检查通过，快照为 `/var/backups/siyuanxue-media/29f2eec12c2939da44857283f6a69c437d1aa48a8eadab3ecc32f937cf84f78b/`。[Actions 38118386893](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38118386893) 已成功发布 `b5ddbd30a77739ed88802f25225b14e476227732`，两域名目标 SHA、固定语言、HTTP/www 跳转、旧照片 410、十图/4-6 分区/无时间、首页校庆背景和索引元信息核对通过；生产双语明暗/390px 窄屏与中文连续键盘灯箱验收通过。后续 `[skip ci]` 文档提交不改变该静态版本。状态与恢复入口见 [本轮审计](audits/2026-10-11-volleyball-gallery.md)。内容恢复走 Git 和原 Actions，媒体缺失从核验过的本机或服务器快照恢复；不修改 Nginx/helper 或独立服务。

**2026-10-11 文章目录复刻：**用户要求复刻已打开的 Dario Amodei 文章目录。组件位于 `Toc.astro` / `TocToggle.astro`，共享样式为 `src/styles/toc.css`，控制器为 `src/utils/toc.ts`：桌面固定左栏默认展开，可通过菜单/X 收起；1024px 以下改为顶栏入口及同色全屏目录。导航复用实际 Markdown h2/h3 标题 ID，滚动和页面底部保持当前章节高亮，窄屏收起/跳转恢复焦点并释放滚动锁及正文 inert。更新与恢复走这些源码、现有双语构建和 Actions；保留阅读栏宽度、可读灰色、即时粘土色反馈、明暗模式、打印与 reduced-motion。独立审查的焦点可见性建议已修复；类型检查、129 项单元测试和32项双语产物检查通过；本机双语桌面、1024px 与320/390px窄屏及390×220px键盘焦点已核对，[Actions 38128113680](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38128113680) 已成功发布 `413ec25dcf56e6a5eea0c2474e9e83f22f92fd49`，两域名完整 SHA、固定语言、跳转、旧照片拒绝及文章真实目录锚点均通过验收；线上双语明暗、窄屏、键盘收起/跳转/焦点返回与页面底部高亮通过。后续 `[skip ci]` 文档提交不改变此静态版本。参考测量、适配范围及后续证据见 [本轮审计](audits/2026-10-11-dario-article-toc.md)。不新增媒体、依赖、外部账号、secret 或服务器/聊天/记忆服务配置。

**2026-10-11 首页时间与顶栏后续调整：**用户最终要求首页括号只显示简短说明，八个双语 `homeMeta` 已移除时间，首页不再从 `period` / 源资料 `year` 回退；图集真实时间保留。手机文章页按钮顺序改为目录、首页、聊天、主题，并在 `AGENTS.md` 记录「越小、越新越靠左」的后续规则。顶栏 70% 背景/12px 模糊移至独立背景伪元素，固定目录控件不再与滤镜祖先共享绘制，打印禁用该背景层；用户在实际 Codex 内置浏览器本地复试确认悬停离开后的黑线消失。更新入口为 `Header.astro`、`BulletList.astro`、`gallery.ts`、双语图集 JSON 与 `base.css`；恢复走这些源码及原 Actions，无媒体或独立服务安装。检查、审查、证据边界与发布状态见 [本轮审计](audits/2026-10-11-header-toc-refinements.md)。[Actions 38130560932](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38130560932) 已成功发布 `4b5a65f77b47bc6b8d45cc17d873971cf295f304`，两域名完整 SHA、固定语言、HTTP/www 跳转和旧照片 410 核对通过；生产双语首页无时间、中文桌面悬停后离开、390px / 英文320px 按钮顺序、明暗与键盘收起/跳转/焦点恢复验收通过。后续 `[skip ci]` 文档提交不改变该静态版本；上方时间括号和目录初版记录保留各自历史版本的语义。

### GitHub Actions

**2026-10-11 数学平台条目合并：**按用户要求将 ProbFun（邮趣概率，uMathHub 的前身）与 iMathBook 合并为首页首位的「iMathBook · uMathHub」，双语正文记录 2025 年 5 月加入、7 月组建 iMathBook 团队并主导开发，以及官方认证、教学使用和累计超千人次的用户确认事实。内容位于 `src/content/galleries/imathbook/{en,zh}.json` 与 `src/data/site.ts`；前三张 uMathHub、后四张 iMathBook 的七张原始截图保存在 `media-local/originals/imathbook/`，70 个媒体文件共 5,469,219 字节在 `media-local/`，Git 仅追加清单。原 `probfun` JSON 撤下，`astro.config.mjs` 通过静态 HTML 跳转保留 `/gallery/probfun/` 的访问，目标为 `/gallery/imathbook/`；旧路径 noindex、不进 sitemap，两平台资料链接均保留。更新与恢复走双语 JSON、源资料、Astro 配置、清单和原 Actions；媒体先经原生 SSH/rsync 上传并核验，再发布，恢复从核验过的本机或媒体快照进行。新增七图初次上传被自动审批认为缺少这批素材的明确目的地授权而拒绝；展示完整预览后，用户单独授权七图上传并上线。70 文件已经原生 SSH/rsync 直传、服务器摘要/大小与两域名公网摘要/响应头校验，快照为 `/var/backups/siyuanxue-media/98bb7b8e0234d287bc46827b6df29f3399a9716048c58117cd0ed41dafe4c689/`。排球 100 文件公网校验也通过，临时 SSH 连接已关闭；两个静态修改在独立审查后由 [Actions 38118386893](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38118386893) 成功发布 `b5ddbd30a77739ed88802f25225b14e476227732`；两域名目标 SHA、固定语言/跳转/旧照片拒绝、唯一首入口、正文/3-4 分区/七图/外链/索引元信息及旧址兼容验证通过，生产两语言七图加载、明暗与390px窄屏、跨区键盘灯箱/关闭焦点返回与中文放大通过。后续 `[skip ci]` 文档提交不改变该静态 release。完整状态与验证见 [合并审计](audits/2026-10-11-imathbook-umathhub-gallery.md)。无新域名、账号、secret 或 Nginx/helper、独立服务安装。

**2026-10-11 首页括号说明：**按用户要求，五个项目与三部话剧首页括号统一为「时间 · 简短说明」，排球队继续不显示括号。新增可选的双语 `homeMeta`，位置为 `src/content/galleries/<slug>/{en,zh}.json`；内容模型在 `src/utils/gallery.ts`，首页展示在 `src/components/BulletList.astro`。提供 `homeMeta` 时覆盖首页括号，未提供时沿用 `period`；图集详细背景仍使用原 `period`，媒体、角色、入口和资料链接保留。用户确认《寻找李白》为 2024 年 10 月、《家》为 2024 年 6 月；不从照片或旧占位文本猜测时间。《家》的双语资料区同时添加用户提供的 Bilibili 演出录像链接 `BV1ZD421u7mP`，移除原地址的追踪参数。更新时同步两语言且填写非空文本，验证类型、内容配对、真实双语产物的覆盖/回退/无空括号，以及两站明暗和窄屏换行；恢复通过 Git 还原双语 JSON、模型与组件，再走现有 Actions。[Actions 38121089403](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38121089403) 已成功发布 `17bcc82ad6f22dec8fac278d18ca3a3c45e939d1`；完成后两域名完整目标 SHA、固定语言、旧照片 410、八条首页说明/排球无括号/原图集背景及录像外链核对通过，生产双语明暗/桌面/390px 窄屏验收通过。后续 `[skip ci]` 文档提交不改变该静态 release。完整发布状态见 [本轮审计](audits/2026-10-11-home-entry-context.md)；无媒体重传、身份资料、外部账号、域名、secret 或独立服务变更。

**2026-10-11 后续图集展示调整：**按用户要求，B-Spline Policy 真机实验表格仅保留在原图中；已从双语 JSON 与共享模板移除重复的 HTML 表格、数值副本及不再使用的表格样式，保留图片灯箱、图注和结果说明。更新位置仍为双语图集、`GalleryContent.astro`、`gallery.ts` 与图集样式；恢复通过 Git 还原对应源码并走 Actions，媒体不需重传或删除。该次调整已由 [Actions 38103994833](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38103994833) 成功发布 `0f1b0ac407d8b57b14a67059406528390e9e8bae`，两域名 SHA、语言、旧照片拒绝、新图集无重复表格、原图/说明/视频及索引元信息验收通过，中文线上灯箱放大和键盘操作再次通过；见 [审计](audits/2026-10-11-b-spline-table-cleanup.md)。上段表格验收是初次发布的历史记录。

- [CI 工作流](../.github/workflows/ci.yml) 调用 `bash ops/verify.sh`，完成类型、行为、部署脚本、隔离 Nginx、双语构建及产物检查，再打包同一份产物；Actions artifact 保留 7 天，不能当长期备份。
- [生产工作流](../.github/workflows/deploy.yml) 在 push `main` 后运行；`production` 并发不主动取消前次发布。上传已验证包及校验和，激活版本，验证公网两域名，最后保留 5 个成功 release。
- 手动运行支持 `operation=deploy` 或 `rollback`；回滚需要保留版本的完整 40 位 SHA。`migrate_domains=true` 仅用于已有管理员准备的首次迁移，日常不用。
- **推送网站代码只自动发布静态产物。**不会自动安装新版 Nginx 配置、`siyuanxue-release`、Node 聊天桥接、Hermes profile/plugin、记忆服务、模型或数据库。
- 网页代码和文字继续通过现有 GitHub CI/CD 同步发布两域名。2026-10-11 起图片、视频原文件与缩略图改为 SSH/rsync 直传，不通过 GitHub artifact；不手动切换网站 release。SSH 还用于必要的独立服务维护和诊断。

2026-09-16 已重新读取 GitHub `production` 环境变量与 secret **名称**：

| 名称 | 值 / 用途 |
|---|---|
| `DEPLOY_HOST` | `82.156.77.131` |
| `DEPLOY_PORT` | `22` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_ROOT` | `/var/www/siyuanxue.com` |
| `DEPLOY_ORIGIN` | `https://siyuanxue.com` |
| `DEPLOY_SSH_KEY`（secret） | CI 部署私钥，值不写入文档 |
| `DEPLOY_KNOWN_HOSTS`（secret） | 固定服务器主机公钥记录；保留严格校验 |

### 服务器文件与恢复

| 路径 / 服务 | 用途与维护方式 |
|---|---|
| `/var/www/siyuanxue.com/releases/<SHA>` | 英文在根目录，中文在 `zh/`；`release.json` 格式版本 2 |
| 同目录 `current` / `previous` | 当前与前一版本软链接；不要手工编辑已发布 HTML |
| 同目录 `incoming/` | CI 包上传入口 |
| 同目录 `shared/_astro/` | 跨版本共享指纹资源，追加保存，暂无自动清理；检查磁盘 |
| 同目录 `shared/media/` | 图片/视频原文件及本机生成的缩略图，SHA-256 文件名、追加安装、两域名 `/media/` 共用；独立于 release 和回滚，不自动删除 |
| 本机 `media-local/` | Git 忽略的素材与上传文件；本轮 18 张原始图另保存在 `media-local/originals/`；不是自动跨机器同步 |
| `/var/backups/siyuanxue-media/<清单SHA>/` | 已上传清单与媒体硬链接恢复快照（同磁盘，不是异地灾备）；直传命令生成，不自动过期 |
| `/var/backups/siyuanxue-media-nginx-20261010T164421Z/` | 本轮实际 Nginx 路由变更前两域名配置备份；恢复时先恢复引用媒体的网页版本，再还原配置并 `nginx -t` / reload |
| `/usr/local/bin/siyuanxue-release` | 安装自 [ops/release.sh](../ops/release.sh)，服务器副本需单独升级 |
| `/usr/local/lib/siyuanxue-https` | HTTPS helper 和模板；源码在 `ops/` |
| `/etc/nginx/` | 已启用域名配置、聊天 snippet；源码模板在 [ops/nginx](../ops/nginx) |
| `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx` | 续期后先检查再 reload，源码为 [renewal hook](../ops/reload-nginx-after-renewal.sh) |
| `/var/backups/siyuanxue-dual-domain-20260911` | 首次双域名迁移备份，root 私有；早期布局仅供管理员灾难恢复 |

发布验收必须同时检查 Actions 结果、两个 `/__health` 的目标 SHA、语言、跳转与旧照片封禁。可运行 `bash ops/verify-public.sh <完整SHA>`。聊天需要独立验收，静态发布成功不证明模型可用。

故障恢复优先用 Actions 的 rollback 操作；首次双语迁移以前的单语言包不是正常回滚目标。始终保留 `/images/p-202.jpg` 的 410 拒绝规则。慢上传时先读取最新 job/step 状态，再决定是否取消或重试，不能依据过期状态打断已开始的激活。

SSH 早期报错使用了错误 IP `87.156.77.131`；正确 IP 曾验证成功。近期无交互公钥失败只说明该次本地凭据不可用，不能推断服务器封禁，更不能因此关闭防火墙或 Fail2ban。

## 4. 小薛聊天、微信、模型与长期记忆

以下运行状态来自 9 月 13–16 日部署记录，**本次整理未重新登录服务器复验**。阅读 [聊天桥接说明](../services/hermes-chat/README.md)、[只读工具基线](../services/hermes-chat/READONLY.md)、[学习基线](../services/hermes-chat/LEARNING.md) 时，须同时核对本节所列后续变更。

| 层 / 资源 | 权威位置、作用与更新边界 |
|---|---|
| 网站聊天 UI | 当前主分支 React/AI SDK 实现；随网站 CI 发布，浏览器 `sessionStorage` 只保留本次访问的有限聊天与草稿。2026-10-02 无侧栏改版保留 Baby 图标，字体与明暗配色共用主页 tokens；当前保留固定主页姓名/顶栏位置、控件与页脚居中、首次发送下沉及中英文流式淡入。[首次发布](audits/2026-10-02-chat-main-only.md)与[动态/对齐修正](audits/2026-10-02-chat-dynamics-alignment.md)记录验证与实际上线。后续[手机键盘修正](audits/2026-10-02-chat-mobile-keyboard.md)按用户要求撤回，源码与两域名已恢复到此前release `1df24e4`，见[回退审计](audits/2026-10-02-chat-mobile-rollback.md)；手机键盘反馈仍未标记为解决 |
| Node 桥接 | 源码 `services/hermes-chat/server.mjs`；安装到 `/opt/hermes-chat/server.mjs`；系统服务 `hermes-chat.service`，Node ≥22.12；**独立安装** |
| 桥接配置 | `/etc/hermes-chat.env`，root:0600；含网站 profile API key 和上游/允许域名，不含 GLM key |
| 网络边界 | 桥接 `127.0.0.1:8643` → 网站 Hermes `127.0.0.1:8642`；Nginx 对外仅 `/chat-api` 与 `/chat-api/health`；`/chat-api/sessions` 拒绝；不要暴露两个内网端口 |
| Hermes 本体 | 部署记录基线 v0.21.1，commit `05d705dd695d1084388529124dc2ffe5ce919e89`；实际源码目录/当前版本升级前重新查。保留原生会话、日志和身份路由 |
| Profiles | `/home/ubuntu/.hermes` 默认 profile；其 `profiles/xue-owner`、`website-chat`、`wechat-public`。主人可学习和写入，公共渠道限制为审计过的读取 |
| Gateways | 用户服务 `hermes-gateway.service`、`hermes-gateway-website-chat.service`；default 网关承载微信分流。微信登录凭据、主人路由 ID 与管理白名单只保存在私有配置 |
| 人设 / overlays | `services/hermes-chat/assistant-SOUL.md` 是跨渠道人设模板；各 YAML 是局部覆盖，不是整份配置。修改上下文后使用新会话；合并时保留认证、路由和新记忆配置 |
| 基础只读插件 | `website-readonly` 安装在网站和访客微信 profile；时间、公开网络、精选记忆和知识共 8 个工具。Tavily 配置为 free/keyless；无新付费搜索密钥 |
| 语音 | 本地多语言 faster-whisper base；`/home/ubuntu/.hermes/models/faster-whisper-base`，自动识别语言；`voice-context` 原生 hook 保留语音来源上下文。见 [语音修复记录](audits/2026-09-14-weixin-voice-fix.md) |
| GLM Coding Plan | 后续记录统一为 `glm-5.3`、`https://open.bigmodel.cn/api/coding/paas/v4`、私有 `GLM_API_KEY`；包含 17 种原生文本辅助路由。主聊天保留 high，记忆整理使用已验证的非思考模式 |
| SuperGrok | 只完成接入能力检查；服务器到 xAI 网络未打通，未完成 OAuth 或模型调用，不是已启用的回退提供商 |
| 长期记忆运行目录 | `/home/ubuntu/hermes-memory-runtime`；Hindsight API/client 0.10.0、独立 Python 3.11；API `127.0.0.1:8888` |
| 记忆数据库 / 检索 | PostgreSQL 16 + pgvector + PGroonga；本地 multilingual-e5-small ONNX 与 FlashRank multilingual MultiBERT；数据库仅回环监听；升级前保存扩展和模型版本 |
| 原文 / 队列 | 从已核实主人 `xue-owner/state.db` 抓取消息，保留角色与版本；仅主人 user 消息进入事实整理队列。原文是依据，索引、摘要和六类主题页是派生数据 |
| 长期记忆权限 | `life-memory` 插件增加 `diary_search`、`diary_read`、`life_memory_recall`、`life_memory_topics`；公共 profile 后续验收为 12 个工具。公共聊天不自动写入；个人内容读取遵循已有授权，凭据始终排除 |
| 记忆私有配置 | 运行目录 `archive-config.json`、`worker-config.json`、`service.env`；包括主人 ID、档案/源库路径、模型/数据库配置。部署时核对0600，不入库；owner profile 的 `hindsight/config.json` 也属于私有运行配置 |
| 记忆定时器 | 用户服务 `xue-memory.service`；`xue-diary-sync.timer` 每次完成后约 15 秒抓取，`xue-diary-ingest.timer` 约 60 秒处理；`xue-memory-backup.timer` 当地时间 04:20 起随机延迟最多 5 分钟，保留 user linger |

**源码缺口：长期记忆尚未进入 main 或远端。**完整源码在仅本地分支 `archive/local-notes-and-hermes-memory-2026-09-16`，commit `55b504d677b6cd748133222ad3bff87330ed08ed` 的 `services/hermes-memory/`；22 个文件包括归档、队列、读取插件、备份、profile 验证及 systemd 单元。另有 13 份本地审计/计划记录。归档没有推送到 GitHub，不能假设换台电脑 clone 后就能重建。

不切换当前工作区也能阅读原始依据：

```sh
git show archive/local-notes-and-hermes-memory-2026-09-16:services/hermes-memory/README.md
git show archive/local-notes-and-hermes-memory-2026-09-16:docs/audits/2026-09-15-hermes-memory-deployment.md
git show archive/local-notes-and-hermes-memory-2026-09-16:docs/audits/2026-09-15-hermes-supergrok-connection.md
```

`activate-memory.py` 只接入已有环境，不是完整安装器。不能仅恢复 Python 文件就声称数据库扩展、本地模型、密钥和定时器也恢复完成。后续应单独评审源码的正式版本管理位置，并同步旧 profile 文档/验证器；本次文档整理没有自动合并归档或更改运行服务。

维护验收至少包括：已安装 profile 最终工具 schema、主人/访客隔离、只读写入拒绝、实际时间与检索、两网站真实聊天、新消息入队到索引的回执、失败重试、备份恢复。`/chat-api/health` 仅证明桥接进程可用，不证明 GLM 额度、模型推理或记忆完整性。长期记忆历史验收为 41 项测试通过及实际隔离恢复，不能当成本次新测试结果。

## 5. 备份、归档与恢复资源

| 资源 | 保存位置 / 内容 | 恢复与缺口 |
|---|---|---|
| 网站源码历史 | GitHub 网站仓库 `main` | 可 clone；不含服务器密钥、数据库、未推送归档或服务器安装状态 |
| 个人主页历史 | GitHub `Siyuan-Xue/Siyuan-Xue` | 独立恢复 README；账号侧栏资料不是 Git 文件 |
| 个人主页名称修正前备份 | 2026-10-11 原文及 API/差异验收临时保存在 `/tmp/pixeldone-profile-20261011/`；长期依据为独立仓库旧提交 `2de81af53ebe2241e2ef0869ec20463a46175562` | `/tmp` 不是长期备份。恢复时撤销 `7edf6cfb902f98a77dfa1129bfabf81037d500cc`，或核对后续改动后用当前 blob SHA 写回旧文；不能覆盖后续合法修改 |
| Git 整理备份 | 本机仓库 `.git/cleanup-backups/2026-09-16/` | `refs.bundle`、`archive.bundle`、35 文件 tar、SHA-256 manifest、整理前 refs/worktrees、删除分支清单及恢复 README；**仅本机** |
| GitHub 资料修改前备份 | 本机 `.git/seo-backups/2026-09-16/github-before.json` | 选定公开资料字段的旧值，非完整账号备份；仅本机 |
| 网站旧 release | 服务器 `releases/` 与 `previous` | 正常保留 5 个成功版本；不等于服务器/聊天数据备份 |
| Nginx 双域名迁移备份 | `/var/backups/siyuanxue-dual-domain-20260911` | 恢复该网站配置、helper、链接与内容；不能覆盖整个机器配置 |
| 桥接安装备份 | `/var/backups/hermes-chat.*`；历史 UI 更新还有 `/var/backups/hermes-chat-ui-*` | 按实际变更记录找对应版本，恢复 bridge/unit/snippet，检查 Nginx 后重启对应服务 |
| Hermes profile 备份 | `/home/ubuntu/hermes-backups/` | 已记录 learning、voice、supergrok-auth 等备份；回滚配置不应删除之后新写入的合法记忆 |
| 记忆接入配置备份 | `/home/ubuntu/hermes-memory-runtime/config-backups/<时间>/` | `activate-memory.py` 修改前保存 profile 配置；这是配置备份，不是完整数据快照 |
| 服务器记忆加密备份 | `/home/ubuntu/hermes-memory-runtime/backups/`、`backups/latest.json`；独立恢复需运行目录 `backup.key` | AES-256-GCM 快照、SQLite 一致性副本和 PostgreSQL dump；无自动过期，必须检查新鲜度和容量 |
| Mac 独立记忆快照 | `/Users/milesxue/.local/share/xue-memory-backups/` | 9 月 16 日记录的 `20260916T000756Z.aesgcm` 及恢复密钥；目录0700/文件0600，校验与认证解密通过；**一次性拷贝，不是自动异地同步** |
| 云实例快照 / 异地备份 | 腾讯云及另行指定的私有备份位置 | 策略、频率、留存、告警和恢复负责人待确认；不能从有本地快照推断已有灾备 |

本地 Git 归档的恢复命令（只在对应分支丢失时使用）：

**2026-10-11 当前仓库清点补记：**本轮发布后的工作区为干净的 main；当前 checkout 未找到 `archive/local-notes-and-hermes-memory-2026-09-16`、其记录的 `55b504d677b6cd748133222ad3bff87330ed08ed` 对象，也未找到 `.git/cleanup-backups/2026-09-16/` 和 `.git/seo-backups/2026-09-16/`。上表与第 4 节记录的是 9 月的历史保存位置，不能据此声称这些归档仍在当前 checkout；它们是否保存于其他仓库或备份位置待核对。本轮没有清理分支或备份，也未读取其他私有备份内容；先找回有效 bundle/备份，再按下面命令恢复，不能对不存在的文件直接执行恢复。

```sh
git bundle verify .git/cleanup-backups/2026-09-16/archive.bundle
git fetch .git/cleanup-backups/2026-09-16/archive.bundle \
  refs/heads/archive/local-notes-and-hermes-memory-2026-09-16:refs/heads/archive/local-notes-and-hermes-memory-2026-09-16
```

记忆恢复顺序：先验证密文校验和与 AEAD，在私有隔离目录解包，检查档案与 SQLite `integrity_check`，把 `hindsight.dump` 恢复到**新数据库**，核对原文/主题/检索，最后安排正式切换。不要用一次线上覆盖代替恢复演练。备份密文与密钥都不可缺；不要把任何解包结果放进 `public/`、GitHub、构建产物或公开下载目录。

## 6. 每次更新的遗漏检查表

### 按修改内容选择联动资源

| 修改内容 | 同时检查 |
|---|---|
| 姓名、身份、简介、项目、联系方式 | `src/data/site.ts` 中英资料、BaseHead Person/WebSite/ProfilePage/BlogPosting、站点 README、GitHub 账号 name/bio/blog、个人主页 README、两仓库 About；小薛人设/精选记忆仅在事实相关时更新 |
| 文章 | 中英文配对、日期/ID/草稿、标题/描述、canonical/hreflang、RSS/sitemap、站内链接；不要把未完成占位页加入索引 |
| 媒体上传 / 存储 | 本机 Sharp 准备、媒体清单、原生 SSH/rsync 与严格主机校验、服务器摘要/大小验证、两站媒体类型/缓存/Range、CI 无图片视频、独立媒体恢复与磁盘容量；先上传再发布，禁止密码入库 |
| 图集 / 首页内容目录 | `src/content/galleries` 双语 JSON、真实角色/介绍/图片/alt/图注、来源资料与 `site.ts` 的 gallerySlug、双语 preview 一致、可选时间字段与独立首页 `homeMeta` 两语言显示一致，仅简短说明/不回退时间及无空括号、可选图片分区的标题/起点/顺序与连续灯箱、草稿隔离、首页站内入口、封面/canonical/hreflang/ImageGallery；sitemap 按内容 draft/preview 状态筛选；`bun run test:gallery` 在临时目录验证正式图集可索引，生产产物测试验证条目预览可由首页进入但 noindex/不进 sitemap、固定版式样例额外不进首页、普通草稿不出页；不改变博客 RSS 身份 |
| 域名 / 路径 | 注册与 DNS、www/HTTP 跳转、两个证书、Nginx 根目录、SEO/RSS/sitemap、语言链接、聊天 ALLOWED_ORIGINS、CI 变量与域名校验、GitHub 各处链接、搜索平台属性 |
| 搜索平台 / 提交策略 | 中文站优先核查百度站点归属及账号实际开放能力；两站稳定 URL、现有 Google 验证与 Bing/AI 发现继续维护。按平台分别记录提交回执、抓取、索引、查询曝光及 AI 引用，不将一个平台的数据移作另一个平台的验收 |
| 肖像 / 动效 | 正常肖像与占位肖像区分、人物比例/压缩/alt、单击展开、无提示刷新折叠、语言切换时 media=shown 首帧展开/按需加载/错误重试/不打开灯箱、灯箱可访问性、两站可见英文文案、reduced-motion、旧照片永久拒绝、图片缓存；不恢复状态标语块 |
| 明暗 / 顶栏 / 导航 | 首页/文章/聊天、两种语言、明暗初次加载/切换/返回、不透明背景与图标可读性、静态页滚动显隐/顶部/焦点/操作行展开/手机目录显示锁、聊天顶栏常显、Lucide 无圆框按钮；语言为 `Languages` 图标（20px/1.8），无可见文字、SVG `aria-hidden`，两语言 `aria-label`/`title` 分别为 `Switch to 中文` / `切换到 English`，窄屏与相邻控件同为 44×44px；默认折叠，语言固定为操作行最右且紧邻箭头，其他控件按既有相对顺序/「越小、越新越靠左」，DOM/键盘顺序一致；构建时双语同路径/草稿缺译回退及干净 href、运行时三项非默认 hash（theme/header/media）/系统主题不携带/首帧布局与语义一致/按键独立验证及清理/锚点字节保留/仅主题存储/存储异常/BFCache 保留当前视图并同步链接、无 JS 链接、Esc/外部点击/焦点返回/inert、44px 点击区/窄屏正常流布局、reduced-motion、桌面目录与锚点偏移；桌面结果不能当实体手机验收 |
| 聊天前端 / 协议 | 网站 CI、Node bridge 是否也需独立部署、真实 SSE/错误/停止/重试、会话恢复、两域名跨源配置、许可证归属 |
| Hermes / 记忆 / 模型 | 服务与源码版本、profile overlays、实际工具白名单、主人路由、GLM 主/辅助端点、插件、语音模型、数据库扩展、timer、备份恢复；先核对归档与旧文档差异 |
| 依赖 / 运行时 | `package.json`+锁文件、CI Bun/Node、服务器 bridge Node、Hermes/Python/数据库/模型分别版本；安全 overrides 是否仍需要；第三方许可 |
| SSH / 服务器迁移 | 管理员与 CI 两套登录、主机指纹及 GitHub secret、DNS/TLS、Nginx/helper/bridge/Hermes/记忆、私有备份、磁盘和续费；不关闭严格主机校验 |
| 分支 / 工作树清理 | 是否还有 agent 工作、未提交/未跟踪文件、未推送提交、squash 合并差异、archive 分支、bundle 校验、独立备份；不得仅凭分支名删除 |

### 开工前

- [ ] 阅读本表和相关操作说明；查看 `git status`、分支、worktree，确认他人正在编辑的范围。
- [ ] 记录变更前 SHA / 已安装版本；区分静态发布与独立服务修改。
- [ ] 涉及外部资源时定位真正的账号/仓库/配置，先备份；只记录密钥名称和位置。
- [ ] 有旧记录冲突先核对运行状态，列出仍未知的事项。

### 交付前

- [ ] 对照联动表逐项标记「已更新 / 不适用及原因 / 待处理」，不要只检查当前改动文件。
- [ ] 跑与改动匹配的验证：网站代码走共享 CI；文档检查链接、路径、差异及敏感信息；服务器服务另做安装和功能验收。
- [ ] 网站需发布时检查 Actions 成功与公网两域名目标 SHA；仓库推送、工作流开始、bridge health 都不能单独当最终验收。
- [ ] 记录外部资源操作的结果与证据；未完成的权限、网络、平台审核保持待办。
- [ ] 更新本文件中的资源/边界/待办，并为值得追溯的行为或部署新增 `docs/audits/<日期>-<主题>.md`。
- [ ] 清点工作区与备份，交付实际变更、验证、未完成项和恢复入口；不把私有备份推到公开 GitHub。

### 建议的定期维护（尚未创建自动任务）

- 每次发布后：两域名语言、TLS、`__health`、关键交互；聊天相关更新再做模型与记忆验收。
- 每周：Actions 失败、服务失败、磁盘/共享资源、记忆队列积压、备份最近成功时间；备份未自动清理。
- 每月：依赖与服务器更新、证书自动续期、模型额度/账单、账号权限、域名/云实例续费日期；中文站优先检查百度抓取、收录和中文查询曝光，同时维护 Google/Bing 与 AI 引用准确性；搜索平台未接入时明确记录证据缺口。
- 每季度及迁移前：隔离恢复演练、备份异地可用性、维护清单与运行状态的一致性；复核搜索与 AI 爬虫官方政策，分别检查搜索、用户发起读取、训练用途。尚未创建定时自动任务。

## 7. 仍需跟进的事项

| 优先级 | 事项 | 完成标准 |
|---|---|---|
| 高 | 历史长期记忆源码归档在当前 checkout 中未找到；旧 overlay 与运行记录不一致 | 先核对原本地仓库、bundle 与私有备份的实际保存位置，再选择正式备份/版本管理位置；评审并同步文档/验证器；新机器可按说明重建，不暴露私有配置 |
| 高 | 备份连续性与容量 | 定期验证服务器备份；确定异地自动备份与留存策略；目前 Mac 只是一份快照 |
| 中 | 域名到期与云资源续费/快照策略待补 | 2026-10-10 已核对 Lighthouse 实例 ID、地域、套餐和到期日；2026-10-11 NS 查询确认两域名使用 DNSPod。仍需补注册商、域名到期日、自动续费、解析记录导出、快照策略、告警入口和负责人 |
| 中 | `gh` 账号资料编辑权限尚未完成 | 现有 repo/workflow 权限可管理仓库；账号侧栏已通过网页更新，但保存到 CLI 的 token 仍未确认具备 `user`。需单独完成经明确授权的权限更新并验证；不能把网页显示 Existing access 当作 CLI 凭据已刷新 |
| 高 | 中文站百度接入 / 收录观察 | apex 已验证；手动 14 URL 提交返回当日上限，没有成功回执。用户直接确认网站号 `京ICP备2026004164号-4` 和主体号 `京ICP备2026004164号`；两者均被百度提示暂未查到信息，关闭表单后主体备案号仍显示未填写，未保存成功，不据此否定真实备案。用户随后明确“暂不备案，收尾任务”，百度侧备案登记和反馈按要求暂缓，不再等待材料或继续平台操作；这不撤销或否定既有备案。sitemap 日额度 0 是约 21:10–21:15 的上次结果，本轮未重新检查，未确认恢复。14 URL 和 sitemap 均无成功回执；相关登记/反馈待用户恢复时再继续。平台索引、明确时间范围内 PC/移动查询及抓取表现保留待观察，不创建自动任务。Robots 已检测生效不等于 HTML 实际抓取，诊断也因独立验证码未完成 |
| 中 | 其他搜索平台 / AI 发现维护 | Google 中文两份 XML 实时抓取成功但报告仍 Couldn't fetch、原因未知；既有 SSH 认证失败，未取到请求日志，待平台细节与授权日志访问定位，不直接改 XML/DNS。Bing 已导入两站、提交两份 index/28 候选并完成两首页实时 HTTP 200；两 index 已 Success、中文三子文件 Success，英文子文件明细待更新，其他 26 页未做逐页抓取/索引检查。继续观察详情抓取、索引与查询曝光。两站 AI Performance Beta 在 Microsoft Copilots and Partners、2026-07-11–10-10 的 3M 区间均显示 0 citations/0 cited pages、无查询数据；新接入报告处理中且为样本，不能推广到全平台/全时段或当天 Gemini。见[Bing 接入审计](audits/2026-10-11-bing-onboarding.md)和[后续审计](audits/2026-10-11-search-followup.md)；各平台索引、曝光与引用独立取证 |
| 中 | Node 26 聊天并发测试兼容性 | 2026-10-11 未修改聊天源码；Node 26.5.0 隔离并发测试出现实际 200 / 预期 429，Node 24.19.0 的 21 个 Node 子测试及完整 Bun 测试通过。只读诊断确认保留流式 Response 引用后 Node 26 也正确限流，差异涉及测试响应生命周期与运行时清理行为；后续运行时升级前复核测试。当前不据此改聊天实现，CI 未单独固定 Node 版本，实际结果按各次运行核对 |
| 按需 | SuperGrok 服务器网络与认证 | 网络恢复、官方授权及一次真实推理均验收后才标启用；保留既有 GLM，不自动加付费回退 |

上一轮 `gh auth refresh` 的最终网页授权被自动审批拦截，原因是权限页包含私有仓库、全部用户资料和工作流等广泛范围；尚未得到这组具体范围的新确认。本次仅复核现有权限可读内容，不重试授权，也不把设备码或会话信息写进长期文档。

维护清单降低遗漏风险，但不能替代实际执行。新增任何账号、服务、定时器、密钥、备份或第三方依赖时，都要在本文件补上「作用、权威位置、更新方式、验收、恢复、当前状态」。
