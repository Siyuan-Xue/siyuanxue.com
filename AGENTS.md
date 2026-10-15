# 项目维护约定

开始修改前阅读 [维护总览](docs/MAINTENANCE.md)，按其中的联动表确定涉及哪些资源。历史工作见 [2026-09-16 总结](docs/WORK-SUMMARY-2026-09-16.md)。

- 先查 Git 状态、分支和工作树。保留他人改动；有并行修改时协调或隔离工作树。未经核对不要删除 `archive/local-notes-and-hermes-memory-2026-09-16`、未推送提交和本地备份。
- 网页代码与文字通过现有 GitHub Actions CI/CD 同步发布两语言。图片、视频原文件及缩略图通过 SSH/rsync 直传服务器 `shared/media/`，不进入 Git 或 CI 静态包；仓库只维护 `src/data/media.json` 中的资源 ID 与元数据。先上传校验，再发布页面引用。具体流程见 `ops/README.md`。
- 推送静态产物不会更新服务器 Nginx/helper、聊天 bridge、Hermes、微信、记忆服务或模型；涉及这些资源时单独说明安装与验收。
- 项目展示名两语言均为 `Pixel Done`，不使用中文译名；保留 `/gallery/pixeldone/` 与实际 GitHub 仓库 URL。
- 当前代码、实际运行状态、带日期的历史记录分别核对；设计计划不等于已实现。旧 Hermes 文档/overlay 的 8 工具和普通 API 端点基线，与后续 12 工具/Coding Plan 记录有差异；不得直接覆盖已安装 profile。
- 新增或修改域名、账号资料、GitHub 仓库、CI 变量、secret、服务、定时器、模型、数据存储或备份时，同步更新 `docs/MAINTENANCE.md` 的位置、更新方式、验证、恢复及待办。身份信息修改要检查网站、GitHub 账号、独立主页 README 和仓库 About。
- 不提交密码、令牌、设备码、私有配置、微信身份 ID、日记或恢复密钥。文档只记名称、路径和非敏感状态；不要为整理清单而读取其内容。
- 保持两域名固定语言、单击肖像展开、无模式提示块、两站灯箱可见英文文案、Lucide 无圆框按钮及旧照片 URL 拒绝，除非用户明确变更需求。
- 顶栏按 2026-10-15 用户明确要求默认只显示姓名和最右的左箭头；展开后操作行向左出现，箭头朝右。文章为目录、首页、聊天、主题、语言、折叠箭头；首页省略目录/首页，普通图集省略目录，聊天为新对话、首页、主题、语言、折叠箭头。语言使用 Lucide `Languages` 无框图标（20px、1.8 描边、窄屏 44×44px 点击区），保留真实链接及目标 `lang`/`hreflang`；图标 `aria-hidden`、无可见文字，英文页 `aria-label`/`title` 为 `Switch to 中文`，中文页为 `切换到 English`。语言固定为操作行最右、紧邻箭头，是「越小、越新越靠左」的明确例外，其他控件继续按该原则及既有相对顺序安排；DOM/键盘顺序与视觉顺序一致。窄屏展开时操作行在姓名下方占据正常布局空间；无 JS 展开导航链接，不持久化展开状态（仅接收当前页面视图的跨域提示）。语言链接在构建时映射到另一固定语言主域名的同路径，缺译/草稿/未知页回退首页，构建时不携带 query/hash；运行时状态提示按下一条执行。首页条目括号只写简短说明，不展示时间；图集正文可保留真实时间。
- 2026-10-15 Task C：窄屏操作行及外层明确 `flex-wrap: nowrap`，按钮不收缩；≤767px 点击区至少 44×44px，≤360px 去掉间距，文章六项含箭头占 264px，在 320px 的 280px 内容宽内右对齐，无需滚动。主题调色板 `theme-colors.css` 在 head 同步内联；每个 applyTheme 路径都设置 html 的背景与 CSS color-scheme。构建输出系统明暗 theme-color media 配对与 `color-scheme: light dark`；只有明确选择与系统不一致时改用单个无 media 标签，一致时恢复原配对，系统变化也须重算此关系。保持唯一 themeHint 实现、原 color-mode、滚动显隐和 blur(0px)；不增加 viewport-fit=cover 或 standalone 状态栏标签。Linux Chromium/WebKit 结果不能视为 iPhone 原生顶栏已修复；证据、真机步骤、恢复见[Task C 审计](docs/audits/2026-10-15-safari-theme-color-2.md)。
- 顶栏视觉动画按 2026-10-15 Task B 使用精确锁定的 `motion@14.2.0`（`motion/mini` + tree-shaken spring/stagger），静态与聊天共用 `headerActionsMotion.ts`：语言侧先行 24ms stagger、单个左箭头旋转至右向、桌面预留真实宽度，手机正常流高度平滑变化；中断从当前值续接，关闭立即 inert，指针打开逐项淡入后可交互，键盘/Tab、reduced-motion、初始 hash 与 BFCache 即时到终点。只变换控件，不变换 header/controls 祖先；不持久化状态。验收需逐帧检查与双语桌面/手机/聊天，顶栏静态 import 图 <8 KiB gzip；许可、参数、恢复及真 Safari 待办见[动画审计](docs/audits/2026-10-15-header-animation.md)。
- 跨域语言切换复用同一 hash 提示，只携带明确的非默认状态：`theme=light|dark`（两站同用 `color-mode`，含存储失败时文档内存选择）、`header=open`（当前操作行展开）、`media=shown`（仅首页单个 RomanticPortrait 的隐藏图片展开布尔值，不是灯箱）。共享 `themeHint.ts` 自包含 factory 解码一次后严格匹配键/值，重复键只忽略该键；只清理有效消费的键，非法/重复/未知键和其他 fragment 字节保留。head 首帧前设置主题及布局标记，SSR 控件的 ARIA/inert/箭头同步，控制器无入场动画接管；无肖像页面忽略并清理有效 media 提示。静态/聊天真实语言 href 在主题、顶栏、肖像变化、pageshow/BFCache 和 storage 后更新，默认不加提示；header/media 不写任何存储，BFCache 保留当前视图，清理 URL 后刷新回到折叠。主题仍经 Safari applyTheme 路径并存储，存储失败保留内存选择；replaceState 保留 history.state、path/query、其他 fragment 和锚点滚动。构建 href、canonical/og:url/hreflang/JSON-LD/sitemap 始终无提示，不新增 cookies 或自动语言跳转；完整规则、恢复与验收见[跨域状态审计](docs/audits/2026-10-15-state-across-domains.md)，[主题初版审计](docs/audits/2026-10-15-theme-across-domains.md)保留历史语义。
- 验证与修改相匹配；网站发布核对 Actions 与两域名目标 SHA，独立服务验证实际能力。仅文档修改检查链接/路径/差异即可，不把旧测试结果写成新验收。
- 交付前使用维护总览的清单，注明已更新、不适用和待处理。值得追溯的改动补 `docs/audits/<日期>-<主题>.md`，保留历史记录的时间语义。

