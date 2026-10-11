# 2026-10-11 首页格言出处与引述标点

## 请求与依据

用户指出此前首页简介照抄纯文本，要求整理引述标点并查证格言出处、原话。延续已明确授权的中英文上线范围，本次只修正格言和引导语，保留已确认的第三人称简介事实。

- [斯坦福官方演讲稿](https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says)：页面标明 Steve Jobs 于 2005 年 6 月 12 日发表毕业演讲。结尾的文字版本是 `Stay hungry. Stay foolish.`，两个句号，两个 `Stay` 首字母大写。
- 官方稿说明 Jobs 引用了《The Whole Earth Catalog》封底的告别语。首页不将其署名为 Jobs 原创，也不把编辑 Stewart Brand 直接写成这四个词的已核实个人作者。
- [Whole Earth Index 的 1974 年 10 月《Whole Earth Epilog》目录](https://wholeearth.info/p/whole-earth-epilog-october-1974)可确认该期出版资料；本次 web 工具无法打开其 Internet Archive 封底扫描和 PDF。因此采用斯坦福正式文字稿的标点，不声称核验了纸本封底的大小写或排版。

## 文字处理

中文：

> 他最喜欢的一句话是：“Stay hungry. Stay foolish.”

英文：

> His favorite saying is “Stay hungry. Stay foolish.”

中文用冒号引出完整引文，双引号内保留英文原句的句号，外侧不再重复句号。英文将引文作为 `is` 的表语，使用双引号，不在 `is` 后另加冒号。引导语和引文同段，首页由三段改为两段；原简介首段和分享摘要不变。出处在本记录和交付答复中提供，首页不增加历史说明段落。

## 基线与联动清单

- 开工时 `main` 与 `origin/main` 同为 `ad3962e`，工作区干净，仅一个活动工作树。此前静态 release 为 `b1a0a3919cc323f391afce6a6b873b6a9315bdd9`。
- 已更新：`src/data/site.ts` 两语言格言、本文及 `docs/MAINTENANCE.md`。
- 已核对：`Bio.astro` 沿用现有纯文本段落渲染；首段、分享摘要和 Person 描述不变，所有结构化身份仍来自既有公共资料。
- 不适用：姓名、专业等身份事实没有变更，GitHub 账号、独立主页 README、两仓库 About 和小薛人设无需因引述标点修改。网站 README 与人设中没有该格言副本。
- 不适用：媒体、图集、控件、路由、域名、DNS、搜索平台验证、CI 配置、secret 及独立服务器服务均未修改；本地归档和备份保留。
- 待处理：Actions 与两域名目标 SHA、上线正文和显示结果待发布后补录。

## 本次验证

- `bun run check`：105 个 Astro 文件，0 errors / warnings / hints；TypeScript 检查退出码 0。
- `bun run build`：两语言构建成功；各审计 19 个 HTML 路由；产物测试 34 pass / 0 fail、6702 个断言。
- 额外读取两首页生成 HTML：正文两段，格言与新定稿逐字一致；分享/搜索摘要、ProfilePage 中嵌套的 Person 描述及稳定 ID 均正确。一次性核对脚本最初误用 Person 层级和英文输出路径，按实际模板与构建脚本修正后两语言通过；网站代码没有因此变更。
- 文档相对链接全部可解析，`git diff --check` 无错误。
- 发布前重新读取两域名 `/__health`，均为 `b1a0a3919cc323f391afce6a6b873b6a9315bdd9`，与上一成功静态版本一致。

## 恢复

通过 Git 还原 `src/data/site.ts` 的本次引述改动并走现有双语 Actions。紧急回退可使用工作流 `operation=rollback`，目标为仍保留的上一成功双语 release；执行前确认 `b1a0a3919cc323f391afce6a6b873b6a9315bdd9` 仍在服务器。无需上传素材或重装服务。
