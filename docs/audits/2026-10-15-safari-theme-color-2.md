# Task C：手机主题画布与操作行

2026-10-15；基线为干净的 `main / 6278d68`，单工作树。全部自行修改，无子代理、commit、push 或部署。未修改 nginx/server/ops。本文补充[首次 Safari 审计](2026-10-15-safari-theme-color.md)，旧验收数字保留为历史。

## 结论与证据边界

**没有在本机复现或证明修复 iPhone 原生奶油色顶区。**已查看 Miles 的截图：正文及顶栏深色，状态区浅色，有明显硬边。截图不能确定具体 iOS 版本、Safari 标签布局、系统主题、网站着色设置或当时资源版本。

代码核对和修改前 Chromium 的 24 组（中文四页型 × 六宽度）测量否定了“CSS 加载后 html 一直是浅色”的假设：html/body/header 都是 `rgb(31,30,29)`，根 `color-scheme: dark`。原 CSS 已使用同一个 `--bg`；并非只给 body 加深色。

可重现的缺口是**早期画布依赖外部 CSS，以及 SSR 默认始终声明浅色 meta**。修改前真实预览阻断外部 CSS 后，暗色 meta 已更新，但根背景仍为 transparent、CSS color-scheme 为 normal。另以 HEAD 原始 bootstrap + 同一 hint factory 的隔离夹具，在 Chromium/WebKit 都复现这组值；新预览同样阻断 CSS 时根背景为 `rgb(31,30,29)`、scheme 为 dark。该实验说明加载前/失败路径缺乏根画布保证，**不是正常加载 FOUC 或 iPhone 原生 tint 因果关系的证明**。

| 假设 | 本次观察 / 决策 |
|---|---|
| (a) Safari 26 固定边缘/页面背景采样 | WebKit 维护者说明支持这一机制；Linux 浏览器没有 Safari UI，原生缓存或采样仍是候选原因，未确诊。 |
| (b) html 持续浅色 | 已加载 CSS 的基线实测不支持；外部 CSS 不可用时根是透明/normal，补齐此缺口。 |
| (c) 首个解析的 theme-color 固定浅色 | SSR 确认如此。改成系统 media 配对，明确相反偏好再覆盖；不能证明 Safari 永远只读一次，官方支持动态更新。静态站没有 cookie/服务端偏好，无法让服务器预知 localStorage 或 hash。 |
| (d) 根 CSS / color-scheme meta | 原 CSS 加载后正确；现在调色板在 head 内联，每条 applyTheme 路径也直接设置根背景及 scheme，消除外部 CSS 依赖。 |
| (e) viewport-fit / safe area / 隐藏顶栏 | 保留 `width=device-width, initial-scale=1`（auto）。WebKit 官方说明 auto 的 inset 已使用 html/body 背景；没有证据要求 cover，贸然改动还须重排目录/横屏/聊天安全区。两个模拟引擎 env(safe-area-inset-top) 均为 0px，真实 inset、rubber-band 未验证。Chrome 隐藏顶栏后 html/body 仍为暗色，回顶部恢复。 |
| (f) 正常首屏闪浅色、hash 延迟 | 原阻塞 head 位置已在 body 前；没有复现正常加载 FOUC。新构建断言 meta/关键调色板/script 在 body 和外部 stylesheet 前；350ms 延迟 CSS 的两引擎采样在 body 不存在时已为正确根色，后续可观察帧也一致。 |
| (g) pageshow / BFCache | 原有重读逻辑保留。新脚本同入口重同步根/两种 meta；Chrome 两次真实 persisted=true 返回与前进通过。Playwright 两引擎另测普通 back/forward，不将后者全称为 BFCache。 |
| (h) blur(0px) | 保留现有两条 backdrop-filter；无新的 iOS A/B 证据支持撤销或增强。它仍是旧审计记录的兼容性推断，不能保证原生工具栏重采样。 |
| (i) standalone status-bar meta | 不添加。普通 Safari 标签页问题不使用独立 Web App 专用标签解决。 |

