# Safari 主题色同步 — 2026-10-15

基线：`main` / `2bb851d`，开工时工作区干净、仅一个工作树。本次按用户要求只修改本地文件，不提交、不推送、不发布。

## 原因与修复

`Base.astro` 共用 `BaseHead.astro`，后者内联 `src/scripts/theme.js`。原本只有一个无 `media` 的 `theme-color`，不存在媒体查询重复标签冲突；脚本已同步根主题类和两种 meta，CSS 的 html/body/顶栏也已共用 `--bg`。不足是仅原地更新 meta、未监听系统偏好变化，以及 Safari 26 的固定边缘颜色采样不能只靠 meta 控制。

[9 月 14 日审计](2026-09-14-native-theme.md) 曾记录实体 macOS Safari 在不透明吸顶栏下保留旧色、带背景滤镜的半透明栏可更新；10 月 11 日后来按用户要求恢复纯色栏。结合下列 WebKit 资料，**固定边缘采样是当前症状的主要判断，尚未在本次环境重现原生工具栏**；不能把原地修改 meta 一概说成 Safari 不支持。

- **Safari 15 路径：**保留单个无 `media` 的标签，先配置克隆节点再替换原节点，保留两种颜色的 data 属性；避免重复标签和失效引用。官方支持动态修改，WebKit #220944 说明属性变化、插入和移除均应重新计算。替换是兼容性措施，官方没有要求必须替换，也没有保证它能修复 Safari 26。
- **Safari 26 路径：**不透明 `.header` 增加 `backdrop-filter: blur(0px)` 及 WebKit 前缀。#301756 解释固定/吸顶元素的颜色延伸；#319479 报告背景滤镜影响采样，所读 WebKit 源码的 `foundBackdropFilter` 分支返回 `PredominantColorType::Multiple`，跳过该元素的单色路径。因此采用零半径滤镜让工具栏避开该单色采样路径。此为根据实现作出的兼容性推断，非 Apple 正式推荐；#319479 的维护者也未在其 macOS 配置复现。背景仍是完全不透明的原色，没有恢复半透明或可见模糊。
- **统一主题状态：**初始化脚本移至两种 meta 之后，仍在同步 head 中、body 之前执行。有效保存值优先；无效/缺失值跟随系统并监听 `matchMedia` 的 change；手动选择在内存中优先，即使存储读写失败也保留。BFCache 返回重新读取保存值，移除保存值后恢复跟随系统。WebKit 深色模式文档支持 `color-scheme`、CSS 变量和 `matchMedia`；手动优先级沿用本站约定。
- **保留已有背景同步：**根类继续一起切换 CSS `color-scheme` 与 `--bg`，html/body/顶栏保持相同颜色，meta 使用相同色值。测试检查这些实际计算值。无需额外的内联 body 样式、延时、滚动或强制刷新。
- **不增加状态栏标签：**Apple 的 `apple-mobile-web-app-status-bar-style` 文档针对全屏/独立 Web App，不能当普通 Safari 标签页工具栏的任意颜色控制。

## 实际读取的官方资料

均于本次通过网页 fetch/search 或 Apple 官方 JSON 文档读取；Bugzilla 中区分报告者观察、维护者回复和源码依据。

