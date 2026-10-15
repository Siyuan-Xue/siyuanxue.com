# 跨域明暗主题一致性 — 2026-10-15

基线：`main / 56df266`，开工时干净、仅一个工作树。全部自行修改；按用户要求不提交、不推送、不部署，不操作 nginx/server/ops。本文取代[顶栏初版](2026-10-15-header-collapse-language-switch.md)中主题提示“可选未启用”的当前状态，保留旧记录的时间语义。

## 实现与 fragment 合同

- 两 origin 仍分别使用 `localStorage['color-mode']`。明确 light/dark（包括存储写入失败时当前文档的内存选择）通过语言链接的 `#theme=light` / `#theme=dark` 传递；系统推导出的颜色不发送、不保存。未携带提示时目标站继续使用自己的明确偏好，否则跟随其系统。没有 cookies 或自动语言重定向。
- `src/utils/themeHint.ts` 是唯一的解析、校验、拼接、清理和锚点提取实现。自包含 factory 不引用外部运行时符号；`inlineThemeScript()` 序列化**已经编译成 JS 的函数**，与原 `theme.js?raw` 拼接，由 `BaseHead.astro` 同步内联。纯函数直接测试、VM 执行真实脚本、双语产物再执行实际内联版本，防止构建时序列化失效。以后若引入外部依赖，必须调整内联方式并重验，不能复制另一份 parser。
- `window.__siteTheme` 仅暴露有类型的 `getPreference()`、`hintHref(href)`。`themeLink.ts` 从干净基准 URL 更新真实 href；静态页在现有 `HeaderActions.astro` 模块绑定，React `ChatApp.tsx` 在 `useLayoutEffect` 绑定并清理订阅。初始加载、手动切换、系统变化、BFCache persisted pageshow 和同源 storage 更新都会保持链接一致。React 服务端 href 保持干净，hydration 后更新，后续草稿输入/重渲染不覆盖它；点击、键盘、中键或链接菜单无需 click 时临时拼 URL。
- fragment 按字面 `&` 分段、首个 `=` 分键值，键和值分别 percent-decode **一次**，不把 `+` 视为空格。只接受解码后键 `theme`、值严格小写 `light` 或 `dark`；`Dark`、空值、未知值、坏编码及多个 theme 键（即使同值）全部忽略，接收 URL 原样保留。`#%74heme=%64ark` 有效；`#theme=%2564ark` 无效。
- 构建链接时先移除已有 theme 键，再追加一个当前明确值；无明确值则不保留旧 theme。path/query 不变，其他 fragment 的编码和顺序原样保留，例如 `#a&theme=light&x=%20` → `#a&x=%20&theme=dark`。这只操作链接自身的原有片段；不复制来源页 query/hash。实际构建语言链接仍是既有干净的固定语言 apex/路径，缺译、草稿、404 等回首页的 URL 同样可附提示。
- 接收时在 body 解析前先保存并通过既有 `applyTheme` 应用有效提示，完全不先读取旧保存值。保留 [Safari 修复](2026-10-15-safari-theme-color.md)的根类、color-scheme、单个无 media 的 theme-color 节点替换。存储错误不会终止应用；写失败期间内存优先，后续成功写入解除这一保护。
- `history.replaceState(history.state, '', pathname + search + remainingHash)` 仅清理有效提示，不增加历史条目；没有剩余片段就不留 `#`。剩余 fragment 的首个非空、无 `=` token 作为锚点，解码后在 DOMContentLoaded 用 ID/旧式 name 找到目标并滚动（保留 scroll-margin）；其他 token 仍原样留在 URL。执行前检查 hash 未被其他操作改变。history 不可写时保留提示，但主题/按钮继续工作。

## 一致性核查与修复

| 检查项 | 发现与结果 |
|---|---|
| 双 origin 保存偏好 | 原 localStorage 天然隔离，语言切换可能重新使用另一站旧值；现以显式 hash 优先覆盖 |
| 保存键与系统监听 | 全站唯一主题实现、同为 `color-mode`；只有 preference 为 null 时响应系统变化，不把系统颜色误写成明确选择 |
| 可读但不可写的 storage | 原 BFCache 会读回旧值并丢弃内存选择；新增 unsavedPreference 保护，提示和手动选择均覆盖此路径 |
| 同源其他标签页 | 原活动页只在 BFCache 返回时重读；新增 storage 事件，主题及链接随同源保存变化/清空更新 |
| 聊天 | 没有独立主题 key 或写入逻辑；data-theme-toggle 由共同 head 代理，现增加共享链接绑定及重渲染/卸载测试 |
| 首页、文章、图集、404、占位页 | 都经 Base → BaseHead；每站全部 20 个 HTML 的真实内联脚本均以提示覆盖旧值，404/草稿样例回首页链接同样加 hash |
| ProbFun | 发现写存储失败时零秒 refresh 会丢失内存选择；在 refresh meta 后立即用同一 hintHref 更新运行时目标，将明确提示继续带给 imathbook。静态 refresh URL、canonical/noindex/目标路径未改 |