本次实际查阅的依据：[Safari 15 的 media theme-color](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)、[Apple Design for Safari 15](https://developer.apple.com/videos/play/wwdc2021/10029/)、[WebKit #301756 comment 2](https://bugs.webkit.org/show_bug.cgi?id=301756#c2)、[iPhone safe-area/viewport-fit 说明](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)、[CSS 根画布规范](https://drafts.csswg.org/css-backgrounds-3/#special-backgrounds)。官方机制、实验结果和推断按上表区分；Safari 15 文档不代表 iOS 26 行为保证。

## 实现

- `theme-colors.css` 从 `tokens.css` 分出原调色板，由 `BaseHead.astro` 同步内联。布局/字体 tokens 继续外部加载。无 JS 的系统深色规则使用同一组深色值（测试对比整块声明），使页面与 media meta 一致；没有改原配色。
- SSR 输出两条互斥的 theme-color，分别是 `(prefers-color-scheme: light)` / `(prefers-color-scheme: dark)`，以及 `color-scheme: light dark`。
- 共享 `applyTheme` 设置原主题类、`data-theme`、根 `style.backgroundColor` / `style.colorScheme` 和 color-scheme meta。无明确偏好或明确偏好与系统相同时保留原 media 配对；仅明确偏好相反时移除配对并插入一条无 media 的当前颜色标签。恢复相同时重新连接原配对，不累计节点；覆盖节点仍先配置再替换。
- `matchMedia` 描述系统偏好，不把强制 CSS color-scheme 当成媒体查询结果。双引擎实测强制相反主题后媒体查询仍跟随模拟系统。系统变化即使不改变手动选择，也重新计算配对/覆盖关系。
- 保存值、hash、toggle、system、storage、persisted pageshow 仍只走这一实现；`themeHint.ts` 未复制或修改。只写原 `color-mode`，存储失败保留文档内选择。header/media hash、清理/锚点/ARIA/inert、语言真实 href、SEO 与 Motion 参数保持。

## 操作行：测量与处理

基线在指定宽度没有复现换行，源码已有 flex 的默认 nowrap 和 max-content 行；用户截图也没有展示多行按钮。无法把未知手机环境的现象归因于一个已证实的 wrap 声明。本次把约束显式化：外层 controls 和 row 均 `flex-wrap: nowrap; min-width:0`，panel 和子项 `flex:0 0 auto`，继续右对齐。保留 ≤360px 的零间距与 ≤767px 的 44px 目标。没有缩小点击区、改变图标或加不必要的滚动/渐隐。

| 视口 | 文章六项总宽（含箭头） | 点击区 | 结果 |
|---|---:|---:|---|
| 320 | 264px / 内容宽 280px | 44×44px | 余 16px；单行 |
| 360 | 264px / 内容宽 320px | 44×44px | 单行 |
| 390 | 284px / 内容宽 350px | 44×44px | 4px 间距；单行 |
| 430 | 284px / 内容宽 390px | 44×44px | 单行 |
| 768 | 236px | 36×36px | 桌面同行规则 |
| 1024 | 236px | 36×36px | 桌面同行规则 |

首页 4 项、图集/聊天各 5 项的总宽更小。96 组完整矩阵为六宽度 × 四页型 × 双语 × 明暗；每组折叠/展开截图，程序断言展开项 y 差 <0.5px、无页面横向溢出、手机命中区 ≥44×44、按钮不互叠/不越界/不覆盖姓名与标题、姓名位置不变、ARIA/inert/href 状态一致。另有 24 组 320/767/768px × 四页型 × 双语的七次 45ms 中断、逐帧溢出检查、键盘 Enter/Esc、reduced-motion、跨断点检查通过。未更改 Motion 层或 TOC 逻辑。

## 本次验证

最终指定检查均使用 Node **22.23.3**（fnm）、Bun **1.4.2**。脚本和日志在 Git 外。Playwright **1.64.1** 仅装在 `/tmp/mobile-tools`，WebKit **27.2 / build 2370** 在 `/tmp/mobile-browsers`；用户授权的 `playwright install-deps webkit` 补齐本机 GTK 等运行库，未修改仓库依赖/锁文件或远程服务器。缓存与 fnm 状态使用 `/tmp`。Chromium 为本机 Chrome **154.0.8037.97**；视口模拟不等于 iPhone 操作系统。

| 命令 | 结果 |
|---|---|
| `bun run check` | 115 files，0 errors / warnings / hints；tsc 通过 |
| `bun run test` | 266 pass / 0 fail，1956 assertions |
| `bun run build` | 双语各 20 页；附带 51 项产物检查通过 |
| `bun run test:output` | 51 pass / 0 fail，9476 assertions |
| `bun run test:gallery` | 1 pass / 0 fail，346 assertions |

主题单元与产物测试执行真实 bootstrap，覆盖根背景/scheme、两种 meta、明确偏好与系统相同/相反、系统改变下拓扑重算、无存储/非法值/读写失败、hint 优先、反复 toggle、storage 清除和 BFCache；构建 HTML 检查脚本同步性和相对 meta/内联调色板/body/外部 CSS 的顺序。新增 CSS 单行合同测试；文章样式测试补加载拆出的调色板。原顶栏 import 图 <8 KiB gzip 检查继续通过。

浏览器证据：

- Chromium 和 Linux WebKit 各 **16 组主题流程**（双语 × 首页/文章/Pixel Done/聊天 × 明/暗），另各 2 组无 JS。每流程检查 hash 到达、两个方向的 toggle、系统与明确偏好由不一致变一致再变回、保存值首次加载/reload、真实同源 storage 事件/删除值、系统跟随两个方向、back/forward；根/html/body/header 和唯一有效 meta 全部同色，页面错误数组为空。
- 初始化前安装 MutationObserver/rAF/Paint observer，外部 CSS 延迟 350ms。Chrome/WebKit 都在 body 和外部 CSS 尚不存在时观察到正确根色；所有收集的初始帧一致。Chrome 收到 FP/FCP，WebKit 收到其支持的 FCP。该引擎时序检查没有观察 iOS 原生 UI。
- Puppeteer 另测双语各一次真实 BFCache 返回：`pageshow.persisted=true`，重新读取另一页改过的 light 并保留展开状态；forward 也一致。双向实际点击语言链接，测试 harness 仅把正式目标 origin 换成另一语言 preview，保留 path/hash；到达旧值为 light 的目标后 dark/open 生效并清理 hash。不是正式域名发布验收。
- 双语文章滚动隐藏 header 后根/body 仍 dark，回顶部显示正常。无原生 overscroll、真实安全区或 iOS tint 测量。
- 布局脚本最初拦截媒体，截图出现破图；之后下载公开肖像六份和 Pixel Done 三十份 AVIF/WebP 派生文件、逐项核对清单 SHA-256，只在测试 harness 返回对应原字节，重跑全部首页/图集截图及几何检查、两引擎首页/图集主题和首页无 JS 截图。下载遇到 TLS EOF 后重试，未关闭证书验证。最终首页肖像及截图视口内图集图片加载成功；其余媒体不作为全站验收，未改媒体清单或上传资源。
- 历史测试脚本曾在图集上导航到相同 URL，back 错回 about:blank；改成不同页面后完整重跑两引擎通过。这是测试夹具错误，没有为此修改产品行为。

## 截图与可复查材料

用户指定目录 `/workspace/blog-src/`。**266 张页面截图 + 16 张联系表**；逐文件清单及 SHA-256 为 `mobile-files.txt` / `mobile-sha256.txt`。12 张布局联系表覆盖全部 192 个布局截图，4 张主题联系表覆盖 68 个主题截图；已查看这些联系表、完整的双语手机/桌面/文章/聊天/首页代表图及附加画布/历史截图。联系表只为审阅顶区裁剪，原始 PNG 保留完整视口。

| 文件名 | 数量 / 内容 |
|---|---|
| `mobile-{en,zh}-{home,essay,gallery,chat}-{320,360,390,430,768,1024}-{light,dark}-{collapsed,expanded}.png` | 192；完整布局矩阵 |
| `mobile-theme-{chromium,webkit}-{en,zh}-{home,essay,gallery,chat}-{light,dark}-{hint,system}.png` | 64；390×844 主题流程 |
| `mobile-theme-{chromium,webkit}-nojs-{light,dark}.png` | 4；无 JS 系统配色 |
| `mobile-extra-{en,zh}-{header-hidden-dark,language-arrival-dark}.png` | 4；滚动/跨 origin 到达 |
| `mobile-canvas-{chromium,webkit}-css-unavailable-dark.png` | 2；故障注入下根画布，不是正常页面样式验收 |
| `mobile-sheet-{en,zh}-{320,360,390,430,768,1024}.png` | 12；布局联系表 |
| `mobile-sheet-theme-{chromium,webkit}-{1,2}.png` | 4；主题联系表 |

`mobile-*-results.json` 保存几何/首帧/meta/历史等测量。脚本与五项检查日志在 `mobile-task-c-evidence/`，可依原脚本重跑；这些是本机验证材料，非长期备份或生产发布记录。真实模型请求没有发送。

## Miles 的 iPhone 验收清单（待执行）

先使用包含本次差异的两语言候选站点（或未来经授权发布后的同 SHA 两站）；当前正式站不因本轮本地修改自动改变。记录 iPhone 型号、iOS/Safari 版本、标签栏布局、系统外观、网站着色设置；用普通 Safari 标签页即可，**不需要添加到主屏幕**。至少中文/英文首页、带目录文章、Pixel Done 和聊天都检查顶部原生区域与页面接缝。

1. 系统浅色，展开按钮行，**light → dark**；不刷新，观察状态栏/原生顶部与正文立即同色，截图并记录是否出现奶油色硬边。
2. 紧接着 **dark → light**；重复两轮。再次选择与系统相反的颜色，确认刷新前后均不残留旧顶色。
3. 源站明确选择 dark、展开按钮行，实际点语言图标，目标预先保存 light；到达首屏应 dark/open，hash 清理。反向用明确 light、目标旧 dark 重复；主题正确之外单独观察原生顶部。
4. 在两主题、两语言分别 reload；普通新标签打开同 origin 也应读取保存值。刷新清理后的页面，操作行回折叠，主题保持。
5. 在 A 页选择 dark，去同源 B 页选 light，Safari **后退再前进**；A 恢复为最新 light，BFCache 的原操作行视图保留。再反向颜色重复，检查原生顶部不滞留。
6. 在两 origin 删除仅 `color-mode`（Safari Web Inspector `localStorage.removeItem('color-mode')` 后刷新；不要清聊天数据）。**不点主题按钮**，在系统设置切 dark → light → dark，回 Safari 检查页面和原生顶部同步；语言链接不携带 theme。再做一个手动相反选择，切系统，手动选择应保持。
7. 文章/首页/图集先收起操作行并移出控件焦点，滚动足够距离让 header 隐藏，再上滚/回顶部；两种主题各测，包含顶部轻拉回弹，确认安全区始终同色。展开按钮行时顶栏应保持显示，聊天始终显示。
8. 窄屏展开文章六项及另外三种页型：始终一行，按钮可点、姓名/标题无覆盖；目录/语言/主题/折叠工作。Safari 调大文字或横屏若出现新的宽度边界，记录具体缩放和截图。

真机通过前，本工作只能称为首屏画布/meta/单行约束加固，不能称“iPhone Safari 已修好”。

## 联动清单与恢复

- **已更新：**`BaseHead.astro`、`theme.js`、`theme-colors.css` / `tokens.css`、`header-actions.css`；`theme.test.ts`、`site-output.check.ts`、`header-actions-motion.test.ts`、`article-style.test.ts`；AGENTS、维护总览、旧审计后续入口、本审计与本机证据。双语/主题/首屏/导航/无 JS/ARIA/inert/Motion/SEO 合同均纳入检查。
- **不适用：**身份/账号/GitHub 资料、公开正文、域名/DNS/TLS、CI/secrets、仓库依赖/锁文件、媒体清单/上传、nginx/server/ops、bridge/Hermes/微信/记忆/模型/数据/备份。未增加 cookie、状态存储或服务。
- **待处理：**上述真 iPhone 测试、真实 macOS Safari/Android/软键盘/屏幕阅读器；未来授权发布后的 Actions、两正式域名目标 SHA 与实际语言点击。此次明确不发布，不执行生产验收。
- **恢复：**只还原本轮 diff 的 head/script/CSS 与相应测试；调色板必须一起移回 `tokens.css`，否则旧 head 不会加载颜色。原 `color-mode` 格式不变，无数据迁移；保留唯一 hint factory、Motion、旧审计、归档分支/未推送提交/备份。此恢复不涉及服务器。