本机 `/usr/bin/git` 曾受 Xcode license 限制，可使用 `/Library/Developer/CommandLineTools/usr/bin/git`；不要擅自接受系统许可。此路径是本机工具提示，不是 CI 或其他电脑的通用要求。

## 全站搜索与 AI 可发现性（2026-10-11 用户意图）

- 网站同时服务人类阅读，以及搜索引擎和 AI 对公开内容的发现、理解、核验与引用。范围覆盖全部现有和未来公开的个人经历、项目、研究、活动、兴趣、文章、图片与视频，不限定三个示例主题或招聘场景。
- 考虑姓名、别名、不带姓名的主题、自然语言问题、跨语言和多媒体查询，以及搜索发现、直接 URL 读取和多页面综合；维护可持续的全站规则，不维护只覆盖个别关键词的白名单。
- 用户明确中文站 `xuesiyuan.com` 重点在百度：优先验收百度的发现、抓取、收录和中文查询曝光；继续维护 Google、Bing 和 AI 跨平台发现，保留已经完成的 Google 验证。各平台状态独立取证，不以 Google 收录或 IndexNow 回执代替百度状态。具体接入能力、实施顺序与结果记入维护文档。
- 搜索治理默认不改变可见正文、页面结构、媒体或交互。2026-10-11 明确授权的纯色背景、静态页下滚隐藏/上滚显示继续保留；2026-10-15 明确追加上述操作栏折叠与跨域语言按钮。顶部、顶栏焦点、操作行展开或手机目录展开时保持顶栏显示；聊天页始终显示。保留 Lucide 无框样式，以本文件更新后的控件顺序为准。后续可见变更以用户明确要求为准。
- 保持稳定路由，不为堆入关键词而更名，尤其保留 `/gallery/pixeldone/`。真实迁移须配套永久重定向、站内链接、canonical、语言映射和 sitemap 更新。
- 元数据、摘要与结构化数据必须由公开页面事实支持；不得增加只给机器人看的额外身份、角色、成果、日期或指标，不把草稿、私人记忆和访客聊天变成公开事实库。
- 分别记录可抓取、已收录、获得曝光和被 AI 引用的证据，不能互相代替或保证任何搜索场景都会出现。搜索/用户发起读取与模型训练爬虫的策略分开管理。
- 本节保存用户目标与维护原则，不代表某个协议、搜索平台验证或上线工作已经完成。具体实现、待办、验证日期和恢复方式见维护总览及当次审计；不将 `llms.txt`、镜像或自定义 AI API 当作无条件要求。
