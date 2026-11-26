# 2026-11-26 取消智能体功能：网站与服务器清理记录

时间均为北京时间（服务器时钟），除非另注。本记录描述 2026-11-26 23:35–23:58 的一次清理及其验收；更早的智能体记录见 [OpenClaw 迁移记录](2026-11-25-openclaw-migration.md)。

## 1. 用户要求与确认的范围

用户原话：「我将取消所有智能体功能 清理服务器上的内容 清理网站相关功能」。

开工前先做了只读清点（仓库、服务器的服务、端口、账号、目录大小，没有读取任何工作区、配置或密钥的内容），再请用户在三个问题上选定范围：

| 问题 | 用户的选择 |
|---|---|
| 魔丸主工作区里未推送的内容 | 先推送到私有仓库 `Siyuan-Xue/mowan`，再删除服务器上的全部内容 |
| 服务器删除到什么程度 | 核心加全部残留（见第 3 节） |
| 网站聊天功能 | 彻底删除，`/chat/` 返回普通 404，代码只留在 Git 历史里 |

## 2. 网站

提交 `f9a12c090a30034b4b612db2539e8ab24def701d`（「Remove the website chat and the agent bridge」），50 个文件，净减约 3500 行。

- 删除：`src/pages/chat.astro`、`src/components/chat/`（React 聊天应用与适配的 AI Elements）、`src/utils/chat-client.ts`、`src/utils/chat-persistence.ts`、`services/hermes-chat/`（桥接源码与说明）、`ops/hermes-chat.service`、`ops/install-hermes-chat.sh`、`ops/nginx/hermes-chat.conf`、`ops/test-hermes-chat.sh`，以及对应的 8 个测试文件和预览夹具。
- 修改：顶栏去掉聊天按钮（`Header.astro`），`src/data/site.ts` 去掉 `chat` 文案，内容清单去掉 `/chat/`（`discovery.ts`），两个 Nginx 模板去掉 snippet 的 include，`ops/verify.sh` 与 `ops/test-nginx-config.sh` 不再引用桥接，`Base.astro` 去掉只有聊天页用过的 `showHeader`，`headerActions.ts` 去掉只有「新对话」按钮用过的 `data-close-actions` 分支。
- 依赖：移除 `react`、`react-dom`、`@astrojs/react`、`ai`、`@ai-sdk/react`、`streamdown`、`@streamdown/cjk`、`use-stick-to-bottom`、`lucide-react`、`@testing-library/react`、`@types/react`、`@types/react-dom`；`astro.config.mjs` 和 `tsconfig.json` 去掉 React 配置。`bun.lock` 随之更新（Bun 1.4.5）。
- 顶栏展开后的顺序现在是：文章页为目录、首页、主题、语言、箭头（五项，窄屏 220px）；图集页为首页、主题、语言、箭头；首页为主题、语言、箭头。其余顶栏规则不变。
- 新增产物检查：两站都没有 `chat/` 目录、没有名字含 chat 或 react 的脚本、sitemap 与 IndexNow 清单里没有 `/chat`、所有页面里没有指向 `/chat/` 的链接或 `chat-api` 字样。

本机验证（Node v24.22.3、Bun 1.4.5）：

- `bun run check`：0 errors、0 warnings、0 hints。
- `bun run test`：226 通过、2 失败。两个失败都在 `tests/media-upload.test.ts`，原因是本机只有 Python 3.9.6，而 `ops/install-media.py` 用到 3.11 才有的 `hashlib.file_digest`；这两个测试和它调用的脚本本次都没有改动。
- `bun run build` 加 `bun run test:output`：`BLOG_ENABLED` 为默认（关）和 `true` 两种模式各 51 通过；`bun run test:gallery` 1 通过。
- 本机预览英文站：首页展开后只有主题、语言两个控件，图集页多一个首页；`/chat/` 返回 404；页面里没有指向 `/chat` 的链接。
- 本机没有 Nginx，`ops/test-nginx-config.sh` 没有在本机运行，由 CI 运行。

发布：见第 4 节。

## 3. 服务器（`ubuntu@82.156.77.131`）

