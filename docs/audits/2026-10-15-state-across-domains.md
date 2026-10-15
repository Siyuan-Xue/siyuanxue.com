# 跨域语言切换携带三项页面状态 — 2026-10-15

基线：干净的 `main / 05976b6`，单工作树。全部修改由本次执行者自行完成；未提交、推送或部署，未修改 nginx/server/ops。本文是[主题初版](2026-10-15-theme-across-domains.md)及[操作栏初版](2026-10-15-header-collapse-language-switch.md)的后续记录；旧审计的结果与当时行为不改写成新验收。

## 第 3 项的代码核实

`src/pages/index.astro` → `Bio.astro` → `RomanticPortrait.astro` 是唯一入口，两语言首页各一个组件实例。`romanticMode.ts` 的状态为 `{ active: boolean }`，由该实例的 `romanticPortraitFeature.ts` 闭包持有；不是全站全局图片开关，也没有按图片 ID 保存的状态表。

- 单击主肖像，按需导入 feature，第一次以 `active: true` 初始化；再点击主肖像翻转布尔值。
- 展开显示背后的 `portrait-study` 图片，按需创建 img，复用加载占位、load/error 状态和失败后再次展开重试。
- 点击背后的图片另外打开 PhotoSwipe 灯箱。灯箱开关、缩放、当前图片、动画进度均不携带。
- 核对 `galleryLightbox.ts`、`EssayContent.astro`、`MediaPicture.astro` 及相关页面后，没有发现其他同类 click-to-reveal 开关：图集点击打开灯箱，文章插图直接渲染，媒体占位属于加载状态。未增加逐图状态、gallery/essay 的虚构开关或新的媒体资源。

## Fragment 合同

沿用 `src/utils/themeHint.ts` / `createThemeHint` 名称，扩展同一个自包含 factory；`BaseHead.astro` 继续通过 `inlineThemeScript` 序列化编译后的 JS，并在 head 同步运行 `theme.js`，没有第二份 parser。

| 键 | 唯一有效值 | 发送条件 | 接收作用 / 存储 |
|---|---|---|---|
| `theme` | `light`、`dark` | 明确保存的偏好，或写入失败时当前文档的明确内存选择 | 首帧前沿既有 Safari applyTheme 路径应用，仍只保存 `color-mode` |
| `header` | `open` | 当前操作行展开 | 当前页面视图展开操作行；不写存储 |
| `media` | `shown` | 当前页面的主肖像 `aria-expanded=true` | 首页隐藏图片展开；无肖像页面无作用但仍消费并清理；不写存储 |

- 固定输出顺序为 theme/header/media，按字面 `&` 连接。全默认无 hash；跟随系统的明暗不发送。header/media 只发送非默认值，不定义 closed/hidden 等反向覆盖值。
- 键和值各 percent-decode 一次，区分大小写，不把 `+` 当空格；只接受上述解码后的精确键值。空值、缺少等号、坏编码、二次编码值、未知值无效。重复键（包括同值、编码别名或无值键）只忽略该键，不影响其他有效键。
- 接收只删除有效消费的键；非法、重复、未知键和保留片段的编码、顺序、空 token 原样保留。例如 `#a%20b&header=Open&media=shown&theme=dark&theme=light&x=%2f` → `#a%20b&header=Open&theme=dark&theme=light&x=%2f`。没有剩余片段时移除 `#`。
- `history.replaceState(history.state, '', pathname + search + rest)` 保留 state/path/query、不增加历史条目。原有首个无 `=` 非空 token 锚点规则不变：DOMContentLoaded 后查 ID/旧式 name 并滚动，执行前确认 hash 尚未被其他操作改变。history 不可写时提示留在 URL，控制器继续工作。
- 发送从构建时干净的目标 URL 计算，替换目标链接旧的已知键后追加当前状态，不复制来源页 query/anchor。缺译、草稿、404 等既有回首页映射继续生效；首页展开肖像切换到另一首页可带 media，文章/聊天不会凭空带 media。
- 目标未收到 theme 时仍使用自己的旧明确偏好，否则跟随系统。header/media 无持久化，清理后的 URL 再刷新默认折叠；BFCache 是原页面视图，保留其现有状态并刷新 href。

## 首帧与控制器接管

head 先设置 `<html data-header-hint="open" data-media-hint="shown">`（仅有效键），CSS 据此直接给出展开布局和箭头方向，禁用接管前的展开过渡。短生命周期 MutationObserver 在 SSR 节点解析出现时同步组件类、ARIA、标签、hidden/inert；只观察 childList，在 DOMContentLoaded 做最后同步后断开。已被控制器接管的节点不再被初始化逻辑覆盖。

