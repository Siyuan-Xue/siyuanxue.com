# 2026-11-25 小薛从 Hermes Agent 迁移到 OpenClaw

状态（当日 23:20 服务器时间）：**OpenClaw 已安装并运行；两个域名的网站聊天已切到 OpenClaw 并实测可用；人设、规则、记忆和旧日记已迁入；Hermes 的网关与记忆服务已停用，程序和数据原样保留。微信尚未切换：需要所有者用手机扫一次码，扫码后的主人分流、记忆写入和语音都还没有实测。**

> **2026-11-26 更新：**下面第 1–9 节描述的是 11-25 当晚的状态。人设、记忆、旧日记迁入（第 3 节）和 Hermes 保留（第 7、8 节）已被当日的重置取代，见文末「2026-11-26 重置补注」。


时间均为服务器时间（Asia/Shanghai）。本文件是[升级审计](2026-11-24-hermes-v0.23.4-upgrade.md)与[加固记录](2026-11-25-hermes-hardening-and-audit.md)的后续。按仓库约定，这里只记名称、路径和非敏感状态；密钥、微信身份 ID 和个人记忆内容不写入本公开仓库，逐条的记忆去向保存在所有者本机的 `private-agent-review/openclaw/`（git 忽略）。

## 1. 起因与依据

- 用户当日比较了 Hermes Agent 与 OpenClaw 后决定改用 OpenClaw，要求按 OpenClaw 官方文档的结构与建议重建，并保留现有记忆内容与规则。
- 依据是 OpenClaw 2026.11.x 的官方文档（docs.openclaw.ai，安装包内附同一份）和微信插件 `@tencent-weixin/openclaw-weixin` 2.4.10 的源码。官方微信页面写的是 2.4.8，访问控制的结论以 2.4.10 源码为准。
- 接手时服务器处于「半重建」状态：上一会话在 14:11 已把新人设、规则、`USER.md`、`MEMORY.md` 和精简后的两个只读插件写进了 Hermes 的四个 profile，但没有重启网关（未生效），15:12 把记忆服务的模型配置改到了新接口，随后因客户端接口报错中断。这些改动的备份在 `~/.hermes/backups/rebuild-20261125T141100/`。本次没有继续那套方案。

## 2. 结构

用户在提问框中批准了整组改动，并选定：微信只放行主人、访客档案配好备用；主人档案不保留执行命令的能力。

```
网站访客 → Nginx → 桥接 127.0.0.1:8643 → 公开网关 127.0.0.1:19089（openclaw-public 账号）→ 档案 website-guest（只读）
主人微信 → 个人网关 127.0.0.1:18789（ubuntu 账号）→ 档案 main（可写记忆）
名单内的其他微信号 → 同一个人网关 → 档案 wechat-guest（只读）
```

分成两个网关是官方信任模型的要求：一个网关只对应一个信任边界；OpenAI 兼容接口的令牌等同于整个网关的管理员凭据。匿名访客因此放在单独的网关、单独的系统账号里，那里没有主人的记忆、会话和微信凭据。

| 部件 | 位置 |
|---|---|
| 程序 | `/opt/openclaw`（root 所有、只读）：Node 26.12.1（官方校验值核对）与 `openclaw@2026.11.10`（镜像与官方 npm 的完整性哈希一致）；入口 `/usr/local/bin/openclaw` |
| 个人网关 | 用户服务 `openclaw-gateway.service`（`openclaw gateway install` 生成）；状态目录 `~/.openclaw`；配置 `~/.openclaw/openclaw.json`；密钥 `~/.openclaw/.env`（0600） |
| 公开网关 | 系统服务 `/etc/systemd/system/openclaw-gateway-public.service`（官方「Linux system service」写法加 `User=`）；账号 `openclaw-public`（无登录 shell、无 sudo）；状态目录 `/var/lib/openclaw-public/.openclaw` |
| 插件 | 个人网关：`@tencent-weixin/openclaw-weixin@2.4.10`、`@openclaw/parallel-plugin@2026.11.10`；公开网关：后者。均为 npm 固定版本 |
| 桥接 | `/opt/hermes-chat/server.mjs` 换为仓库当前版本；`/etc/hermes-chat.env` 指向公开网关 |