所有写操作都在用户选定范围之后进行。

**先保存再删除。**23:44 停掉个人网关和 `mowan-share` 的三个单元，然后在 `~/.openclaw/workspace` 提交并推送（改动的 `USER.md`、新增的 `MEMORY.md` 和 `memory/`，共约 8 KB，没有查看内容）。推送后本地与远端的提交都是 `fdb655ea1550c8d91639a258dc70d34a1cbfc32b`；删除工作区前又核对了一次，没有未提交或未推送的内容。

**核心（23:55）。**

- 停用并删除系统服务 `hermes-chat.service`、`openclaw-gateway-public.service` 和用户服务 `openclaw-gateway.service`、`mowan-share.path` / `.timer` / `.service` 的单元文件。
- Nginx：把两个站点配置和聊天 snippet 备份到 `/var/backups/siyuanxue-nginx-chat-removal-20261126T155511Z/`（root 私有），删掉三行 `include /etc/nginx/snippets/hermes-chat.conf;` 和 snippet 文件，`nginx -t` 通过后 reload。与备份比对，站点配置只少了这几行。
- 删除 `/opt/openclaw`、`/usr/local/bin/openclaw`、`/opt/hermes-chat`、`/opt/hermes-chat-runtime`、`/etc/hermes-chat.env`、`~/.openclaw`、`~/.cache/openclaw`、`/var/lib/openclaw-public`、`/var/lib/mowan-shared`，以及 `/tmp`、`/var/tmp` 下这些服务的临时目录。`~/.openclaw/workspace-wechat-guest` 之前被设成只读，第一次删除报权限错误，恢复写权限后删除成功。
- 删除账号和组 `openclaw-public`、`hermes-chat`。
- 删除部署私钥 `~/.ssh/mowan_deploy`、公钥文件和只为它写的 `~/.ssh/config`，清掉 `known_hosts` 里的 github.com 记录。`authorized_keys` 没有动。
- 关闭 `ubuntu` 的 linger（`Linger=no`）。

**残留（23:56–23:57）。**

- PostgreSQL：先确认除系统库外没有数据库、`postgres` 库里没有用户表，再 `pg_dropcluster --stop 16 main` 并 purge `postgresql-16`、`postgresql-16-pgroonga`、`postgresql-16-pgvector`、`postgresql-client-16`、`postgresql-common`、`postgresql-client-common`；删除 `/var/lib/postgresql`、`/etc/postgresql`、`/var/log/postgresql` 和账号 `postgres`。
- purge `google-chrome-stable` 和 `ffmpeg`，删除 `/opt/google`、apt 源 `google-chrome.sources`、`groonga.sources` 及其密钥文件。仓库里的脚本不使用 ffmpeg。
- `apt-get autoremove --purge`：先模拟并看过清单（142 个包，都是多媒体、X11 和 PostgreSQL 的依赖库），再执行；执行后再次模拟为 0。
- 删除 `~/google-chrome-stable.deb`、`~/chrome-linux64.zip`、`~/.config/google-chrome`、`~/.cache/huggingface`、`~/.cache/uv`、`~/.cache/pip`、`~/.npm`、`~/.local/share/uv`，以及 `~/.local/bin` 里四个已失效的链接（`node`、`npm`、`npx`、`python3.11`）。
- 删除 `/var/backups/hermes-chat-nginx-20260913-123841` 和两个 `/var/backups/hermes-chat-ui-*`。

**清理后的状态（23:57 核对）。**

- 监听端口：对外 22、80、443；回环只有系统 DNS（53）。8643、18789、19089、5432 都不再监听。
- 系统和用户的单元里没有名字含 openclaw、hermes、mowan 的项；没有失败的单元。`nginx`、`ssh`、`fail2ban` 均为 active，`nginx -t` 通过。
- 全盘按文件名搜索 openclaw、hermes、mowan、postgres、google-chrome，只剩两处：本次的 Nginx 备份里的 snippet 原件，和 `~/.cache/siyuan-media/nginx-test-20261011/` 里 10 月留下的一份模板副本。
- 根分区占用从 16G 降到 9.6G。
- `/var/backups` 剩下 `siyuanxue-dual-domain-20260911`、`siyuanxue-media`、`siyuanxue-media-nginx-20261010T164421Z` 和本次的 Nginx 备份。

