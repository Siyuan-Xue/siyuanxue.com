# 2026-10-12《与光同行》追加公众号链接

用户要求：若《与光同行》条目此前没有给定微信链接，则追加到条目。开工时 `main` / `origin/main` 同为 `304ed33`，工作区干净，仅一个活动工作树；现有双语条目有四条来源链接，仓库 `src` / `docs` 中未找到此次文章的 `mid=2662542551` 或 `sn=e5393827991d54e9858494c6941ef63b`。

## 修改与来源边界

- `src/content/galleries/walking-with-light/zh.json`、`en.json` 的 `links` 数组各追加一条完整 URL。中文入口「微信公众号文章」，英文入口「WeChat article」。保留原有四条链接与顺序。
- 使用用户提供的完整地址，移除 Markdown 展示层的反斜杠转义，保留全部查询参数；不改写为短地址。
- web 工具无法打开文章；随后 Codex 内置浏览器明确返回站点安全策略禁止访问。未采用其他浏览器、间接请求或其他规避方式。入口名称使用中性描述，不声称核验文章标题、作者、发表时间或正文事实，不将文章内容加入简介或元数据。
- 此次为现有来源入口的数据更新，延续网站既有发布授权，经原 GitHub Actions 发布两语言。

## 联动清单

| 项目 | 状态 |
|---|---|
| 双语图集 `links`、既有图集渲染 | 已更新；按真实页面核对新增入口仅出现一次、URL 参数完整 |
| 图集正文、角色、图片、图注、SEO 摘要、首页目录、canonical/hreflang/sitemap | 不适用；没有改动事实、资源、路由或索引状态，沿用现有结构 |
| 媒体原件/缩略图、媒体清单、SSH 直传 | 不适用；仅追加外部链接 |
| GitHub 账号/独立主页 README/About、聊天人设/记忆 | 不适用；没有身份、角色或经历事实变更 |
| 域名、DNS、搜索平台验证、CI 配置/secret、Nginx/helper、独立服务 | 不适用；沿用现有静态发布链路 |
| 维护总览、审计和恢复说明 | 已更新 |
| 验证与发布 | 已完成；本次请求无待处理项，外部文章正文仍按上述未核验边界记录 |

## 本次验证

- 发布前两站 `/__health` 同为 `3c159d95c8a54d65fac0492d8daaee0561bd1e51`。
- `bun run build`：双语构建成功，产物测试 34 pass / 0 fail、6706 个断言。
- 两图集产物的五个相关资料入口逐项匹配双语源 JSON；新增 URL 和标签各出现一次、全部查询参数保留，沿用同页导航及 `noopener noreferrer`，canonical 正确。一次性核对脚本最初误把既有链接导航假设为 `_blank`，核对 `GalleryContent.astro` 后改按实际同页行为验收通过，没有修改链接模板。
- 文档相对链接可解析，`git diff --check` 通过。
- 新版本激活后 `bash ops/verify-public.sh b5df50113d5812d6ab4b20e984c9bcfe047a1190` 通过。两站图集直接请求 HTTP 200，五个资料链接逐项匹配源 JSON、新增完整 URL 各一次、正文与 canonical 正确。本次未打开外部微信入口，未绕过前述浏览器安全限制。
- [Actions 38188122799](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38188122799) 最终 API 状态 completed / success，源码提交为 `b5df50113d5812d6ab4b20e984c9bcfe047a1190`；共享验证、部署和 IndexNow 通知均 success，rollback skipped。CLI 状态监听有一次网络 EOF，重新读取 API 确认工作流整体成功；并非 CI 失败。部署包含两站公网与全量媒体响应头检查；通知成功不代表搜索平台已收录或更新展示。

后续仅维护记录提交使用 `[skip ci]`，静态 release 保持上述 SHA。

## 恢复

从两个 JSON 的 `links` 中移除此新增项，再走现有双语 Actions。紧急回退可选择仍保留的上一成功双语 release `3c159d95c8a54d65fac0492d8daaee0561bd1e51`；执行前确认服务器保留情况。本次不涉及素材或独立服务恢复。