两个网关都只监听回环地址，令牌认证。对公网开放的仍只有 22、80、443。

## 3. 内容怎么放（按官方的文件分工）

| 内容 | Hermes 时期 | OpenClaw |
|---|---|---|
| 人设、语气 | 每个 profile 的 `SOUL.md` | 每个档案工作区的 `SOUL.md`（原文未改）和 `IDENTITY.md` |
| 操作规则 | 人设与技能里 | 每个档案的 `AGENTS.md` |
| 主人的偏好与称呼 | 内置 `USER.md` | `USER.md`，按官方格式写成现行指令，不超过 4000 字 |
| 关于主人的事实 | 内置 `USER.md`、记忆库 | `MEMORY.md`（逐条原文）；八篇主题稿在 `memory/profile/` |
| 只留在主人侧的笔记 | 主人 profile 的 `MEMORY.md` | 只在 `main` 工作区的 `MEMORY.md` 里；两个访客工作区没有 |
| 旧对话原文 | 自建日记存档（1030 条记录） | 其中主人自己说的 107 条去重后按天写成 `memory/YYYY-MM-DD.md`，共 13 天，只在 `main` 工作区 |
| 语义记忆库（Hindsight） | 自建服务 | 不迁移，数据保留在原处；OpenClaw 用内置记忆（关键词检索，中文用 trigram 分词）加每天 03:00 的后台整理 |
| 两个自建只读插件 | 每个公共 profile 一份 | 不需要：访客档案各有自己的工作区，里面只有可对外讲的内容 |

- 官方迁移工具 `openclaw migrate hermes` 只做了预览（`--dry-run`），没有执行。它计划迁移的人设、`USER.md`、`MEMORY.md` 和模型配置已按上表手工放置；它另外列出的约 60 个技能是 Hermes 自带的通用技能包，没有迁。两个自建技能（相处规则、语音转写步骤）的规则已写进 `AGENTS.md` / `USER.md`，转写步骤依赖执行命令，没有迁。
- 检索不发任何内容给第三方嵌入服务（`memory.search.provider: none`）。以后可按官方文档加本地嵌入。
- 网页搜索用官方 Parallel 插件的免密钥通道（从服务器实测可达；DuckDuckGo 不可达）。

## 4. 权限

- `website-guest`、`wechat-guest`：工具白名单只有 `memory_search`、`memory_get`、`web_search`、`web_fetch`、`session_status`。用网关接口核对 `website-guest` 的生效清单，正好这五个。
- `main`：读写自己工作区内的文件、检索记忆与以往会话、网页、定时提醒；执行命令、浏览器、节点、网关管理、跨档案会话一律禁止（`tools.exec.mode: deny` 加拒绝清单）。
- 全局：`tools.fs.workspaceOnly: true`、`tools.elevated.enabled: false`、`tools.agentToAgent.enabled: false`、会话可见范围限制在本档案内；后台自学习（skill workshop）关闭；检查更新关闭。
- 公开网关另外关闭了控制台界面、终端、上传、后台整理和压缩前的记忆写入。服务单元加了 `NoNewPrivileges`、`ProtectHome`、`ProtectSystem=strict`。
- 微信插件 2.4.10 自带一道门：默认只放行扫码登录的那个微信号。这符合用户选定的「只有主人」。以后放行朋友需要往插件的名单文件里加人（名单非空时必须同时包含主人），他们会落到 `wechat-guest`。

## 5. 桥接改动

`services/hermes-chat/server.mjs`：

- 新增 `CHAT_UPSTREAM_MODEL`（默认仍是 `hermes`）。OpenClaw 把请求里的 `model` 当作档案选择器，这里固定为 `openclaw/website-guest`，由运维配置，访客无法指定。
- `CHAT_DAILY_LIMIT` / `CHAT_DAILY_TZ`（上一会话已写好、当时未部署）随本次一起上线，线上设为每天 200 条。计数在内存里，重启清零。