没有动的：网站 release 与 `shared/`、媒体快照、证书、`siyuanxue-release`、HTTPS helper、`deploy` 账号、SSH 配置、`~/.cache/siyuan-media`、`~/.npmrc` 等系统镜像自带的配置。

## 4. 发布与公网验收

[Actions 45853549863](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/45853549863) 于 2026-11-27 00:01 结束，整体成功：verify、deploy、IndexNow 通知三个 job 均成功，rollback skipped。同一次推送还带上了此前未推送的提交 `75ffeca`（当日早些时候的 OpenClaw 重置与旧 Hermes 文件清理）。

发布结束后从服务器外部核对：

- `bash ops/verify-public.sh f9a12c090a30034b4b612db2539e8ab24def701d` 通过（两域名 `/__health` 为完整目标 SHA、固定语言、跳转、旧照片拒绝）。
- 两个域名的 `/chat/`、`/chat`、`/chat-api`、`/chat-api/health` 都返回 404。
- 两个域名的首页 200，HTML 里没有指向 `/chat` 的链接；`/sitemap-0.xml` 里没有 `/chat`。
- 英文站 `lang="en"`、中文站 `lang="zh-CN"`。

没有做的验收：没有在浏览器里逐页点线上站；没有用实体手机看顶栏。

## 5. 没有做的和留给所有者的

- **GitHub 上的部署密钥登记没有删掉。**`Siyuan-Xue/mowan` 仓库里标题为 `siyuanxue server workspace push` 的部署密钥（有写权限）还在；对应私钥已从服务器删除，所以它已无法使用。用 `gh` 删除这条登记时被本机的权限策略拦下，理由是用户确认的范围只写了服务器上的密钥。等所有者在仓库 Settings → Deploy keys 里删除，或明确同意后再删。
- **模型中转接口的密钥没有作废。**服务器上保存它的文件已删除，但密钥在服务商一侧仍然有效；作废只能由所有者在服务商后台做。
- **微信一侧没有核对。**服务器上的登录凭据已删除；手机微信里是否还列着这次登录不清楚。
- **私有仓库 `Siyuan-Xue/mowan` 保留**，这是所有者的选择。它是魔丸人设和记忆的唯一副本。两个访客工作区（接待人设）没有备份，已随 `~/.openclaw` 删除。
- **搜索平台没有操作。**`/chat/` 以前可索引，现在是 404；除了发布流程自带的 IndexNow 通知，没有去 Google、Bing、百度后台提交移除，也没有核对它们的收录状态。
- **零散残留没有处理**：`~/.cache/siyuan-media/nginx-test-20261011/`、`~/.cache` 下不到 1 MB 的 `ms-playwright`、`Microsoft`、`fontconfig`、`ubuntu` 的 shell 历史、journald 里智能体服务的旧日志（没有查看内容）。
- **9 月的 Mac 记忆快照没有碰**，也没有核对它是否还在（见维护总览第 5 节）。
- 真实 iPhone 上的顶栏没有验收；这次只在本机预览里看过去掉聊天按钮后的顶栏。

## 6. 恢复

- 网站：聊天代码在 `f9a12c0` 之前的 Git 历史里。用 Actions 回滚到更早的 release 会让聊天页重新出现，但服务器上已没有桥接，页面无法使用；不要把它当作恢复聊天的办法。
- Nginx：`/var/backups/siyuanxue-nginx-chat-removal-20261126T155511Z/` 里有改动前的两个站点配置和 snippet。恢复 include 之前必须先有一个在 8643 上监听的服务，否则 `/chat-api` 只会返回 502。
- 服务器上的智能体程序、配置、会话、微信登录、访客工作区、PostgreSQL 数据目录都没有备份，不可恢复。魔丸主工作区可以从 `Siyuan-Xue/mowan` 取回。
- 重新引入聊天或智能体按新项目处理，见维护总览第 6 节「智能体 / 聊天（已删除）」一行。
