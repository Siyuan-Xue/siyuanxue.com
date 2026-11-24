# 2026-11-24 全站文案第三人称统一与首页个人简介更新

## 用户确认与范围

2026-11-24 用户要求将个人网站文案统一为第三人称叙述，并重写首页个人简介，随后明确授权同步「信息与通信工程学院硕士」去向、补齐本机依赖并隔离提交推送发布。全部文案改动均经澄清、12 项逐条审阅及首页简介讨论后由用户明确批准：

- **首页个人简介与摘要（`src/data/site.ts` 中 `bio` 与 `description`）**：采用用户批准的精修 A 版本，保留第三人称，补充将在信息与通信工程学院继续攻读硕士学位的去向，并将 `“Stay hungry. Stay foolish.”` 去掉引导语独立成段：
  - 中文：`薛思远就读于北京邮电大学智能科学与技术专业，并将在信息与通信工程学院继续攻读硕士学位。他热衷于探索未知，追求极致与完美。` / `“Stay hungry. Stay foolish.”`
  - 英文：`Siyuan Xue studies Intelligence Science and Technology at Beijing University of Posts and Telecommunications, and will continue his master’s studies at the School of Information and Communication Engineering. He is driven to explore the unknown and pursue excellence and perfection.` / `“Stay hungry. Stay foolish.”`
  - 首页 `Person` 结构化数据（`BaseHead.astro` 自动读取 `site.bio.lead`）与 `site.description` 分享/搜索摘要同步一致。
- **图集角色标签与 11 组双语图集（`src/data/site.ts` `gallery.role` 及 `src/content/galleries/*/{zh,en}.json`）**：全部正文、英文时期、角色与图注统一为第三人称（图集内以 `他 / he` 叙述）：
  - `iMathBook · uMathHub`：采用用户指定中文措辞（「这是他参与的第一个项目，为之倾注了对产品的激情……」），英文同步对齐。
  - `LeDA 智能体 / LeDA Agent`：采用用户指定中文措辞（「……能和朋友一起做成一件大事让他倍感振奋。」），英文同步对齐。
  - `B-Spline Policy`：按用户明确要求补充真实经历——这段实习经历激发了他对具身智能极大的研究兴趣，最终也促使他选择了与之相关的研究生研究方向；双语同步写入。
  - 其余 9 项（角色标签 `角色 / Role`、`Pixel Done`、`BNDS.life`、`语衡 · 多模态隐喻检测`、`话剧《与光同行》`、`话剧《寻找李白》`、`话剧《家》`、`校排球队 · 院排球队`、`图集版式预览`）均经逐项核对确认替换。
- **关联身份文档同步**：
  - 网站仓库 `README.md`：中英文简介同步补入信息与通信工程学院硕士去向。
  - 独立 GitHub 个人主页仓库 `Siyuan-Xue/Siyuan-Xue` 的 `README.md`：先将修改前原文件及账号/仓库元数据备份到本机 `.git/seo-backups/2026-11-24/`（位于 `.git/`，不入库），再通过带原 blob SHA（`c4d3048d089e539416d3161f054296088c9e8d40`）的 GitHub Contents API 更新为第三人称并补充硕士去向（提交 `ddbd5a916ffaca003aef5d186a9089290b459c24`，新 blob SHA `3d78d9a8efcd3ec05db438c80378c4b9ab086ed0`）；复读远端 `main` 确认全部既有 URL 与 `Pixel Done` 展示名未变。
- **保持不变**：
  - 聊天页 `/chat/` 保留「小薛 / xue」AI 助手口吻（对薛思远本人本就使用第三人称）。
  - 当前已通过 `BLOG_ENABLED = false` 隐藏的博客文章原文（`src/content/essays/`、`src/content/posts/`）保持原样。

## 变更前基线

- 源码：`main` / `origin/main` 基线为 `76dd7d8469d54e93e4ab10018c5adc562d026101`。
- 变更前工作树存在另一条并行任务的未提交修改（`AGENTS.md`、`ops/README.md`、`docs/MAINTENANCE.md` 中的 Hermes v0.23.4 升级记录及 `docs/audits/2026-11-24-hermes-v0.23.4-upgrade.md`）。本轮通过仅暂存本次文案与维护记录文件及 `docs/MAINTENANCE.md` 对应区块实现隔离提交，完整保留工作树中的并行修改。

## 联动清单