`tests/hermes-chat.node.ts` 新增三个用例（上游模型固定且访客不能指定、OpenClaw 的流式错误帧不外泄、非法配置在启动时拒绝）。本机 Node 24.22.3 下 25 个用例全部通过。

## 6. 验收（22:37–23:20）

- 公开网关：未带令牌和错误令牌的请求均为 401；`/healthz`、`/readyz` 正常。
- 模型接口：经 OpenClaw 的 `anthropic-messages` 自定义提供方调用成功，没有出现该接口此前拒绝的参数错误。
- `website-guest` 直连测试：自我介绍与人设正确；只凭已加载的记忆答对了演唱会与歌曲；取到当前时间；网页搜索可用；能从主题稿里检索出只写在那里的事实；被追问两类只留在主人侧或并不知道的内容时，没有给出任何私密信息，也没有编造。
- 公网（经 Nginx 与桥接）：两个域名 `/chat-api/health` 为 200；三条真实聊天分别 14、14、5 秒，流式结束帧完整。`/chat-api/sessions` 为 404，外站来源 403，访客自带 `model` 字段 400。Hermes 停用后又测一次，正常。
- `main`（用 `openclaw agent` 命令行）：称呼与人设正确；私密笔记在主人侧可见，且回答了对外只说什么；把一条测试内容写进了当天的 `memory/` 文件；要求执行命令时如实说明没有这个工具。让它改一行 `MEMORY.md` 后，新会话仍自动加载该文件（来源记录保持可信），随后由它自己删掉测试行，文件与导入前逐字节相同。测试会话与测试日记已删除。
- 记忆索引：`main` 27 个文件、`wechat-guest` 11 个文件，全文检索就绪；按日期和按中文关键词都能命中。
- `openclaw security audit --deep`：两个网关都是 0 个高危。个人网关提示未配置受信代理（没有反向代理指向它），两边的深度探测提示缺少 `operator.read`（探测身份自身的限制）。
- 定时任务：个人网关只有官方托管的一条（每天 03:00 的记忆整理）；公开网关没有。

## 7. Hermes 的处置

- 23:16 `disable --now`：`hermes-gateway.service`、`xue-memory.service`、`xue-diary-sync.timer`；`xue-diary-ingest.timer` 此前已停。无残留进程，无 failed 单元。
- 没有删除任何东西：`~/.hermes`（程序、四个 profile、会话库）、`~/hermes-memory-runtime`（日记存档、Hindsight 运行目录）、PostgreSQL 中的记忆库都在原处。PostgreSQL 仍在运行；`xue-memory-backup.timer` 仍启用（只用 `pg_dump`，不依赖已停的服务）。
- 桥接切换前的程序、环境文件和单元文件备份在 `/var/backups/openclaw-cutover-20261125T231258/`（仅 root 可读，环境文件含当时有效的 Hermes 网站密钥）。

## 8. 回退

- 只退网站：从上面的备份目录还原 `/etc/hermes-chat.env` 和 `/opt/hermes-chat/server.mjs`，`systemctl --user enable --now hermes-gateway.service`，再重启 `hermes-chat.service`。
- 全部退回：再执行 `systemctl --user enable --now xue-memory.service xue-diary-sync.timer`；`systemctl --user disable --now openclaw-gateway.service`；`sudo systemctl disable --now openclaw-gateway-public.service`。
- 微信如果已经在 OpenClaw 上扫码登录，Hermes 一侧的微信凭据很可能已失效，退回后需要在 Hermes 重新配对。
- 彻底移除 OpenClaw：停用两个单元后删除 `/opt/openclaw`、`/usr/local/bin/openclaw`、`~/.openclaw`、`/var/lib/openclaw-public` 和 `openclaw-public` 账号。删除前先确认 `~/.openclaw/workspace` 里新记下的日记已另存。

## 9. 没有做、没有验证的

