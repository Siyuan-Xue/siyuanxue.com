# Safari 原生顶色时序检查

日期：2026-10-15。代码基线 `0d7ae91780b8359ddbdfcfabf5877de0bd91d691`，记录前 HEAD `d180be8`。

## 用户反馈与代码位置

用户确认上一轮 iPhone iOS 27 普通 Safari 的颜色同步问题已经修复，另观察到“顶栏的变色时机和主页变色时机不同步”，要求检查是否人为添加毫秒级延迟。

上一轮代码改动在 [0d7ae91](https://github.com/Siyuan-Xue/siyuanxue.com/commit/0d7ae91780b8359ddbdfcfabf5877de0bd91d691)：`src/scripts/theme.js` 增加首帧 iPhone 标记，`src/styles/base.css` 增加对应滤镜覆盖，并更新主题测试。其后的 `d180be8` 只补充发布验收文档；已提交的代码不会显示在未提交差异中。

## 网站时序

- `theme.js` 的点击处理直接调用同步 `applyTheme`，同一次调用更新 root class/data-theme、画布背景、color-scheme、theme-color 与按钮状态；没有 setTimeout、requestAnimationFrame、Promise 或动画等待。
- html、body、page-wrapper 和网页 header 共用 `--bg`，没有背景颜色 transition。header 的 `top 160ms ease` 只控制滚动显隐的位置；按钮获得焦点时该过渡也关闭。
- 本轮在正式中文站查看计算样式：浅色时 html/body/page-wrapper 的 transition-duration、transition-delay 均为 0s，header 为 top/0.16s/0s；切换深色后四层背景均为 rgb(31,30,29)，header 因焦点规则为 none/0s/0s，CSS animation-name 全部为 none。网页侧不存在配置的变色等待时间。

## WebKit 原生时序

核对 Apple/WebKit 公开源码：

- [WKWebView.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm) 的 `_updateFixedContainerEdges` / `_updateFixedColorExtensionViews` 将采样颜色交给原生 `WKColorExtensionView`。
- [WKColorExtensionView.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/Cocoa/WKColorExtensionView.mm) 的 `_updateColor:visible:` 将 `animationDuration` 固定为 0.1 秒，并给背景色添加 `CABasicAnimation`；首次显示直接设置颜色，后续已显示视图的颜色变化经过该动画。
- [WebPageCocoa.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/WebPage/Cocoa/WebPageCocoa.mm) 在图层事务中更新和传递 fixedContainerEdges；原生更新并非网页可以指定同帧提交的 CSS 元素。

因此，若用户观察的是屏幕时间/电池所在的原生区域，网站即时换色与 WebKit 的 100ms 原生过渡可以解释视觉上的先后差异。**100ms 是公开源码中的动画持续时间，并不是网站设置的延迟，也不是本轮对用户手机的实测延迟。** 尚未拿到用户所装 iOS 27 的精确构建与逐帧证据，不能把主分支数值当作其设备的精确测量。该原生动画没有在上述实现中暴露给网页脚本/CSS 的关闭接口。

## 处理、联动与恢复

本轮仅更新维护记录及当前状态，不改变已获用户确认的主题代码，不给页面增加人为延迟。基本明暗同步已由用户真机确认；完整滚动/横竖屏/BFCache/灯箱场景，以及原生与网页的精确帧差，仍未全部验收。

已更新：本审计、iOS 27 顶色审计、维护总览与 AGENTS 当前状态。不适用：网页代码、构建产物、域名/身份/SEO、媒体、依赖/许可、CI/secret、服务/模型/记忆/定时器、存储及备份。本轮只检查文档链接、路径和 Git 差异，不把上一轮测试数字写成本轮新测试。

记录使用 `[skip ci]` 提交推送，生产静态版本继续为 `0d7ae91780b8359ddbdfcfabf5877de0bd91d691`。恢复本轮只需撤销文档差异，不涉及网站或服务恢复。