- 顶栏控制器以 incoming open 初始化，设置根/祖先 header 的状态、`aria-expanded`、双语 label/title、panel inert/aria-hidden；在过渡仍禁用时提交布局，再标记已初始化。后续用户点击仍使用原动画、键盘/Esc/外部点击/目录规则，折叠后按钮立即 inert，窄屏操作行继续占正常布局空间。
- 肖像 head 初始化显示展开位置和加载占位；模块控制器在有效 media 提示下主动走与首次点击相同的按需 import/image 流程，仅初始 reveal 不执行展开动画。不提前打开灯箱，不把隐藏图片加入所有页面的 eager 请求。图片的自然加载仍可能晚于首帧，期间保留原占位，固定 aspect ratio 保留布局。
- 发现并修复新入口下的 import 失败边界：已显示的卡片需停止 loading，显示原错误文案并解除 aria-busy；按钮保留重试入口。实际阻断 feature JS 的浏览器测试先复现 loading 不停，再验证修复。现有图片错误/再次展开重试测试继续通过。
- `window.__siteTheme` / `bindThemeLink` 保留既有名称与消费入口；href 现在读取当前 DOM 的 header/portrait 状态。绑定订阅 `site-theme-change`、`headeractionschange`、`portraitchange` 和 pageshow，storage 仍由共享主题脚本更新并通知。用 aria 状态读肖像，保证动画帧尚未提交时链接已更新。
- 静态 `HeaderActions.astro`、`LanguageSwitch.astro`、聊天 `ChatApp.tsx` 沿用现有绑定，无需修改构建链接或复制逻辑。中键、长按、上下文菜单读取的是真实 href；并非只在 click 临时拼接。

不携带灯箱、目录展开、滚动位置、聊天/草稿或任意其他 UI 状态；不新增 cookie、自动重定向、账号/服务/媒体/依赖。构建 href、canonical、og:url、hreflang、JSON-LD、sitemap 均保持干净。

## 本轮验证

Node **v22.23.3**（按用户指定 fnm，临时 `XDG_STATE_HOME` 在 `/tmp`），Bun **1.4.2**。以下均为本轮重新执行：

| 命令 | 结果 |
|---|---|
| `bun run check` | 113 files，0 errors / warnings / hints，tsc 通过 |
| `bun run test` | 255 pass，0 fail，1659 assertions |
| `bun run build` | 双语各 20 页成功，附带 48 项产物检查通过 |
| `bun run test:output` | 48 pass，0 fail，9170 assertions |
| `bun run test:gallery` | 1 pass，0 fail，346 assertions |

先增加测试并确认旧实现失败，再实现扩展。新增/更新测试覆盖三键合法/非法/重复/编码/未知片段、12 种有效状态组合、按键清理/保留锚点、head 在 body 前应用和 SSR 语义接管、顶栏初始禁用过渡/ARIA/inert、肖像免点击免展开动画、真实 toggle 事件通知、链接响应主题/顶栏/肖像/storage/pageshow、聊天重渲染/卸载、两站全部 HTML 和 SEO/sitemap。初次 check 发现 happy-dom 与标准 DOM 的测试类型差异，已修正；最终检查如上，无新依赖。

### 两 origin 浏览器验证

Chrome **154.0.8037.97** headless，`/workspace/blog-src/ref/node_modules/puppeteer-core`，Node 22 locale previews：英文 **http://localhost:4321**，中文 **http://127.0.0.1:4322**。每场景独立 BrowserContext，localStorage 真正隔离。点击的产品 href 仍为正式 apex；仅 harness 拦截正式目标的导航请求，以 302 映射到另一 preview，保留 path/query/hash，未改产品域名映射。聊天 API 在 harness 中阻断，未请求模型。

通过 **8 组跨 origin 场景 + 10 项补充检查**，无 pageerror 或 React hydration 错误：

1. 双向首页：源站明确 dark、肖像展开、最后展开操作行，真实 href 精确为 `#theme=dark&header=open&media=shown`；目标站预置旧 light，首帧即 dark/open/shown，hash 清空，localStorage 精确为 `{"color-mode":"dark"}`，无 header/media 存储键，灯箱未打开。
2. 双向文章：窄屏系统主题或桌面明确 light，header=open 传递并首帧展开；无肖像/无 media。双向聊天：dark/light 与 header=open 传递，React hydration 后继续保持，输入/渲染无异常。
3. 双向默认：首页两个 UI 状态均折叠、无明确主题，真实语言 href 无 hash；目标为空存储且默认折叠/系统浅色。折叠语言入口不可聚焦，所以该测试直接导航真实 href，并未为“点击隐藏按钮”改变产品规则。
4. 两语言非法值 `#theme=Dark&header=Open&media=Shown&unknown=%2f`：URL 原样、状态默认、无存储写入。
5. 两语言文章 query + 真实第二节锚点 + dark + media=shown + unknown + 非法 header：只清理有效 theme/media，保留锚点原编码、`?keep=%20`、未知/非法键及 `{preserved:42}` history.state，实际滚到标题；不存在肖像，返回 href 无 media。
6. 两语言 404 回首页链接：只带实际 dark/header=open，不带不存在的 media；到另一首页保持 header open、肖像默认折叠。
7. 两语言真实 goBack：**pageshow.persisted=true**，保留原页 header/portrait 展开，重读另一同源页面写入的 light，真实 href 变为 `#theme=light&header=open&media=shown`。随后刷新清理后的 URL，header/media 都恢复折叠，theme 仍是 light。

