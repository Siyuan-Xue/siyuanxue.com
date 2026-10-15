# 网页主题 100ms 渐变

日期：2026-10-16（接续 10 月 15 日 Safari 顶色修复与时序审计）。

## 用户要求与基线

用户已确认 iOS 27 普通 Safari 的基础颜色同步修复有效，随后明确要求网页明暗切换也改为 100ms 渐变，并自动提交、推送。开工时 `main` 和 `origin/main` 均为 `137d1b2`，工作区干净，`git pull --ff-only` 确认最新；实际静态发布基线为 `0d7ae91780b8359ddbdfcfabf5877de0bd91d691`。未移动归档分支、删除备份或覆盖并行改动。

这是在既有同步修复上增加视觉过渡。[上次时序审计](2026-10-15-safari-theme-timing.md) 的“网页无颜色过渡”是此前版本事实。

## 实现与更新入口

| 位置 | 行为与联动 |
| --- | --- |
| `src/styles/theme-colors.css` | 用 `@property` 注册 13 个会随主题变化的颜色；根元素统一 `100ms linear`、`0s` 延迟。背景、正文、边框、聊天强调色和文章脚注共同插值；根元素显式背景也使用相同时序，保持画布/安全区与页面一致。新增颜色时同步注册、明暗/无 JS 调色板及 transition 列表。 |
| `src/scripts/theme.js` | `applyTheme(mode, animate = false)`。点击、系统主题变化、同源 storage 更新启用视觉过渡；head 初始化、跨域 hash 和 BFCache 恢复即时应用。标记表示允许过渡，不表示动画正在运行；不持久化该标记。 |
| `src/styles/article.css` | 脚注颜色移至共享调色板；移除链接/目录的独立 200ms 颜色过渡，避免继承颜色在共享渐变后继续拖尾。悬停/焦点颜色即时反馈，目录原有 300ms 透明度变化保留。 |
| `src/components/chat/chat.css` | 强调色始终引用 `--accent-ui`，避免切换时从常量改为另一个尚在插值的变量导致跳色；浅/深端点保持原色。 |
| `src/styles/base.css` | 新强调色加入现有打印黑色调色板。 |
| `tests/theme.test.ts` | 增加初始化/BFCache 不渐变、实时更新 100ms/linear/零延迟、状态立即生效和 reduced-motion 的回归。原系统/meta/存储/跨域/设备分支测试继续运行。 |

主题 class、`data-theme`、`color-scheme`、theme-color 拓扑、存储、ARIA 和真实语言链接在原事件中同步更新，没有增加 `setTimeout`、rAF 或异步状态切换。只让 CSS 插值颜色。CSS 的中途反向规则从当前颜色续接，返回途中可自然缩短剩余时长，不排队等待旧动画。

`prefers-reduced-motion: reduce` 与打印显式禁用根过渡。首帧不启用渐变，避免已存储深色或跨域提示先显示浅色。无 JS 继续使用系统完整调色板；不支持 `@property` 的旧浏览器不提供调色板插值。原生控件的 color-scheme 和日/月图标仍即时切换。

保留 iPhone 专用取色分支、Mac/iPad 的零半径滤镜、安全区覆盖、手机单行/44px 点击区、顶栏 Motion spring/stagger、滚动显隐及跨域 hint 状态机。不增加依赖或构建脚本。

## Apple/WebKit 依据与边界

- [WebKit 的 WKColorExtensionView 实现](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/Cocoa/WKColorExtensionView.mm) 中原生背景动画时长为 `0.1` 秒；这是公开实现证据，不是对用户设备的精确测量。
- [Apple CAAnimation.timingFunction](https://developer.apple.com/documentation/quartzcore/caanimation/timingfunction?language=objc) 说明默认使用线性节奏；此次网页采用 linear。
- [WebKit Safari 16.4 官方说明](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) 记录 CSS Properties and Values API / `@property`，允许自定义属性插值。

Safari 原生顶区仍有自己的取色与绘制流程。相同 100ms 只能使观感接近，不能保证相同起始时刻或逐帧锁定；页面持续改变取样颜色时，原生动画也可能重新取样。iPhone 真机上的最终衔接仍须实际观察，不用桌面、IAB 或视口尺寸代替验收。

## 本轮验证

- 新测试先在原实现失败（29 pass / 2 fail），加入实现后主题测试 31 pass。Happy DOM 用于状态/样式规则回归，不能证明颜色插值。
- 最终 `bun run check`：116 文件，0 errors / 0 warnings / 0 hints。
- 最终 `bun run test`：275 pass，0 fail，2,243 assertions。
- 最终双语 `bun run build` 成功；其产物检查为 51 pass / 9,476 assertions。
- `bun run test:gallery`：1 pass / 346 assertions，独立真实构建通过。
- 独立只读审查发现并复核解决文章链接拖尾、聊天强调色跳变及脚注背景覆盖，最终可合并。

实际构建的临时副本只加入记录器，通过 UI 点击原主题按钮；rAF 采样计算颜色、读取 CSS transition 的 duration/delay/easing 和 transitionend。记录器与测试面板不进入源码或发布包。

| IAB 逐帧场景 | 结果 |
| --- | --- |
| 英文 1280px：首页、文章、聊天 | 三页初始过渡关闭，点击状态立即变更；html/body/page-wrapper/header 每帧背景一致，正文/姓名/文章链接与目录文字同步；均记录到中间色和 `elapsedTime=0.1`。 |
| 中文：首页 390px、文章 320px、聊天 390px | 同上；每次完整切换采到 13 种背景颜色，过渡 duration 100ms、delay 0、easing linear。 |
| 聊天双向切换 | 强调色连续经过中间色，在原有两端颜色之间过渡，无别名切换闪跳。 |
| 40ms 后反向点击 | 从当时的 `rgb(170, 169, 163)` 续接回浅色，最终状态/颜色一致，无旧动画覆盖新选择。 |
| reduced-motion 规则 | 单元测试以减少动态效果媒体偏好覆盖；浏览器另直接启用产物内对应 CSS 规则，验证无运行中颜色动画、无中间色/transition 事件。未更改用户系统设置。 |

系统 Safari（本机 27.0.1）也通过独立临时标签页实际点击：浅→深、深→浅，14 项颜色过渡的事件均报告 `elapsedTime=0.1`；深色页面与桌面原生顶栏终态已目视核对。这个结果不等于 iPhone iOS 27 真机时序验收。

## 交付清单与恢复

- **已更新：**主题源码、共享颜色、文章/聊天联动、测试、AGENTS、维护总览及本审计。
- **不适用：**身份/域名/账号/仓库地址、媒体文件与清单、依赖/许可/锁文件、CI 配置、Nginx/helper、聊天 bridge、Hermes、微信、记忆服务、模型、secret 和备份。没有独立服务安装动作。
- **待处理：**核对本次 Actions、两域名目标 SHA 后在下方记录；用户 iPhone 实机最终渐变观感尚未确认。
- **恢复：**通过 Git 撤销本轮产品提交并走原 Actions；须一起恢复主题脚本、调色板、文章和聊天引用，避免丢失脚注/强调色变量。无需存储迁移，已有 `color-mode` 和跨域状态格式不变。

## 发布记录

待本轮自动提交推送后的实际发布结果。
