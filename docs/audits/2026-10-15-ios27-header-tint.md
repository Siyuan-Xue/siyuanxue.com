# iOS 27 Safari 顶部颜色续查

日期：2026-10-15。基线 `c75f077`，生产静态版本 `4cadf06604c5d75195cb626683a5efe623f169dc`。用户确认使用 **iOS 27 的普通 Safari 浏览器**，手机顶栏换行已经解决，原生顶部颜色仍不随明暗按钮即时改变。上一轮安全区调整不能记为该颜色问题已解决。

## 已确认的事实与候选原因

- 原换行来自手机 CSS 刻意增加的 48px 顶部留白。上轮删除该设计及纵向/高度动画，同时保留 44px 点击区、去除按钮额外间距、增加真实宽度碰撞检测，空间不足时暂隐姓名。用户已确认效果，本轮不再调整布局。
- 当前共享 header 不透明、sticky、背景跟随主题，但有 `backdrop-filter: blur(0px)`。该声明虽然不改变像素，仍会触发 WebKit 的 backdrop-filter 分支。
- [Apple/WebKit 的 Cocoa 默认值](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm) 中，`defaultTopContentInsetBackgroundCanChangeAfterScrolling()` 对 iOS 的 small-screen UI 返回真，Mac 返回假。iPhone 与桌面/iPad 的取色行为不能视为相同。
- [LocalFrameView.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp) 的固定边缘采样会将带 backdrop filter 的容器标为 Multiple，跳过直接使用背景色；[Page.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp) 的 `updateFixedContainerEdges()` 则根据上述偏好、用户交互及滚动状态决定是否重新采样顶部。这是当前公开主分支的机制证据，**不等于核对了用户所装 iOS 27 的二进制实现**。
- [WebKit 301756 维护者说明](https://bugs.webkit.org/show_bug.cgi?id=301756#c2) 解释固定/粘滞边缘与原生单色延展的关系；[WWDC21 Safari 15](https://developer.apple.com/videos/play/wwdc2021/10029/) 说明动态 `theme-color`。后者并未承诺覆盖后续 Safari 固定边缘取色规则。

本机原生 macOS Safari 27.0.1 用两个独立、未入库 HTML 最小页面做 A/B：仅移除 blur(0px)，点击按钮后正文变暗但原生工具栏仍浅色；保留 blur(0px)，正文与工具栏均变暗。因此不能全站删除该措施。结合用户的 iPhone 反馈与源码，候选原因是原先给所有设备使用同一规避措施，阻断了 iPhone 可持续采样的不透明边缘颜色。

## 本轮修改

- `src/scripts/theme.js` 在 head 首帧前根据 `iPhone` UA 设置 `data-header-tint="live"`。WebKit 的 native UI 偏好没有对应的公开 CSS/JS 能力查询，故这一兼容分支使用设备标识，不按视口宽度区分；旋转不改变它，也不会把窄窗口 iPad/Mac 误判成 iPhone。
- `src/styles/base.css` 仅在该标记下把标准与前缀的 backdrop-filter 设为 none，使 iPhone header 暴露当前的不透明背景；其他设备保留已有 blur(0px)。不增加重排、滚动、强制刷新或定时重绘。
- 原 `applyTheme`、theme-color 配对/覆盖、根背景及 color-scheme、存储与跨域提示、viewport-fit/safe-area、滚动显隐及动画保持。
- UA 识别是有意限制的兼容分支：iPhone 的“请求桌面网站”若使用 Macintosh UA，会保留桌面路径；无 JS 不运行标记，但同样没有手动明暗按钮逻辑。不能据此宣称所有 Safari 模式均已验证。

## 验证与边界

- 主题测试先失败于 iPhone 仍为 blur(0px)，修改后通过；Mac、iPad、Android 的背景/布局/滤镜路径保持，连续浅深切换不累积 meta。已有存储、系统主题、跨域、BFCache 路径测试继续通过。
- `bun run check`：116 文件、0 errors/warnings/hints；`bun run test`：273 pass、0 fail。使用已有 Node 24 / Python 3.12 运行时，没有修改依赖或系统设置。
- 双语构建成功，产物检查 51 pass / 0 fail（9,476 个断言，含顶栏脚本大小约束）。正式构建预览在 390px 的双语首页/文章/聊天共 6 组检查通过：明暗按钮、背景和语言链接提示同步，顶栏高度稳定、页面无横向溢出；这是桌面窄视口验证。
- `bun run test:gallery`：1 pass / 0 fail（346 个断言）；`git diff --check` 通过。
- macOS Safari 27.0.1 打开新构建中文首页，浅→深→浅时页面与原生工具栏均即时更新，未依赖刷新。独立审查未发现阻塞代码问题，认可作为明确待真机确认的兼容候选发布；“请求桌面网站”的 [WebKit UA 记录](https://bugs.webkit.org/show_bug.cgi?id=241322) 已纳入上述边界。
- **iPhone 原生颜色同步仍待用户设备复验，本轮为有源码依据的针对性兼容修正，不能以 UA 测试或桌面测试替代真机结论。** 本机只发现 iOS 26.5 模拟器资料，模拟器应用/枚举不可用；未接受 Xcode 许可、切换系统工具链或下载运行时。

真机验收：加载新版本后，两域名首页、文章与聊天分别浅→深→浅切换；再滚动、返回、跨语言切换和横竖屏验证原生状态区颜色。每次主题切换应即时更新，不应依靠刷新；首次刷新只用于加载已发布的新代码。若仍失败，应记录 iOS 27 的具体构建号与复现录像，再定位实际设备的 WebKit 行为，不继续将模拟验证写成修复成功。

## 联动与恢复

| 资源 | 状态 |
|---|---|
| 双语首页/文章/聊天的共享 head、顶栏、主题测试 | 已更新；布局沿用用户确认有效的上一版 |
| AGENTS、维护总览、原安全区审计 | 已更新当前规则/用户反馈；历史记录保留时间语义 |
| 原生 iOS 27 Safari | 待真机复验，不能确认修复 |
| Actions、两域名目标 SHA | 已通过；生产为 `0d7ae91780b8359ddbdfcfabf5877de0bd91d691` |
| 身份/正文/域名、账号、SEO、媒体、依赖/许可、CI 配置、secret | 不适用：无修改 |
| Nginx/helper、bridge、Hermes、微信、模型/记忆、定时器、存储/备份 | 不适用：未安装或修改独立资源 |

恢复：撤销本轮 `theme.js` 设备标记及 `base.css` 对应覆盖，并同步主题测试/当前规则，通过既有 Actions 发布。不要撤销用户确认有效的手机单行布局，也不需要撤销安全区联动；无存储迁移，归档分支与本地备份不动。

## 发布核对

- 代码提交 `0d7ae91780b8359ddbdfcfabf5877de0bd91d691` 已推送 `origin/main`，使用原 [Deploy production 38749655422](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38749655422) 流程。
- Actions 最终成功：完整共享验证、双语部署/公网检查与 IndexNow 通知均通过。随后仅补充本段验收记录与维护总览，以 `[skip ci]` 文档提交推送；不改变上述静态 release。
- `bash ops/verify-public.sh 0d7ae91780b8359ddbdfcfabf5877de0bd91d691` 已通过：两域名完整 SHA、固定语言与旧照片 HTTP 410。
- 两站正式 HTML 包含 head 里的 iPhone 分支，实际 `Base.fl2kosh9.css` 包含 `:root[data-header-tint=live] .header{backdrop-filter:none}`，基础 header 保留零半径滤镜。构建压缩器去掉冗余的前缀声明并将 blur(0px) 化简为 blur()；首次临时检查因期待原始声明串未匹配，读取实际规则后确认标准属性及分支均存在，没有为此修改产品代码。
- 本次临时服务器和浏览器测试标签页已清理。工作树仍为原 `main`，归档分支、未推送历史及备份未改动。

## 同日后续真机反馈

用户明确确认“目前颜色问题确实已经修复”，因此基本主题同步已得到 iOS 27 普通 Safari 真机反馈。用户另报告顶栏和主页变色时机不同步；网站无背景过渡/延迟，WebKit 原生颜色延展有 100ms 动画，依据与边界见[时序审计](2026-10-15-safari-theme-timing.md)。此确认不扩展为全部滚动、旋转、BFCache、灯箱场景均已验收。