`evaluateOnNewDocument` 在产品脚本前安装 MutationObserver、rAF 和 paint PerformanceObserver；记录 SSR 到达、首批帧、DOMContentLoaded 和实际 FCP。已核对 html 标记、暗色类、组件状态/ARIA/inert、可见性、箭头布局、header 高度及过渡。初始 header 高度稳定，header/portrait 展开过渡数量为 0；390px 场景另将模块脚本延迟 **600ms**，覆盖脚本尚未接管的首帧。原加载指示器的 opacity/CSS animation 是正常占位行为，独立于展开过渡。

媒体代理边界：原 preview 代理曾出现 TLS/下载延迟，最初首帧验证只有占位，未当作图片加载成功。后续通过公开 HTTPS 读取原媒体（HTTP/1.1 重试，未关闭证书验证），取得 primary WebP、primary AVIF、portrait-study WebP，SHA-256 与媒体清单/文件名匹配。最终 harness 只对这三条请求返回相同字节，其余请求仍走原 preview；双向展开首页的两张 img 均 complete 且 naturalWidth > 0。实际查看的截图使用加载完成后的图片。该本地验证不等于生产跨域导航或生产媒体代理的全面验收。

另用 `/tmp/state-errors.mjs` 阻断实际 feature JS，确认 localized 错误显示、loading=false、aria-busy 清除、原展开意图保留。未添加持久化状态。

### 截图

12 张，分别为 1024×800 或 390×800，全部实际打开查看。最终截图等待图片加载、占位淡出和锚点滚动稳定；首帧证据另在采样 JSON 中，未用静态截图替代首帧测量。文件均保存到用户指定的 `/workspace/blog-src/`，不进入 Git：

| 文件 | 场景 |
|---|---|
| `state-xorigin-en-to-zh-home-1024.png` | 英→中首页，三状态、桌面深色 |
| `state-xorigin-zh-to-en-home-390.png` | 中→英首页，三状态、窄屏深色、延迟模块 |
| `state-xorigin-en-to-zh-essay-390.png` | 英→中文章，header open、系统浅色、延迟模块 |
| `state-xorigin-zh-to-en-essay-1024.png` | 中→英文章，header open、明确浅色 |
| `state-xorigin-en-to-zh-chat-390.png` | 英→中聊天，header open、深色、延迟模块 |
| `state-xorigin-zh-to-en-chat-1024.png` | 中→英聊天，header open、浅色 |
| `state-xorigin-en-to-zh-defaults.png` | 英→中，默认无提示 |
| `state-xorigin-zh-to-en-defaults.png` | 中→英，默认无提示 |
| `state-xorigin-en-invalid.png` | 英文非法值保持默认 |
| `state-xorigin-zh-invalid.png` | 中文非法值保持默认 |
| `state-xorigin-en-anchor.png` | 英文真实锚点与其他 fragment 保留 |
| `state-xorigin-zh-anchor.png` | 中文编码锚点与其他 fragment 保留 |

本机临时证据：`/tmp/state-xorigin.mjs`、`/tmp/state-xorigin-results.json`、`/tmp/state-xorigin.log`；五项检查日志为 `/tmp/state-{check,test,build,output,gallery}.log`。截图副本 SHA-256 核对一致。临时文件与截图不作为长期备份。

## 文件与交付联动清单

| 状态 | 资源与处理 |
|---|---|
| 已更新：实现 | `src/scripts/theme.js`；`src/utils/themeHint.ts`、`themeLink.ts`、`headerActions.ts`、`romanticMode.ts`、`romanticPortraitController.ts`、`romanticPortraitFeature.ts`；`src/styles/header-actions.css`、`romantic.css` |
| 已更新：测试 | `tests/theme-hint.test.ts`、`theme.test.ts`、`header-actions.test.ts`、`romantic-portrait-feature.test.ts`、`chat-app.test.tsx`、`site-output.check.ts` |
| 已更新：维护 | `AGENTS.md`、`docs/MAINTENANCE.md`、主题初版审计的后续链接、本文；核对固定语言、导航图标/顺序、无 JS、SEO、肖像/占位、首帧、ARIA/inert 与聊天前端 |
| 不适用 | 身份/账号/GitHub 资料、正文/媒体清单/上传、域名/DNS/TLS、依赖/锁文件/CI/secret、nginx/server/ops、bridge/Hermes/微信/模型/记忆/服务器数据/备份。无这些资源的修改、安装或迁移 |
| 待处理 / 未验证 | 实体 Safari/iOS/Android、真实屏幕阅读器、移动设备原生长按 UI；生产两域名跨站点击、Actions 和目标 SHA（用户明确不提交/推送/发布）。Chrome 窄屏不是实体手机；真实 href 和焦点语义已测，不冒充平台 UI 验收 |

恢复：按本次 diff 还原上列源码/测试/当前维护约定，保留历史审计、`archive/local-notes-and-hermes-memory-2026-09-16`、未推送提交及本地备份。无新存储需要迁移或清理；`color-mode` 仍兼容主题初版。无需服务器恢复。未来获授权发布时走原双语 Actions，另验收生产 SHA 和真实跨域导航。