- **微信**：没有登录。扫码后要做三件事：运行 `~/.openclaw/bin/finish_wechat.py`（把扫码者绑定到 `main`，并登记为命令所有者）；主人发一条消息确认进的是 `main`；让它记一件事后确认 `MEMORY.md` / `USER.md` 的来源记录仍可信。`wechat-guest` 的分流在有第二个微信号被放行之前无法实测。
- **语音**：插件优先使用微信自带的转文字。微信没给文字的语音需要本地转写，目前没有配置，要先看真实语音进来是什么样再定。
- **访客侧容器沙箱**：官方建议对接收不可信输入的档案启用容器沙箱；这台服务器没有 Docker。目前靠独立账号、独立网关和五个只读工具的白名单。
- **费用**：模型接口仍按用量计费且没有服务商侧的消费上限；桥接每天 200 条是唯一的总量限制。微信侧没有频率限制。
- **官方体检的一条建议未采纳**：Ubuntu 24.04 的用户级服务在关机时只有 5 秒收尾时间，官方建议加一个 systemd drop-in 延长到 90 秒。属于主机层面的改动，留给所有者决定。
- **上一会话的遗留**：`/tmp/xue-rebuild`（含个人记忆、目录对其他账号可读）已删除；Hermes profile 里 14:11 写入的新文件没有还原，Hermes 已停用，不影响运行。
- 仓库改动尚未提交。

**2026-11-26 00:48 补注：**服务器上新增 `~/.openclaw/bin/wechat-login.sh`，一步完成扫码登录和上面第一件事（登录成功后自动运行 `finish_wechat.py`）；二维码每个约两分钟过期，脚本会自动续出，默认共约 25 分钟。当日约 00:17–00:45 在所有者本机的终端里出过两次码（共 12 个），均无人扫码而过期，没有留下登录进程或账号文件。**微信仍未登录**，本节其余各项状态不变。

**2026-11-26 10:35 补注（微信已登录；人设改写）：**

- 所有者在 09:19 自己运行登录脚本并扫码成功，脚本随即把扫码的微信号绑定到 `main` 并登记为命令所有者。10:10–10:30 核对：主人当时发的消息进了 `main` 的主会话并有回复；`wechat-guest` 没有会话；`openclaw channels status` 显示通道 running；配置校验通过；`MEMORY.md` 与 `USER.md` 和导入时逐字节相同（凌晨 03:00 的后台整理运行了一次，没有可提升的内容，只生成了 `DREAMS.md`）；`openclaw doctor --lint` 没有记忆来源方面的告警。
- 登录瞬间插件日志里有一条 `triggerWeixinChannelReload` 报错：插件自己的一次配置写入被回滚。紧接着的绑定写入和通道重启正常，未见后续影响，记在这里备查。
- 第 9 节「微信」里仍未实测的只剩两项：让它记一件事后 `MEMORY.md` / `USER.md` 的来源记录仍可信；语音。`wechat-guest` 的分流仍要等第二个微信号被放行。
- 人设：所有者指出网站上的自我介绍不对（自称“AI 小孩”并自报年龄）。按其要求改写了三个档案的 `SOUL.md` 与 `IDENTITY.md`：自我定位是薛思远的日记智能体（英文 diary agent）；年龄设定只是把握性格用的参照，平时和自我介绍不提，被直接问到才说明那是参照、自己是智能体没有真的岁数。第 3 节表格里「`SOUL.md`（原文未改）」自此不再成立。只换了这六个文件，没有重启服务，没有动 `MEMORY.md` / `USER.md`。
- 人设改写后的实测：三个档案各问四句（你是谁、你几岁了、Who are you、你是个小孩吗），各在一次性会话里进行，测完即删；两个域名经公网入口各问一句。自我介绍均为日记智能体 / diary agent，没有再主动说年龄；直接问年龄时按上面的口径回答。有一处偏差：`wechat-guest` 在被问“你是个小孩吗”时也提到了性格参照，这个问法算不算“直接问年龄”由所有者判断。测试会话删除后，两个网关各记了几条 `usage-cost-cache` 的后台刷新失败（找不到已删除会话的历史），是清理测试会话的副作用。

**2026-11-26 11:10 补注（性格参照）：**

