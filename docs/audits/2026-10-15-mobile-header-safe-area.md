# 手机顶栏单行与 Safari 安全区

日期：2026-10-15。用户要求拉取最新仓库、修复手机展开换行与 iPhone Safari 明暗切换后原生顶区滞留旧色，并自动提交推送。复现截图显示中文网页已暗、系统时间与状态图标所在区域仍为浅色。

## 基线与范围

- 开始时 `main` 干净，从 `3507250` 快进至 `1ec7161000c19c3d8f9345d22fefadcdb0f9b9b8`。仅一个工作树；归档分支、未推送历史与备份未改动。
- 已核对基线 [Deploy production 38731110212](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38731110212) 成功。此前 Task B/C 等审计中的“未发布”是当时事实，不代表本轮开始时的生产状态。
- 仅静态网站及聊天前端样式；没有修改 bridge、Hermes、微信、记忆服务、服务器 Nginx/helper、媒体文件或 CI 配置。

## 原因与实现

### 展开后单行

旧手机布局明确给展开控件增加 48px 顶部留白，形成姓名一行、按钮一行。仅设置 `nowrap` 无法消除这层设计。

`header-actions.css` 与共享 `headerActionsMotion.ts` 取消该留白和纵向/高度动画；≤767px 控件仍为 44×44px，去掉额外间距，文章六项共 264px。`ResizeObserver` 观察姓名、控件和容器实际尺寸，包含字体加载与旋转后的变化；两者无法共存时，展开/关闭动画期间暂隐姓名，完全收起后恢复。空间足够时保留姓名。DOM/键盘顺序、语言位置、焦点/inert、Motion 中断与 reduced-motion 规则保留。无 JS 时显示真实导航链接并保持一行。

### iPhone 原生顶区

已读取的 Apple/WebKit 一手资料：