内存兜底仅限当前文档；完全禁止存储时，常规整页导航/刷新不会持久化选择。明确主题仍可从当前文档的语言链接继续传递，ProbFun 的既有同源跳转也专门继续携带提示。没有尝试用 cookie、服务器状态或聊天存储绕过这一边界。

## SEO / hreflang 只读核查

未修改 `langSwitch*.ts`、`discovery*.ts`、内容配对或 canonical 策略。`BaseHead` 从 `Astro.url.pathname` 查 discovery，canonical/og:url/JSON-LD/alternate/sitemap 都使用构建路径，与浏览器 hash 无关；HTTP 请求不会携带 fragment。输出测试逐页检查真实 href/meta/schema，并检查四份 sitemap 无 `theme=`。

两语言各 **20 页**，每一页均有 **3 条** `link[rel=alternate][hreflang]`：`en` → siyuanxue.com、`zh-CN` → xuesiyuan.com、`x-default` → 英文站。具体规则是两站同一 canonical 路径：

- 正常首页、聊天、文章、图集为同路径对应页；不是只在可索引页输出。
- `/gallery/probfun/` 的三条 alternate 和 canonical 均指向 `/gallery/imathbook/`。
- 404 HTML 使用 `/404/`；`/wip/`、`/gallery/layout-preview/`、`/gallery/yuheng/` 也有同路径三条 alternate。这五类均 noindex，不进页面 sitemap；其导航语言链接是否回首页由另一套既有发布/草稿规则决定。
- 当前没有实际构建的单语言无对应正文页：`pairEntries` / `pairGalleries` 对非草稿缺译报错，普通草稿不生成；未知页只使用 404 模板。导航 helper 的缺译/未发布/未知路径回另一首页已有单元测试。**SEO alternates 本身没有缺译回首页逻辑**；本次未改变或假装存在该策略。

## 本次验证

Node **v22.23.3**（用户指定 fnm 初始化；临时 `XDG_STATE_HOME` 在 `/tmp`）、Bun **1.4.2**。

| 命令 | 最终结果 |
|---|---|
| `bun run check` | 113 files；0 errors / warnings / hints，tsc 通过 |
| `bun run test` | 246 pass / 0 fail，1580 assertions |
| `bun run build` | 双语各 20 页成功，附带 48 项产物测试通过 |
| `bun run test:output` | 48 pass / 0 fail，9086 assertions |
| `bun run test:gallery` | 1 pass / 0 fail，346 assertions |

额外浏览器检查复现了 ProbFun 在 storage 可读但不可写时，收到 dark 后跳转目标变成系统 light；已补跳转提示传递和双语真实产物回归。

覆盖：纯 helper 的合法/非法/重复/大小写/编码/多片段；head 首帧优先级、存储异常、URL/state 清理、锚点滚动、meta 节点替换、系统监听、BFCache/同源 storage、链接绑定及 React 生命周期；两语言全部 HTML 与 sitemap。首次 check 发现 happy-dom 的 StorageEvent 类型不接受 null，改用实际 null 属性事件夹具；首次 build 揭示组件内新 script 会落入按钮行，已将绑定移至现有顶栏模块，保留行尾 DOM 合同后重跑全部指定检查通过。

## 本地双 origin 浏览器人工检查

使用 `/usr/bin/google-chrome` **Chrome/154.0.8037.97** 与 `/workspace/blog-src/ref/node_modules/puppeteer-core` **25.14.0**，Node 22 启动 `bun run preview`（en:4321）和 `SITE_LOCALE=zh bun run preview`（zh:4322）。实际访问 **http://localhost:4321** 与 **http://127.0.0.1:4322**，是真正隔离 storage 的两个 origin；没有改产品域名映射。

复现流程（本轮已执行）：