| 资源 | 本次状态 |
|---|---|
| `src/data/site.ts` 首页简介、摘要与图集角色标签 | 已更新：`bio`、`description` 与 `gallery.role`（`Role / 角色`）；`BaseHead.astro` `Person.description` 自动引用 `site.bio.lead` |
| `src/content/galleries/*/{zh,en}.json`（11 组 22 文件） | 已更新：全部正文、英文 `period`、角色与图注统一为第三人称；保留全部 `homeMeta`、`seoDescription`、`links`、媒体 ID、顺序与 `draft/preview/layout` 状态 |
| 网站 `README.md` | 已更新：中英文同步补入北京邮电大学信息与通信工程学院硕士去向 |
| 独立个人主页 `Siyuan-Xue/Siyuan-Xue` `README.md` | 已更新：提交 `ddbd5a916ffaca003aef5d186a9089290b459c24`，第三人称化并补入硕士去向；全部链接与 `Pixel Done` 名称保留；修改前快照在 `.git/seo-backups/2026-11-24/` |
| 两仓库 About（`Siyuan-Xue/siyuanxue.com`、`Siyuan-Xue/Siyuan-Xue`） | 已核对：均为第三人称且与最新身份兼容，无需修改 |
| GitHub 账号侧栏 Bio（`https://github.com/settings/profile`） | 待手动同步：本机 `gh` 令牌权限为 `gist` / `read:org` / `repo`，不含 `user` 权限（不擅自触发权限页刷新）；如需在侧栏显示硕士去向，可在网页设置手动更新 |
| 聊天页 `/chat/` 与隐藏博客原文 | 按用户确认不适用，保持原样 |
| 图片/视频原文件、`src/data/media.json`、Nginx/helper | 不适用：无媒体增删或服务器配置改动 |
| 聊天 bridge、Hermes、微信、长期记忆、模型 | 不适用：无独立服务变更（小薛精选记忆如需同步硕士去向，可在独立服务侧另行更新） |
| 域名、DNS、CI 变量、secret、搜索平台验证 | 不适用；复用现有双语 Actions 与稳定路由 |
| 本机开发环境依赖 | 已补齐：通过 Homebrew 安装 `node@24`（`v24.22.3`，已 link）与 `bun`（`1.4.5`），并运行 `bun install --frozen-lockfile`；未修改 `package.json` 或 `bun.lock` |
| 维护入口与审计记录 | 已更新本文件及 `docs/MAINTENANCE.md` |

## 本机验证与线上验收

- **本机校验（全部通过）**：
  - 第一人称残留扫描：22 份图集 JSON 与 `src/data/site.ts`（聊天人设区块外）均为 `0` 命中。
  - `bun run check`：`Result (111 files): 0 errors, 0 warnings, 0 hints`；`tsc --noEmit` 通过。
  - `bun run test`：`265 pass / 0 fail`（`2195 expect() calls`，32 个测试文件）。
  - `BLOG_ENABLED=true bun run build` + `BLOG_ENABLED=true bun run test:output`：两语言各构建 20 页；`53 pass / 0 fail`（`9840 expect() calls`）。
  - `BLOG_ENABLED=false bun run build` + `BLOG_ENABLED=false bun run test:output`：两语言各构建 16 页；`53 pass / 0 fail`（`9228 expect() calls`）。
  - `bun run test:gallery`：`1 pass / 0 fail`（`346 expect() calls`）。
  - 产物 HTML 抽检：确认 `dist/index.html`、`dist/zh/index.html` 及图集页已包含定稿中英文简介、独立格言、`Role / 角色` 与 B-Spline Policy 新增研究生方向表述。
- **生产发布与公网验收**：待随本次提交推送触发 GitHub Actions 后补充实际 run ID、部署 SHA 与 `bash ops/verify-public.sh <SHA>` 结果。

## 恢复

- 网站静态内容：通过 Git 还原本次提交的 24 个源码/README 文件并走原 Actions 双语发布，或在生产工作流使用 `operation=rollback` 回退至 `76dd7d8469d54e93e4ab10018c5adc562d026101`（执行前核对该 release 仍保留）；无需重传媒体或改动服务器配置。
- 独立 GitHub 主页仓库：还原 `Siyuan-Xue/Siyuan-Xue` 提交 `ddbd5a916ffaca003aef5d186a9089290b459c24`，或参考本机备份 `.git/seo-backups/2026-11-24/profile-readme-before.json`（原 blob SHA `c4d3048d089e539416d3161f054296088c9e8d40`）用当前远端 blob SHA 写回。