- 所有者看过上面的改动后指出两点：网站人设里的“我是这儿的小主人”是好的，不该删；他期望的性格像《哪吒之魔童降世》里小时候的哪吒。
- 经所有者在提问框里确认（三个档案用同一套），在三份 `SOUL.md` 的性格参照一节加了六条：调皮爱逗人、嘴上不饶人但不损人；有点小嚣张、不讨好谁；懒洋洋、兴致来了编两句顺口溜；嘴硬心软、重情义；不服输；直来直去、不说场面话。并写明这只是参照：不自称哪吒、不背电影台词、别人没问不提这部电影。网站人设恢复“我是这儿的小主人”。`IDENTITY.md`、`MEMORY.md`、`USER.md` 没有动，没有重启服务。
- 实测：三个档案各问五句（你是谁、你几岁了、闲聊、一句贬低它的话、是不是在学哪吒说话），一次性会话，测完即删；中文域名经公网入口问一句。身份和年龄的回答与上一条补注一致；被贬低时会顶嘴但没有损人，随后把话题引回介绍主人；被问到是否学哪吒时承认性格参照、说明没有背台词。没有主动提年龄或电影。


**2026-11-26 重置补注（14:00–15:00）：**

- 起因：所有者要求把小薛重置为全新的 OpenClaw，舍弃一切记忆和人设，由其手动逐步重建；保留“接个人网站对话和微信通道”的功能；`main` 工作区按官方建议做成私有仓库推送初始状态。重置前所有者在提问框里逐项确认：旧 Hermes 一起删、本机全部清理、`main` 保留官方出生仪式、仓库名 `mowan` 由服务器直推。
- 服务器上的做法：停两个网关；删除三个档案的工作区、会话、记忆索引、媒体、日志，以及随旧数据库失效的客户端凭据和服务记录（只删工作区和会话时网关会因 `Existing client credentials belong to a previous shared database` 以 78 退出，补删这些目录后恢复）；保留配置、两个 `.env`、插件、微信登录和网站桥接；去掉 `agents.defaults.skipBootstrap`，由 OpenClaw 自己生成起始文件，与随包模板逐字一致；清除三个档案的显示名；两个访客档案删掉 `BOOTSTRAP.md`。官方的 `openclaw reset --scope full` 会连同配置、凭据和插件一起删，不符合“保留通道”的要求，所以只用了它的 `--dry-run` 核对范围，实际是手工分步删除。
- 验收：两个网关 ready；微信通道 running（登录凭据保留）；两个域名 `/chat-api` 实测 200，回答的是空白通用助手；`openclaw security audit` 0 个高危；访客工具白名单和微信分流绑定仍在配置里。重置后没有收发过微信消息。
- 私有仓库：`Siyuan-Xue/mowan`（private），初始提交只有官方起始文件和 `.gitignore`，由服务器用只对该仓库有写权限的专用部署密钥推送。
- Hermes 与记忆库全部删除，不可恢复：`~/.hermes`、`~/hermes-memory-runtime`（含加密备份与密钥）、数据库 `xue_memory` 及角色、三个旧单元文件、日记与记忆定时器、`~/.local/bin/hermes*`、家庭目录下的日志和暂存目录、`/var/backups` 里含密钥的 Hermes 目录和切换前备份。第 7、8 节的“原样保留”“回退”随之作废。网站桥接 `hermes-chat`、PostgreSQL 程序、Nginx 和网站备份保留。磁盘占用从 23G 降到 16G。
- 本机：删除 `private-agent-review/`（旧记忆原件、清单、人设草稿、迁移脚本，均未进 git）；仓库里移除已过时的 Hermes 代理文件（只读插件、语音插件、各 profile 覆盖、人设模板、验证脚本及对应测试）；桥接源码和测试保留，25 个桥接测试通过。服务器上的 `wechat-login.sh` 与 `finish_wechat.py` 仍在，本机源稿已删。
- 未做、留给所有者：主人档案的出生仪式和人设重建；微信重置后的收发、记忆写入和语音验收；旧记忆唯一已知的副本是 9 月的 Mac 加密快照，本次没有核对它是否还在；`~/.cache/uv` 里的 hermes 编译缓存未删；仓库改动尚未提交。