1. 每个场景使用独立 BrowserContext；通过 evaluateOnNewDocument 在 A 清除选择、在 B 预置相反的旧选择。使用 emulated prefers-color-scheme，展开操作行并等动画完成，再实际点击主题按钮。
2. 读取真实语言链接，断言仍指向正式另一域名且携带正确 hash。**仅测试脚本**将这一个链接的 origin 改成另一 preview，保留 pathname/search/hash，随后用 Enter 或普通点击导航。系统跟随场景先等媒体变化事件处理完再重写，避免链接刷新覆盖测试地址。
3. evaluateOnNewDocument 在网站脚本前安装 MutationObserver、requestAnimationFrame 及 paint PerformanceObserver。检查首次 body 出现、DOMContentLoaded、首次绘制/FCP 与前几个动画帧的根主题类、color-scheme、theme-color 全部一致，等待实际 FCP 通知后再判定。目标 URL 已清理，localStorage / getPreference / 返回语言链接匹配，canonical 保持正式干净路径。
4. 双向完成首页、文章 `/essay/embodied-agent/`、聊天各一组，共 6 组明确 light/dark；另 2 组无明确偏好，语言链接无 hash、目标 storage 仍 null，按其模拟系统显示明/暗。共 **8 组通过**，所有首帧采样均无错误主题；聊天实际 hydration 完成，无 JS pageerror 或 React hydration 错误。未发送聊天模型请求。
5. 两语言分别加载 `?keep=yes#<真实第二节锚点>&theme=dark&other=%20`，保留预置 history.state；最终 URL 保留 query、原锚点和 other、只清理 theme，正文实际滚入第二节。现有 CSS 使用 smooth scroll，等待标题进入视口后检查并截图，未把动画刚开始的 scrollY 当失败。中文编码锚点亦通过。
6. 两语言各检查 Pixel Done、404、草稿样例回首页及 ProbFun→imathbook；同源新页改为 light 后真正 goBack，**两次 pageshow.persisted 均为 true**，缓存页主题及语言 href 更新为 light。再强制 Storage.setItem 抛错、保持旧 light 值，ProbFun 接收 dark 后仍在 imathbook 首帧保持 dark、URL 清理，内存为 dark 而保存值仍 light。共 **12 项路由/历史/写失败检查通过**。

截图为 **1024×760**，共 **10 张**，已逐张打开查看：明暗背景、顶栏图标、聊天和正文颜色一致，锚点标题可见。首页肖像在部分截图中仍是媒体加载占位；本次不把主题截图作为媒体加载验收。截图先生成到 `/tmp`，再复制至用户指定的 `/workspace/blog-src/`，逐文件 SHA-256 一致；不进入 Git。

| 文件（均在 `/workspace/blog-src/`） | 场景 |
|---|---|
| `theme-xorigin-en-to-zh-home-dark.png` | 英→中，首页明确深色 |
| `theme-xorigin-zh-to-en-home-light.png` | 中→英，首页明确浅色 |
| `theme-xorigin-en-to-zh-article-light.png` | 英→中，文章明确浅色 |
| `theme-xorigin-zh-to-en-article-dark.png` | 中→英，文章明确深色 |
| `theme-xorigin-en-to-zh-chat-dark.png` | 英→中，聊天明确深色 |
| `theme-xorigin-zh-to-en-chat-light.png` | 中→英，聊天明确浅色 |
| `theme-xorigin-en-to-zh-home-system-dark.png` | 无明确值，目标系统深色 |
| `theme-xorigin-zh-to-en-home-system-light.png` | 无明确值，目标系统浅色 |
| `theme-xorigin-en-anchor-dark.png` | 英文锚点与其他 hash 保留 |
| `theme-xorigin-zh-anchor-dark.png` | 中文编码锚点与其他 hash 保留 |

临时脚本、原始首帧/URL/storage/历史测量及日志：`/tmp/theme-xorigin.mjs`、`/tmp/theme-xorigin-results.json`、`/tmp/theme-xorigin.log`。它们是本机验证材料，不是长期备份；步骤和结果保留在本审计。实体 Safari/iOS、生产两域名点击仍未验证。

## 联动清单、边界与恢复

- **已更新：**共享 head/主题脚本、静态与聊天链接绑定、主题/聊天/双语产物测试、AGENTS、维护总览与两份审计；核对固定语言、图标/控件顺序、导航回退、SEO、Safari DOM 合同。
- **不适用：**姓名/账号/GitHub 资料、正文/媒体/灯箱、域名/DNS/TLS、依赖/锁文件/CI/secret、nginx/server/ops、bridge/Hermes/微信/模型/记忆/服务器数据/备份。无媒体上传、服务安装、数据格式迁移；浏览器仍沿用原 color-mode 键。
- **待处理 / 未验证：**实体 macOS Safari/iOS（含原生工具栏即时 tint）、Android 真机、生产两个域名实际点击、Actions 和生产目标 SHA。用户明确本次不发布；Chrome 首帧证据不替代 Safari 原生行为。
- **恢复：**按本轮 diff 恢复 BaseHead、HeaderActions、ChatApp、theme.js 及对应 helper/测试与当前维护规则；保留历史审计、Safari 兼容样式及所有备份。不需要服务器恢复。已接收的 color-mode 仍是旧代码可读的 light/dark；需恢复系统跟随时在各 origin 移除该键并重载。后续授权发布走原双语 Actions，再验收两域名目标 SHA 与真实跨域点击。
