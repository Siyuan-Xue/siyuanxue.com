# 顶栏展开/收起动画

2026-10-15；Task B 续验收，基线 `main` / `3566690`，单工作树，接手时保留上一轮未提交的实现。本轮重读原始要求、复核 diff 并自行修正和重新验收，无子代理；操作范围为本地代码、测试及证据，未操作 nginx/server/ops。生产发布状态与验收由后续 PR/commit 记录。此前 [折叠/语言切换](2026-10-15-header-collapse-language-switch.md) 与 [跨域状态](2026-10-15-state-across-domains.md) 保留其当时语义，本记录只替换视觉动画。

## 选择与实测

采用精确锁定的 **`motion@14.2.0`**：`motion/mini` 的 vanilla `animate`，从 `motion` tree-shake `spring` / `stagger`。静态 Astro 与 React 聊天通过同一 `headerActions.ts` / `headerActionsMotion.ts` 使用它，不引入 React Motion 组件。仅有顶栏的组件入口引用；Vite 自动提取为两者共享的 chunk，不把 GSAP 或图库带入每页。`package.json` / `bun.lock` 同步；`framer-motion@14.2.0`、`motion-dom@14.2.0`、`motion-utils@14.1.1` 是锁文件中的传递依赖。

2026-10-15 从官方文档、源码和 npm registry 核对版本/许可证。Motion 14.2.0 发布于 2026-10-13，anime.js 4.5.0 为 2026-06-22，GSAP 3.15.0 为 2026-04-13；当次 registry 的 latest 均为这些版本。Motion 最近的 [changelog](https://motion.dev/changelog) 还列出 WAAPI spring 中断修复；这次 mini 路径不依赖新增的独立 transform 功能。三项目均有公开文档与版本维护记录；不将发布时间当稳定性保证。

测量环境：Node 22.23.3、Bun 1.4.2、Astro 7.3.2、Vite 8.1.4，生产 minify，Node `gzipSync` 默认压缩级别；下表均为 **字节**，不是官网估算。独立入口使用实际 DOM animate + spring/ease + stagger API；第二组把每个候选的可调用 probe 逐一加入基线共享 controller，运行本项目真实 Astro 英文构建，递归累计 HeaderActions 入口的静态 JS import 图，各 chunk 分别 gzip 后相加。比较构建只衡量引擎接入，未声称每个候选都实现/验收了完整交互；候选构建在 `git archive HEAD` 的 `/tmp/anim-head-baseline` 副本中完成，不 stash/切换/覆盖当前工作树。HEAD 原构建保留在该副本 `dist/`，候选仅写副本 `.build/en/`；最终双语另行重建。probe 源码及脚本保存在本轮证据目录，可重复测量。

| 候选 | 独立 Vite probe gzip | Astro 顶栏图 gzip | 比基线增加 | 许可 / 判断 |
|---|---:|---:|---:|---|
| 原 CSS controller | — | 1,024 | — | 基线 |
| Motion mini + spring + stagger 14.2.0 | 5,398 | 6,328 | 5,304 | MIT；最小的成熟库方案，采用 |
| Motion hybrid 14.2.0 | 22,620 | 23,520 | 22,496 | MIT；支持更完整的 JS 值/独立 transform/速度交接，此顶栏不需要 |
| GSAP 3.15.0，core + CSSPlugin | 27,134 | 28,211 | 27,187 | 标准 no-charge 许可；可复用现有依赖，但当前 GSAP 原本只在灯箱按需加载 |
| anime.js 4.5.0，animate/createSpring/stagger | 14,491 | 15,408 | 14,384 | MIT；能力合适，体积比 mini 大 |
| 手写 rAF spring 数值内核 | 217 | 1,193 | 169 | 项目自有代码；只是弹簧/retarget/stop 内核，不含 DOM、stagger、ARIA、兼容层和测试 |

GSAP 额外核对：tree-shaken `gsap-core.js` 数值动画 probe 为 **19,615 B gzip**，不含操作 DOM 样式所需 CSSPlugin；真实站点现有 core + CSSPlugin chunk 为 **69,559 B raw / 27,041 B gzip**。因此“已安装 GSAP”不代表普通文章已支付其网络/解析成本。没有导入 `gsap/all` 或任何插件集合。

官方依据（本轮已读取）：

- Motion [animate mini/hybrid、spring、stop/cancel](https://motion.dev/docs/animate)、[stagger](https://motion.dev/docs/stagger)、[MIT](https://github.com/motiondivision/motion/blob/main/LICENSE.md)。`stop()` 保留当前值，`cancel()` 回到起点；本实现取样后 stop，不用 cancel 做中断。vanilla 由原生 matchMedia 控制 reduced-motion，无需引入其 React [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)。
- GSAP [to/overwrite](https://gsap.com/docs/v3/GSAP/gsap.to()/)、[killTweensOf](https://gsap.com/docs/v3/GSAP/gsap.killTweensOf()/)、[stagger](https://gsap.com/resources/getting-started/Staggers/)、[matchMedia/reduced-motion](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)、[许可全文](https://gsap.com/community/standard-license/)。2025-05-30 修订的许可允许网站/商业用途免费使用，限制与 Webflow 可视化动画构建能力竞争的工具，不是 MIT；本个人网站属于允许用途。core 的 back/elastic ease 可做弹性观感，不等同于带速度连续性的物理弹簧。
- anime.js [spring](https://animejs.com/documentation/easings/spring/)、[stagger](https://animejs.com/documentation/utilities/stagger/)、[cancel](https://animejs.com/documentation/animation/animation-methods/cancel/)、[scope mediaQueries](https://animejs.com/documentation/scope/scope-parameters/mediaqueries/)、[MIT](https://github.com/juliangarnier/anime/blob/master/LICENSE.md)。cancel 停止当前引擎任务，retarget 可由当前值新建动画；scope 可监听 reduced-motion。

**Miles 的替代选择：**若更看重不新增运行时依赖，可以复用 GSAP（普通顶栏页多约 27 KB gzip）；若极限压缩网络成本优先，可将同一动画接口换成手写 spring，但需自己维护时间步、取消、延迟、样式恢复和 WebKit 边界。已实现 mini 方案，无需再次决策才能使用。MIT 原始声明随静态包发布在 `public/licenses/motion.txt`，涵盖 Motion 系列及 mini 的 framer-motion 实现。

## 最终包大小

续验收重新构建 HEAD 与当前工作树后，两语言数字完全相同，浏览器可缓存共享资源。Node `gzipSync` 默认参数逐 chunk 压缩后求和；不同构建的 chunk 内容/hash 会使 gzip 相差几字节，不沿用旧记录。头部入口图不含其他页面功能脚本；聊天本身的 React/AI SDK 等不计为此次新增成本。

| 产物 | 修改前 raw / gzip | 修改后 raw / gzip |
|---|---:|---:|
| `HeaderActions.astro_astro_type_script_index_0_lang.*.js` | 208 / 166 | 208 / 166 |
| `themeLink.*.js`（Vite 共享 controller + language link + animation） | 2,078 / 858 | 17,070 / 6,800 |
| 合计 | **2,286 / 1,024** | **17,278 / 6,966** |

最终完整行为净增加 **5,942 B gzip（5.80 KiB）**。新增产物回归约束递归检查静态顶栏 import 图 **<8 KiB gzip**，且不得导入 GSAP/lightbox/ChatApp/client。没有放宽旧预算或改变既有图库/聊天隔离检查。

## 行为、时序与中断

- 桌面保持原 DOM/Tab 顺序和语言靠箭头的例外。隐藏行保留自身真实宽度，姓名和右侧箭头位置固定；没有 max-width 估值或裁切。每个按钮从右侧 16px 滑到当前位置并淡入，表现为向左展开。原 ≤767px 第二行断点保留（1024px 是目录桌面断点），768–1023px 仍为同行。
- 打开：`spring duration=.44s, bounce=.16`；`stagger(.024,{from:'last'})`，先语言、再主题等。手机在同一 stagger 上增加 90ms，让箭头先下移避让姓名；项目开始后的 120ms 完成淡入并解除该项 inert/aria-hidden。弹簧随后继续轻微回弹。关闭：所有项同时 120ms 淡出、160ms 滑出，无长队列。
- 单个 Lucide ChevronLeft 放在普通 span 中旋转，不再交换两份 SVG；`0→180deg`，`spring duration=.42s, bounce=.12`。只变换按钮和该 span，不变换 header/controls/panel 祖先，不使用 3D、scale、translateZ 或持久 will-change；保留 fixed TOC 的包含块、Safari 顶栏 blur(0px) 及点击区。
- 手机 `paddingTop:0↔48px` 在正常布局流中用 300ms `cubic-bezier(.33,0,.2,1)` 平滑改变，关闭延迟 80ms；布局不用 spring。姓名不移动，正文连续下移/上移而不覆盖。WAAPI 必须使用 camelCase `paddingTop`；上一轮已修正 kebab-case 被忽略的问题。本轮发现 `base.css` 在导入 `header-actions.css` 后声明桌面 `html` 默认值，使 481–767px 的控制区只有 36px，CSS 终点 40px 与动画 48px 不一致。将窄屏规则改为 `html:root`，所有第二行宽度均保持 44px 点击区与 48px 终点；回归测试先复现 36px，再验证修复，避免收尾回跳 8px。
- 每次 retarget 先读取正在渲染的 computed values，再 stop 所有旧 controls，写回相同的值作为新起点；仍在 delay 的项也一起停止。revision token 排除旧 onComplete，新的动画不排队、不依赖动画结束切逻辑状态。持续位置是保证；mini 的 duration spring 不承诺物理速度连续，hybrid 是更大包的备选。
- 语义层即时更新 `aria-expanded`、data、label/title、panel inert/aria-hidden，并发出原 `headeractionschange`；语言 href 即刻带上/移除 `header=open`。关闭马上 inert（不等待淡出），并遵循原 TOC 释放/焦点返回规则。指针打开时逐项淡入后才可交互；键盘激活直接到终点并聚焦首项；指针打开期间按 Tab/Shift+Tab 先到终点，再由正常 DOM 顺序移动，不阻塞键盘。
- Esc、外部点击、焦点离开都走同一 retarget；TOC 的第一下 Esc 优先权保留。BFCache 恢复当前意图并即时到终点。跨过 767px 断点时结束当前动画，重用 CSS 响应式终点，避免残留手机 padding。
- reduced-motion 初始即跳终点；运行中改成 reduce 立即 stop/settle。控件及其全部后代 `transition:none`，防止站点全局 `.01ms` 规则在 SVG 继承 visibility 时产生额外过渡（上一轮已修复，本轮重新验证）。缺少 WAAPI 同样即时到终点。Motion mini 在缺少 CSS linear() 的旧浏览器退回 easeOut，交互照常；未把这一回退声称为真实 Safari 验收。
- 初始 `#header=open` 的 head CSS/SSR 语义不变，controller 首次调用 instant；hydrate 没有入场动画。默认初始也没有动画。无 JS 时 noscript 同时恢复 panel 和逐项的 opacity/transform，保留真实导航链接。header 状态不写入存储。

## 续验收（全部重新执行）

Node **22.23.3** 经用户指定 fnm 启用，Bun **1.4.2**。Bun 缓存、临时目录和每进程独立的 fnm 状态目录放在 `/tmp`，解决默认目录只读及并发 multishell 名称冲突。接手目录中的 `puppeteer-core` 安装缺失，按其原有锁文件恢复 **25.14.0**。最终结果均来自修正 CSS 后的工作树，不复用中断前测试或截图。

| 命令 | 最终结果 |
|---|---|
| `bun install` / `bun install --frozen-lockfile` | 均成功；537 installs / 612 packages，no changes；`motion` 精确为 14.2.0，锁文件一致 |
| `bun run check` | 115 files，0 errors / warnings / hints；tsc 通过 |
| `bun run test` | 262 pass，0 fail，1716 assertions |
| `bun run build` | 双语各 20 页成功，附带 49 项产物检查通过 |
| `bun run test:output` | 49 pass，0 fail，9178 assertions；两语言顶栏静态 import 图均 6,966 B gzip，低于 8,192 B |
| `bun run test:gallery` | 1 pass，0 fail，346 assertions；隔离双语真实 Astro 图集构建通过 |

复核了语义层与动画层的边界：即时 ARIA/inert/label/href，当前 computed frame 的 retarget、旧 controls stop 与 revision 回调隔离，Tab/键盘不等待 stagger，BFCache/断点/reduced-motion 即时收尾，React hydration/重新渲染/解绑，无 JS 链接以及没有 transform 的 fixed TOC 祖先。生产修正仅为 481–767px CSS 优先级；其余已实现的控制器行为保留。新增三个回归测试：真实 CSS 加载顺序下第二行的 44px 点击区（先红：实际 36px；后绿）、跨断点清除布局残留、stagger 中解绑后停止旧 controls/拒绝迟到回调并移除监听。后两者补覆盖，未为通过测试改动生产逻辑。

### Chrome 真实预览

Chrome **154.0.8037.97** headless，通过本轮新构建的 `bun run preview` 英文 `127.0.0.1:4321` 与 `SITE_LOCALE=zh bun run preview` 中文 `127.0.0.1:4322` 验收。中文预览进程曾退出（143），重启并确认两个地址 HTTP 200 后，将长脚本拆为 matrix/stress/hints × en/zh 六个短批次独立保存结果，全部重新运行成功后汇总，丢弃未完成运行的结果。聊天 API 在 harness 中拦截，未调用生产模型。

- **24 组场景 / 48 张最终截图**：en/zh × 1024/390 × light/dark × 首页/文章/聊天，分别检查折叠与展开。姓名 bounding box 完全一致；无横向溢出；真实键盘 Enter、逐项 Tab 顺序、Esc 焦点返回、聊天重新渲染保持状态通过。
- **8 组压力场景**：两语言 × 两宽度 × 文章/聊天，每组 13 次 30/45/60ms 定时 toggle（合计 104 次），另测中途反向、60ms Esc、60ms 外部点击、30ms Shift+Tab、打开/关闭中往返跨 767px、运行中切 reduce 及恢复动画。每个终点逐项断言 aria-expanded、data、inert/aria-hidden、opacity/transform、padding、箭头、语言 href 的 `header=open`、无动画标记/活动 WAAPI、无残留交互阻塞。真实导航返回 **8/8 次 `pageshow.persisted=true`**，均保持当前展开状态并同步 href。
- **96 次真实鼠标点击**：另 8 组各 12 次 Puppeteer hit-test 点击，实际间隔 44–79ms，全部命中并结束于一致折叠状态；两语言/两宽度聊天的新对话均清空本地测试草稿、收起操作行并聚焦 textarea。
- **12 组 incoming hint + 12 组无 JS**：初始 `#theme=dark&header=open` 的可观察 rAF 均已展开，初始化及 React hydration 的动画调用数为 **0**；消费后 hash 清空、主题按钮及语言真实 href 一致，刷新回到折叠。无 JS 的真实导航链接可见、无 inert，脚本按钮隐藏；手机目录第一下 Esc 释放正文 inert、第二下收起操作行。
- **22 项专项检查**：8 次同一任务内在 0/30/120/300ms 反向，transform/opacity/padding/rotation 起点差值最大 **0**；8 次 767↔768px 精确断点切换；481/600/767px 各 46 个 rAF 采样，点击区 44px、展开 padding 48px，收尾回跳 **0px**；禁用 WAAPI、commitStyles、linear() 的三个 Chromium 模拟回退均可用。这些模拟不能代替 WebKit 验收。
- 最终脚本 **0 pageerror / 0 React hydration error**。本地媒体代理有 TLS 失败，部分首页截图保留肖像占位；本次不将顶栏截图作为媒体加载或生产服务验收。

### 新逐帧证据

使用 CDP PNG screencast，并在页面内用独立 rAF 逐帧记录 computed transform/opacity/paddingTop/width、箭头角度、ARIA/inert、活动动画及姓名/文章标题/正文 bounding box。每组 **49 个采样点**，总计 **196**；采样中位间隔 **16.6–16.7ms**。PNG 捕获间隔中位数也约 **16.6–16.7ms**，静止画面不重复编码；contact sheet 标签时间相对首张 PNG，curve 的 elapsed 相对触发时刻。

| 视口 / 动作 | 新 PNG 帧 | 姓名最大位移 | 正文/文章标题终点位移 | 收尾时间（rAF 观测） |
|---|---:|---:|---:|---:|
| 1024 / open | 35 | 0px | 0px | 553.5ms |
| 1024 / close | 29 | 0px | 0px | 469.8ms |
| 390 / open | 41 | 0px | +48px | 655.9ms |
| 390 / close | 29 | 0px | −48px | 470.8ms |

**共 134 张新 PNG**。四张 contact sheet 及双语首页/文章/聊天代表截图均已实际查看，无姓名覆盖、控件重叠或收尾跳变。姓名/站点标题始终固定；移动端文章标题与正文按原要求随正常流平滑移动 48px，不能将此写成“手机正文零位移”。padding 单调、无弹跳，390px 最大单帧变化为打开 **6.8621px** / 关闭 **6.8927px**。按钮轻微 spring overshoot 为 **−0.1232px**，箭头打开最大角度 **180.5294°**。24ms stagger 的方向为语言侧先行；桌面从语言到目录首次非零 opacity 约为 **20.2/36.7/53.2/86.6/103.2ms**，手机约为 **105.8/122.7/156.2/172.9/206.0ms**（rAF 量化，配置额外延迟 90ms）。没有持久 will-change 或 transform 祖先；收尾活动动画数均为 0。

证据保存在 Git 之外：

- 新帧与每帧 JSON：`/workspace/blog-src/anim-frames/resume-20261015/{1024,390}-{open,close}/`，含 `frames.json`、`curve.json` 与 PNG；使用新子目录，保留原中断运行的帧。
- 新联系表：`/workspace/blog-src/anim-sheet-{1024,390}-{open,close}.png`。
- 48 张最终截图：`/workspace/blog-src/anim-after-{en,zh}-{home,essay,chat}-{1024,390}-{collapsed,expanded}-{light,dark}.png`。
- 新结果：`/workspace/blog-src/anim-{frames,verification,extra,review,pointer}-results.json`。
- 重跑脚本、候选 probe、命令日志、包大小及 SHA-256 清单：`/workspace/blog-src/anim-frames/resume-20261015/`（脚本在 `scripts/`）。先前同名顶层截图/JSON 保留于 `/workspace/blog-src/anim-previous-20261015/`。这些本地证据不是生产部署记录或长期备份。

**尚未验证：**真实 macOS Safari、iOS WebKit、Android 真机、真实软键盘、屏幕阅读器，以及生产部署、两域名真实跨域导航、Actions 与目标 SHA。部署验收由后续 PR/commit 跟进记录；本轮不提交、不推送、不发布。

## 交付联动与恢复

- **已更新：**`HeaderActions.astro`、`chat/ChatHeaderActions.tsx`、`BaseHead.astro`，共享 controller/新 motion 层、header CSS，controller/动画/产物测试；package/lock/MIT 声明；AGENTS、维护总览、本审计及旧审计的后续入口。检查首页/文章/聊天、双语、明暗、无 JS、TOC、语言 hint 与原 Safari 布局约束。
- **不适用：**身份/账号/GitHub 资料、正文/媒体/灯箱逻辑、域名/DNS/TLS、CI/secret、nginx/server/ops、聊天 bridge/Hermes/微信/模型/记忆/数据存储/备份；没有新增服务安装、媒体上传或数据迁移。
- **待处理 / 未验证：**真实 macOS Safari / iOS WebKit、Android 真机、屏幕阅读器；生产两域名导航、Actions 与目标 SHA；部署验证由后续 PR/commit 跟进记录，本地预览不算部署验收。Chrome 的窄视口不等于真机验收。
- **恢复：**按本次 diff 还原组件、controller/CSS、测试及 `package.json`/`bun.lock`，移除仅本次引入的 Motion 声明文件后按原锁文件安装；恢复 3566690 的 CSS 动画即可。保留此前跨域提示、主题、肖像、归档分支、未推送提交和本地备份；无需任何服务器恢复。后续发布仍用现有双语 Actions，PR/commit 跟进记录工作流结果、两域名目标 SHA 与真实跨域导航。