- [Design for Safari 15（WWDC21）](https://developer.apple.com/videos/play/wwdc2021/10029/)：页面主动变化可更新 `theme-color`；系统偏好可用 media 匹配。
- [Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)：默认视口由浏览器处理安全区，`viewport-fit=cover` 让页面覆盖完整视口；控件必须用 `env(safe-area-inset-*)` 避开遮挡。
- [WebKit 301756，维护者说明](https://bugs.webkit.org/show_bug.cgi?id=301756#c2)：固定/粘滞边缘元素可影响 Safari 26 原生区域的单色延展。
- [WebKit Page.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp) 与 [LocalFrameView.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp)：检查了 `updateFixedContainerEdges`、顶部采样条件及边缘颜色采样/缓存。主分支源码是解释机制的证据，不等于用户手机所安装版本。

基线已经有同步 html 背景、`color-scheme`、theme-color media 配对与显式偏好覆盖，以及 `backdrop-filter: blur(0px)`。本轮保留这些路径，改为全屏视口并使页面背景直接覆盖顶部安全区，以减少对浏览器自动填充顶区的依赖。这是依据官方视口机制采用的兼容方案，**官方文档并未保证它修复所有 Safari 26 原生采样缓存问题**。

`BaseHead.astro` 增加 `viewport-fit=cover`；head 内联的 `theme-colors.css` 声明四个共享安全区变量。`base.css` 为顶栏顶部和正文侧边预留安全区，文章锚点偏移与目录同步；聊天底部输入区及键盘跳转链接、图集 toolbar/caption、肖像灯箱关闭按钮同步避让。`safeArea.ts` 从相同 CSS 变量读取当前 inset，图集 PhotoSwipe padding 与肖像纸框布局随旋转重新计算，避免按钮/图注与图片重叠。无 standalone 专用 meta、主题存储迁移或新增依赖。

## 本轮验证

- 本机 macOS，Bun 1.4.2；完整测试使用已有运行时 Node 24.19.0 / Python 3.12.14。最初沙箱端口限制及系统 Python 版本导致 3 项环境失败，更换到上述环境并允许本机端口后完整测试通过；未改测试来隐藏失败。
- 新顶栏测试先复现手机 paddingTop 非零和缺少碰撞测量，再验证修复。安全区测试先复现图集固定留白与肖像纸框越界，再验证动态 padding 及横竖屏边界。
- 最终 `bun run check` 为 116 文件、0 errors/warnings/hints；`bun run test` 为 270 pass / 0 fail；双语 `bun run build` 成功、产物检查 51 pass / 0 fail（含静态顶栏 <8 KiB gzip）；`bun run test:gallery` 为 1 pass / 0 fail。
- 正式构建 preview 的 24 组本地浏览器检查（320/390/430/844px × 双语 × 首页/文章/聊天）全部通过：展开保持单行与原顶栏高度、手机点击区 44px、页面无横向溢出；可共存时姓名保留，不足时暂隐。开发服务器在并行构建后出现英文聊天 hydration 失败，改用正式构建 preview 验证该页，避免把未初始化控件当作通过。
- 额外用临时、未入库 HTML fixture 将共享 inset 设为竖屏 top59/bottom34、横屏 left44/right44/bottom21，验证实际 CSS/PhotoSwipe 布局。390×600 图集 toolbar 为 y59–119，图片 y123–466，图注 y478–550，互不重叠；横屏聊天侧边从 x44 起、输入区底部留白 21px，键盘跳转链接可见。该测试仅模拟几何安全区，不模拟原生 Safari 状态栏。
- macOS Safari 27.0.1 中基线主题切换即可即时更新；无法复现截图中的 iPhone 原生顶区问题，不能把此结果或桌面窄视口当真机修复证据。

### 真机待验收

在用户原 iPhone/Safari 记录 iOS/Safari 版本；两域名分别测试浅→深→浅、向下/向上滚动后切换、前进后退、跨域语言切换、横竖屏与目录/灯箱打开关闭。核对原生状态区即时颜色及文字可读性、按钮不被刘海挡住，且不依赖刷新。**此项待实际 iPhone 验证。**

## 联动清单与恢复

| 项目 | 本轮状态 |
|---|---|
| 双语顶栏、文章、图集、聊天与主题路径 | 已更新共享实现并验证；iPhone 原生区见待办 |
| 安全区、目录锚点、两种灯箱、无 JS 导航 | 已联动；图片留白有回归测试 |
| `AGENTS.md` / `MAINTENANCE.md` / 本次审计 | 已更新；旧审计保留原时间语义 |
| 姓名身份、GitHub 账号、个人主页、仓库 About | 不适用：无身份或内容事实变更 |
| 域名/DNS/TLS、CI 变量/secret、依赖与许可、媒体上传、数据存储/备份 | 不适用：配置及资源未变更 |
| Nginx/helper、bridge、Hermes、微信、模型/记忆、定时器 | 不适用：不安装或覆盖独立服务 |
| Actions 与两域名目标 SHA | 已通过；发布 `4cadf06604c5d75195cb626683a5efe623f169dc`，见下方记录 |

恢复：通过普通 Git revert 撤销本轮实现并走现有 Actions 双语发布；若仅撤销 `viewport-fit=cover`，须同时撤销本轮安全区 CSS/灯箱 padding 联动，保留原主题状态机。不需要数据库、存储或服务迁移，不重置归档分支或本地备份。公开 `/__health` 与 `ops/verify-public.sh <完整 SHA>` 用于确认恢复目标。

## 发布记录

- 修复提交 `4cadf06604c5d75195cb626683a5efe623f169dc` 已推送 `origin/main`。
- [Actions 38744373587](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38744373587) 全部成功：共享验证、Deploy verified release、IndexNow 通知；公网检查还验证了 725 个媒体文件在两个域名上的 1,450 个响应。
- 本机另行执行 `bash ops/verify-public.sh 4cadf06604c5d75195cb626683a5efe623f169dc` 成功，确认两域名完整 SHA、固定语言和旧照片 HTTP 410。
- 正式中文站 390px：展开时姓名可见、四个按钮同一行，各 44×44px、顶栏高度 76px；head 包含 `viewport-fit=cover`。此为桌面浏览器窄视口证据，不替代 iPhone 原生状态栏验收。
- 目录锚点模拟 top59 时最终标题 y188.75，保留顶部安全区间距。独立代码审查提出的图集图片留白与聊天跳转链接问题均已修复并复核。
- 本次开发/预览进程、临时安全区 fixture 和测试标签页已清理；归档分支与备份未变更。随后仅将这份验收记录及维护总览以 `[skip ci]` 文档提交推送，生产版本保持上述修复 SHA。
