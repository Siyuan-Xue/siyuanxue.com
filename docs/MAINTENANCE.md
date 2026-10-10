# 维护总览与更新清单

维护负责人：Siyuan Xue / 薛思远。整理日期：2026-09-16。

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
| GitHub 个人主页仓库 | [Siyuan-Xue/Siyuan-Xue](https://github.com/Siyuan-Xue/Siyuan-Xue) 的 `README.md` | **独立仓库**，网站提交不会更新它。可用 `gh` Contents API 或单独 clone 修改。本次核对 |
| GitHub 账号资料 | [公开主页](https://github.com/Siyuan-Xue) / [Profile 设置](https://github.com/settings/profile) 的姓名、Bio、Website | 与主页 README 是两种资源；本次通过 API 核对已有更新。账号编辑 CLI 权限见第 7 节 |
| 两仓库的 About | 仓库 description、homepage；网站仓库另有 topics | `gh repo edit` / 仓库设置；与两个 README 不自动同步。本次核对 |
| 本机 GitHub CLI 登录 | `/opt/homebrew/bin/gh`；本轮使用 macOS Keychain 中的既有凭据 | `gh auth status` 检查账号/权限；不打印或复制 token。重新登录不会自动改变 README 或账号资料，权限缺口见第 7 节 |
| 中文域名 | `xuesiyuan.com`；`www.xuesiyuan.com` 跳到其 apex | DNS、TLS、Nginx、站点元数据一起维护。固定中文，不按浏览器语言判断 |
| 英文域名 | `siyuanxue.com`；`www.siyuanxue.com` 跳到其 apex | 固定英文；语言按钮指向对应译文。上述域名路由有部署记录 |
| 旧域名 | `xuesiyuan.com.cn` 及 www 已退出本站配置 | 不作为当前入口；退役不等于注销域名或关闭续费 |
| 域名注册与 DNS | 注册商/DNS 控制台才是续费、解析记录的权威来源 | **待补**：服务商、账号入口、到期日、自动续费、完整解析导出；不因服务器在腾讯云就推定域名也在腾讯云 |
| 腾讯云 Lighthouse | Ubuntu 24.04 / Nginx；当前记录 IP `82.156.77.131` | 管理员 `ubuntu`，CI `deploy`，SSH 22；腾讯云控制台 OrcaTerm 为备用。实例 ID、地域、套餐、续费日与快照策略待补 |
| TLS 证书 | 两 apex 分别管理含自身 www 的证书；`/etc/letsencrypt/` | Certbot 自动续期及 Nginx reload hook；见 [HTTPS 运维](../ops/HTTPS.md)。当前有效期和最近续期结果需定期查证 |
| Google Search Console | [控制台](https://search.google.com/search-console) 管理归属验证、sitemap、收录/查询词 | 本轮未完成账号归属验证与提交；不能声称已经接入或排名第一 |
| 百度搜索资源平台 | [链接提交](https://ziyuan.baidu.com/linksubmit/index) | 本轮未完成归属验证/提交；未配置推送令牌 |
| Bing Webmaster Tools | [控制台](https://www.bing.com/webmasters/) | 本轮未完成归属验证/提交；未配置 IndexNow 密钥 |
| SEO 公共入口 | 每个域名的 `/robots.txt`、`/sitemap-index.xml`、`/rss.xml`；HTML canonical / hreflang / JSON-LD | 源码构建生成，免额外平台认证；可被发现不等于已收录或有固定排名 |

注册商、实例和搜索平台的缺项只需补非敏感信息；账号密码、证件、付款信息不要写入公开仓库。

## 3. 网站发布链路及维护边界

源码入口：[站点资料](../src/data/site.ts)、[页面元信息](../src/components/BaseHead.astro)、[构建脚本](../scripts/build.mjs)、[依赖和命令](../package.json)。文章按 `src/content/essays/<slug>/{en,zh}.md` 或 `src/content/posts/<slug>/{en,zh}.md` 配对。两语言必须一起发布。

运行要求以 `package.json`、`bun.lock` 和工作流为准；本次基线为 Bun 1.3.14、Node ≥22.12。Astro 静态生成页面，聊天单独使用 React/AI SDK；PhotoSwipe/GSAP 按需加载，字体本地托管。无需为了维护另外引入 CMS。

图片生成的最终结果应作为仓库资源保存，提示词与生成依据放在对应审计记录；临时预览图、浏览器缓存和工具会话不是备份。升级 PhotoSwipe、GSAP、Lucide、Fontsource 或适配的 AI Elements 代码时，一并检查版本、许可证和归属说明。

2026-10-08 悬停反馈调整：共享 `src/styles/tokens.css` 中的 Claude 粘土色系；悬停统一使用 `transition: none` 即时响应（已按后续要求取消80ms），覆盖首页、文章目录/正文与聊天控件；明暗模式分别使用可读的交互色，键盘焦点同步反馈。已通过[生产Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37717307878)发布 `8d902f66a258e551fe414361160241bafc0af504`，两域名目标SHA、固定语言、HTTP/www跳转与旧照片410检查通过；更新、验收边界与恢复见[悬停反馈审计](audits/2026-10-08-hover-feedback.md)。

同日聊天布局调整已随上述版本发布：消息区和输入区共用主页的 `--narrow` / `--page-pad-x`，欢迎与对话状态宽度一致；中文问候与用户确认的英文问候更新，线上两站顶栏顺序核对为「首页、新对话、主题」。中文站完成一次真实回复，英文站完成只读UI检查；不将其当作模型和记忆服务的全面验收。验证及边界见[聊天宽度与问候审计](audits/2026-10-08-chat-width-greeting.md)。后续补审计的 `[skip ci]` 文档提交不改变该静态release SHA。

同日后续用户明确最终顶栏顺序为「新对话、首页、主题」。已交换前两个按钮并通过[Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37718314174)发布 `5aa16cffdd6eaa9b50264ba8701cdee679f669e5`，两域名SHA、语言、跳转、旧照片410及生产浏览器图标顺序均核对通过。验证与恢复见[按钮顺序修正审计](audits/2026-10-08-chat-header-order.md)；上段保留此前版本的验收事实，不代表最终顺序。

同日图集与博客调整已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/37725358463)发布 `24b3a57c1e666d7a1b8f824cb5937deb0b51f3af`，两域名目标 SHA、首页顺序、旧文章链接和草稿隔离均核对通过：首页顺序为简介、项目、研究、兴趣爱好、博客；博客合并长短文，保留 `/essay/`、`/post/` 及 RSS 身份。项目和活动素材未齐时显示「整理中」，原外链保留在 `src/data/site.ts`，首页不外跳。图集源文件为 `src/content/galleries/<slug>/{en,zh}.json`，图片由 Astro 本地资源处理；完整公开对生成 `/gallery/<slug>/`、独立封面及 `ImageGallery` 元信息，任一语言草稿均不公开。更新步骤、验证与草稿恢复见[图集作者指南](GALLERIES.md)，本次边界与验收见[图集与博客审计](audits/2026-10-08-gallery-blog.md)。`layout-preview` 在该次发布中仍仅开发环境可见，不是真实成果；待补真实图片与参与事实后再制作正式图集。

2026-10-10 用户明确要求占位预览也上线以查看效果。本次将 `/gallery/layout-preview/` 设为固定公开预览：保留双语示意说明、`draft: true` 与 `noindex`，不进入首页项目列表或 sitemap；其他普通草稿仍不生成生产页面。已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38013892959)发布 `5040c31a6a66f1e5d03e3507380d7f065eb6abeb`，两域名目标 SHA、预览 200、四张图片与图注、noindex、canonical/hreflang、资源与跳转均核对通过，中文线上灯箱可打开、切图和关闭。位置与更新步骤见[图集作者指南](GALLERIES.md)，本次验收、发布与恢复记录见[公开图集预览审计](audits/2026-10-10-gallery-preview.md)。

同日后续要求将七个现有条目全部接入各自图集。该轮在 `codex/all-gallery-previews`（源码基线 `3fdf802`）完成实现：`src/content/galleries/<slug>/{en,zh}.json` 使用 `draft: false`、`preview: true`，复用四张明确标注的抽象占位图，沿用真实标题、已知年份与既有资料链接，不补造角色或贡献。首页指向各自稳定地址，条目预览公开但 `noindex`，sitemap 依据内容 JSON 的草稿及预览状态排除，无需维护七个 slug 的硬编码名单。`layout-preview` 继续是草稿公开的固定例外，仍不进首页或 sitemap；普通草稿仍不生成。以后补齐真实素材与参与事实，将双语 `preview` 改为 `false` 并保持 `draft: false`，即可在原址转为正式图集并进入 sitemap。本轮类型检查、测试、双语构建及本机首页到灯箱流程已通过；已通过[生产 Actions](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38015691697)发布 `afa2b2142ec96ceb4ce9ade59636fc87814f8fb5`。两域名目标 SHA、每站七个入口及七个图集页、语言、图片/脚本/样式资源、元信息和跳转均核对通过，中文生产浏览器完成首页至活动图集再返回。更新、验证和撤下步骤见[图集作者指南](GALLERIES.md)，新验收证据见[全部条目预览审计](audits/2026-10-10-all-gallery-previews.md)。

2026-10-10 后续新增 BNDS.life 正式项目图集，来源为用户确认的 2026 年 9 月一周开发经历及五张真实网站截图。内容位置为 `src/content/galleries/bnds-life/{en,zh}.json` 与同目录 `images/`，首页关联在 `src/data/site.ts`；项目资料链接为 [BNDS.life](https://bnds.life) 和 [公开源码](https://github.com/Siyuan-Xue/bnds.life)。双语页面使用 `draft: false`、`preview: false`，进入 sitemap；更新与恢复沿用[图集作者指南](GALLERIES.md)。本轮验证与发布结果见 [BNDS.life 图集审计](audits/2026-10-10-bnds-life-gallery.md)，当前待本轮验收回填。该项目的域名和服务仅作为资料链接，此次没有修改其配置。

### GitHub Actions

- [CI 工作流](../.github/workflows/ci.yml) 调用 `bash ops/verify.sh`，完成类型、行为、部署脚本、隔离 Nginx、双语构建及产物检查，再打包同一份产物；Actions artifact 保留 7 天，不能当长期备份。
- [生产工作流](../.github/workflows/deploy.yml) 在 push `main` 后运行；`production` 并发不主动取消前次发布。上传已验证包及校验和，激活版本，验证公网两域名，最后保留 5 个成功 release。
- 手动运行支持 `operation=deploy` 或 `rollback`；回滚需要保留版本的完整 40 位 SHA。`migrate_domains=true` 仅用于已有管理员准备的首次迁移，日常不用。
- **推送网站代码只自动发布静态产物。**不会自动安装新版 Nginx 配置、`siyuanxue-release`、Node 聊天桥接、Hermes profile/plugin、记忆服务、模型或数据库。
- 用户指定网站通过现有 GitHub CI/CD 发布；不另行用 SSH 手动上传和切换网站版本。SSH 可用于必要的独立服务维护和诊断。

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
| 图集 / 首页内容目录 | `src/content/galleries` 双语 JSON、真实角色/介绍/图片/alt/图注、来源资料与 `site.ts` 的 gallerySlug、双语 preview 一致、草稿隔离、首页站内入口、封面/canonical/hreflang/ImageGallery；sitemap 按内容 draft/preview 状态筛选；`bun run test:gallery` 在临时目录验证正式图集可索引，生产产物测试验证条目预览可由首页进入但 noindex/不进 sitemap、固定版式样例额外不进首页、普通草稿不出页；不改变博客 RSS 身份 |
| 域名 / 路径 | 注册与 DNS、www/HTTP 跳转、两个证书、Nginx 根目录、SEO/RSS/sitemap、语言链接、聊天 ALLOWED_ORIGINS、CI 变量与域名校验、GitHub 各处链接、搜索平台属性 |
| 肖像 / 动效 | 正常肖像与占位肖像区分、人物比例/压缩/alt、单击展开、刷新折叠、灯箱可访问性、两站可见英文文案、reduced-motion、旧照片永久拒绝、图片缓存；不恢复状态标语块 |
| 明暗 / 顶栏 / 导航 | 首页/文章/聊天、两种语言、明暗初次加载/切换/返回、70% 背景与图标可读性、Lucide 无圆框按钮、键盘/触屏/窄屏；桌面结果不能当实体手机验收 |
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
- 每月：依赖与服务器更新、证书自动续期、模型额度/账单、账号权限、域名/云实例续费日期、搜索收录数据（接入平台之后）。
- 每季度及迁移前：隔离恢复演练、备份异地可用性、维护清单与运行状态的一致性。实际频率由负责人确定。

## 7. 仍需跟进的事项

| 优先级 | 事项 | 完成标准 |
|---|---|---|
| 高 | 长期记忆源码仅本地归档；旧 overlay 与运行记录不一致 | 选择正式、合适的源码备份/版本管理位置；评审并同步文档/验证器；新机器可按说明重建，不暴露私有配置 |
| 高 | 备份连续性与容量 | 定期验证服务器备份；确定异地自动备份与留存策略；目前 Mac 只是一份快照 |
| 中 | 域名和云资源到期信息缺失 | 补全注册商、DNS、实例 ID/地域、到期日、续费状态、告警入口和负责人 |
| 中 | `gh` 账号资料编辑权限尚未完成 | 现有 repo/workflow 权限可管理仓库；账号侧栏已通过网页更新，但保存到 CLI 的 token 仍未确认具备 `user`。需单独完成经明确授权的权限更新并验证；不能把网页显示 Existing access 当作 CLI 凭据已刷新 |
| 中 | 搜索平台接入 / 收录观察 | 用户愿意完成归属验证后，分别提交两域名 sitemap，观察查询词、展现/点击、收录与错误；SEO 本身不保证姓名搜索第一个词条 |
| 按需 | SuperGrok 服务器网络与认证 | 网络恢复、官方授权及一次真实推理均验收后才标启用；保留既有 GLM，不自动加付费回退 |

上一轮 `gh auth refresh` 的最终网页授权被自动审批拦截，原因是权限页包含私有仓库、全部用户资料和工作流等广泛范围；尚未得到这组具体范围的新确认。本次仅复核现有权限可读内容，不重试授权，也不把设备码或会话信息写进长期文档。

维护清单降低遗漏风险，但不能替代实际执行。新增任何账号、服务、定时器、密钥、备份或第三方依赖时，都要在本文件补上「作用、权威位置、更新方式、验收、恢复、当前状态」。