| 资料与 URL | 本次用途 |
|---|---|
| [WebKit: Safari 15](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)；[Apple Safari 15 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-15-release-notes)（[官方 JSON](https://developer.apple.com/tutorials/data/documentation/safari-release-notes/safari-15-release-notes.json)） | theme-color、平台差异和 media 变体 |
| [Apple WWDC21: Design for Safari 15](https://developer.apple.com/videos/play/wwdc2021/10029/) | head 首次读取、JS 动态更新、首个匹配声明及浏览器颜色调整 |
| [WebKit #220944](https://bugs.webkit.org/show_bug.cgi?id=220944)；[WebKit #224389](https://bugs.webkit.org/show_bug.cgi?id=224389) | 插入/移除/属性变化触发重新计算，以及 media 匹配的实现讨论 |
| [WebKit: Dark Mode Support](https://webkit.org/blog/8840/dark-mode-support-in-webkit/)；[Apple WWDC19: Supporting Dark Mode in Your Web Content](https://developer.apple.com/videos/play/wwdc2019/511/) | color-scheme、CSS 变量、系统偏好；meta 不代替页面自身背景 |
| [Apple: Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html) | apple-mobile-web-app-status-bar-style 的作用范围和三个值 |
| [Apple Safari 26 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes)（[官方 JSON](https://developer.apple.com/tutorials/data/documentation/safari-release-notes/safari-26-release-notes.json)） | 已核对；未提供本问题的 meta 替换方案或工具栏即时刷新保证 |
| [WebKit #301756，特别是维护者 comment 2](https://bugs.webkit.org/show_bug.cgi?id=301756#c2) | Safari 26 固定/吸顶元素与页面背景的颜色延伸 |
| [WebKit #302272](https://bugs.webkit.org/show_bug.cgi?id=302272)；[WebKit #319479](https://bugs.webkit.org/show_bug.cgi?id=319479) | 固定元素、背景滤镜对 tint 的影响及证据限制 |
| [WebKit #305546](https://bugs.webkit.org/show_bug.cgi?id=305546)；[对应草稿 PR #60377](https://github.com/WebKit/WebKit/pull/60377) | BFCache/滚动状态会影响背景重采样；meta 无法覆盖所有原生行为，不把未合并 PR 当已发布修复 |
| [WebKit LocalFrameView.cpp 固定版本](https://raw.githubusercontent.com/WebKit/WebKit/9e5059ee0714d223f2a461b40c35cfb5ceffd99f/Source/WebCore/page/LocalFrameView.cpp)（也读取了 [main](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/page/LocalFrameView.cpp)） | `fixedContainerEdges` / `foundBackdropFilter` 分支；源码不等于每个已发布 Safari 的运行状态 |

## 验证与边界

环境为 Linux，Node **v22.23.3**、Bun **1.4.2**。使用用户指定的 fnm 初始化和 `fnm use 22`；沙箱下默认 multishell 目录不可写，额外设置 `XDG_STATE_HOME=/tmp/siyuan-fnm-state`。未改依赖或锁文件。

新增主题测试先在旧实现得到 6 pass / 6 fail（节点未替换、系统变化未处理、采样兼容样式缺失），再修复为 12 pass。测试执行真实脚本与 CSS，覆盖 body 尚不存在时初始化、两种保存值、非法值、反复切换、存储异常、系统变化和 BFCache。它们验证 DOM/CSS 合同，**不模拟或证明 Safari 原生工具栏刷新**。

| 本次命令 | 最终结果 |
|---|---|
| `bun run check` | 100 files，0 errors / 0 warnings / 0 hints；tsc 通过 |
| `bun run test` | 188 pass / 0 fail，1033 assertions |
| `bun run build` | 成功；英文/中文各 19 页，附带 38 项产物检查通过 |
| `bun run test:output` | 38 pass / 0 fail，6994 assertions |
| `git diff --check` | 通过；本审计及维护总览的相对链接/路径存在 |

首次 build 中新增的两语言聊天产物测试误执行了 Astro 的 body hydration 脚本，测试 VM 缺少 `self` 而失败；改为执行待测的 head 初始化脚本后，38 项产物检查通过。未改聊天运行时代码。

**待真机验收：**macOS Safari 与 iPhone/iPad Safari（记录具体版本、标签布局和网站着色设置）分别验证：首页/文章/聊天，首次加载与刷新保留选择，连续明暗切换无需刷新，系统切换不覆盖手动值，滚动/历史返回后的原生工具栏、窄屏目录焦点及弹层。特别检查零半径滤镜在 Safari 26 各版本是否避免旧色；本机没有实体 Safari，未提供新的真机、截图或首帧时序证据，旧审计不能替代本次验收。

## 联动清单与恢复

- **已更新：**共享 head、主题脚本、顶栏兼容样式、单元及双语产物测试、维护总览。本轮检查保留纯色、静态页滚动显隐/顶部/焦点/手机目录锁定、聊天顶栏常显，以及原按钮 DOM 顺序和 Lucide 样式；既有 header-controller 测试通过。目录和聊天滚动区不在滤镜顶栏内部；以后若加入 fixed 子元素须重验其包含块。
- **不适用：**身份/域名/路由/搜索元信息/正文/媒体、GitHub 资料、CI 变量和 secret、服务器/helper/聊天 bridge/Hermes/微信/记忆/模型/数据/备份均未改动。没有媒体上传、外部写入或独立服务安装。
- **待处理：**上述原生 Safari 验收；用户明确本次不发布，因此 Actions 与两域名目标 SHA 验收未执行。未来发布仍走现有双语 CI/CD。
- **恢复：**按本次 diff 撤销 `BaseHead.astro`、`theme.js`、`base.css` 及配套测试即可；没有存储格式迁移，沿用 `color-mode`。若仅滤镜引入兼容问题，可撤销 `.header` 的两条 backdrop-filter 声明并重验。历史审计和本地备份保持原样。
