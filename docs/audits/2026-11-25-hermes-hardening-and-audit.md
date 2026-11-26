# 2026-11-25 安全审查、加固、安全更新与重启

状态（当日 09:52 服务器时间）：**审查完成；用户逐项批准的四项修复已执行并验证；服务器已安装全部安全更新并重启，两个域名的网站聊天实测可用。微信通道仍未实测；小薛的人设与记忆重建方案在等用户挑拣，未实施。**

时间均为服务器时间（Asia/Shanghai）。本文件是[2026-11-24 升级审计](2026-11-24-hermes-v0.23.4-upgrade.md)的后续。按仓库约定，这里只记名称、路径和非敏感状态：密钥、微信身份 ID、含密钥备份的具体目录名、个人记忆内容和尚未修复问题的利用细节都不写入本公开仓库，明细保存在所有者本机的私有记录中（见第 7 节）。

## 1. 审查范围与结论（00:08–00:52）

范围：公开仓库的全部历史与 GitHub 设置、服务器、网站与微信两个公共入口、公网可见面。分十二个方向检查，中等以上的发现由另一位核查者从头复查。

- **没有发现任何密钥已经泄露。** 仓库历史（当时 202 个提交、全部分支与 PR 引用）中没有密钥；GitHub 的密钥扫描与推送保护为开启且无告警。服务器上当前有效的密钥值在 shell 历史、日志、60 天系统日志、临时目录、网站目录和进程参数中出现 0 次。
- 对公网只开放 22、80、443；Hermes API、桥接、记忆服务和数据库都只在回环地址监听。
- 两个公共入口实际只有 12 个只读工具（与 11-24 的验收一致）；网站桥接只转发文字。
- 发现的问题中，当日修复的见第 2、3 节，尚未处理的见第 6 节。

审查本应只读，实际造成了几处改动，如实记录：

- 一个审查步骤把 `HERMES_HOME` 指向临时目录后运行了 Hermes 代码，触发 Hermes 自带的包管理器，把托管工具（ffmpeg、node、npm、pnpm、ripgrep、uv）装进了线上的 `~/.hermes/tools/`。用户决定让它装完。gateway 未重启、未受影响；此前每次启动出现的 `install out of sync` 提示随之消失。**教训：不要用临时或复制出来的 `HERMES_HOME` 运行 Hermes 代码。**
- 公共 profile 下留下了两个缓存标记文件，配置未变。
- 向网站聊天发了 6 条真实请求。

## 2. 加固（约 09:22–09:31，用户在提问框中逐项批准）

修改前把四份 `config.yaml` 另存了一份（root 私有位置）。

### 2.1 微信访客读取服务器文件的两条路径

微信私聊对所有人开放。v0.23.4 下访客有两条路可以绕过只读工具集读到服务器文件：消息里的 `@file:` / `@folder:` 引用会被网关展开；回复里出现的文件路径会被当作附件发送。内置黑名单覆盖正在使用的 `.env`，不覆盖它们的备份副本。官方文档写的是消息平台不展开 `@` 引用，与实现不一致。

处理（`website-chat` 与 `wechat-public` 两个 profile）：

- `gateway.strict: true`、`gateway.trust_recent_files: false`。
- `terminal.cwd` 指向各自的空目录 `~/.hermes/profiles/<profile>/workspace`（0700）。
- `platform_toolsets.cron: [life_memory, no_mcp, website_readonly]`：此前持有网站 API 密钥的一方可以经 cron 接口建出带完整工具的定时任务。

`wechat-public` 的配置仍是版本 42，手工修改并做了 YAML 结构比对，没有用 CLI 加载（CLI 会就地迁移并追加工具集）。`xue-owner` 按设计不开严格模式，主人需要收发文件。

### 2.2 主人的微信消息进不了主人 profile

v0.23.4 的 `gateway.profile_routes` 在机器人归属于非默认 profile 时需要 `bot_profile` 字段。旧规则没有它，主人的消息会留在只读、不写记忆的 `wechat-public`。10 月 16 日之后没有微信消息进来过，所以没有实际发生。

处理（default profile 的 `config.yaml`）：

```yaml
gateway:
  multiplex_profiles: true
  strict: true
  trust_recent_files: false
  profile_routes:
    - name: boss-weixin
      platform: weixin
      chat_id: <主人的微信 ID，只在私有配置中>
      profile: xue-owner
      bot_profile: wechat-public
    - name: guest-weixin
      platform: weixin
      profile: wechat-public
      bot_profile: wechat-public
```

用户当日确认的产品语义：**微信继续对所有人开放；只有主人的微信号有写权限，其他人只能通过只读的访客 profile 了解主人，不能改变主人的记忆和偏好。**未匹配任何规则的消息留在 `wechat-public`，不会落到 `xue-owner`。

同时把 `xue-owner` 的 `memory.provider` 从 `hindsight` 改为空：该名称对应的插件在 v0.23.4 里并未安装，主人发第一条消息时 Hermes 会自行从 GitHub 下载安装，在这台服务器上会长时间卡住。记忆方案的取舍在重建时决定。

### 2.3 含密钥的备份

升级和模型切换留下的备份中含有当时有效的密钥，原先放在 gateway 运行账号可读的主目录下。全部移到 `/var/backups/` 下一个仅 root 可读的目录。移动后重新扫描：主目录下除正在使用的配置文件外，不再有含有效密钥的文件。

### 2.4 SSH

新增 `/etc/ssh/sshd_config.d/00-no-root-login.conf`（`PermitRootLogin no`）。**`ubuntu` 的密码登录是用户明确要求保留的**，本次没有关闭，后续维护不要擅自关闭。修改时挂了一个自动回退定时器，用密钥重新登录成功后取消。撤销：删除该文件并 reload ssh。

### 2.5 入库定时器

`xue-diary-ingest.timer` 自模型提供方失效后每分钟失败一次，并把消息原文写进系统日志。已 `disable --now`。记忆服务的 LLM 配置仍指向失效的提供方，留到重建时处理。

## 3. 安全更新与重启（09:31–09:48）

- 原因：`50unattended-upgrades` 里安全源一行是注释状态，定时任务每天运行但从不安装；上一次安装更新是 7 月，服务器 127 天未重启。
- 新增 `/etc/apt/apt.conf.d/51unattended-upgrades-security`，把 `${distro_id}:${distro_codename}-security` 加入允许的来源。此后安全更新每天自动安装；**不会自动重启**，内核更新后需要人工重启。
- 09:31:48–09:46:58 以临时 systemd 单元运行 `unattended-upgrade -v`，日志 `/var/log/sec-upgrade-20261125.log`。配置了 192 个包（含 nginx、openssh-server、openssl、sudo、libc6、systemd、内核），dpkg 错误 0，无未装完的包，复查无剩余安全更新。另有 96 个非安全更新未装，属于 Ubuntu 默认行为。
- 重启前自检：`nginx -t`、`sshd -t` 通过；`sshd -T` 为 `permitrootlogin no`、`passwordauthentication yes`、`pubkeyauthentication yes`；linger 开启；各服务为 enabled。
- 09:48:15 重启，09:48:46 gateway 启动。内核 6.8.0-117 → 6.8.0-151。

## 4. 重启后的验收（09:50–09:52）

- 系统服务 nginx、ssh、hermes-chat、postgresql、fail2ban、unattended-upgrades 为 active；用户服务 `hermes-gateway`、`xue-memory`、`xue-diary-sync.timer`、`xue-memory-backup.timer` 为 active，`xue-diary-ingest.timer` 为 inactive（预期）。无 failed 单元。
- `sshd -T` 与重启前一致。
- 监听：公网 22、80、443；回环 5432、8642、8643、8888，以及 gateway 自己的一个随机回环端口（内部 web 接口；未认证时只返回版本与运行状态，配置、密钥、会话、日志接口均为 401）。
- API 端口隔离与 11-24 一致：不带前缀的 `/v1/models` 无密钥 401、website-chat 密钥 401、default 密钥 200；`/p/website-chat/` 只接受 website-chat 密钥；`/p/xue-owner/` 与 `/p/wechat-public/` 对两把密钥都是 401。
- gateway 日志：`✓ api_server connected`、`✓ weixin connected (profile: wechat-public)`、cron 调度覆盖四个 profile；除微信启动通知失败（`session not ready`，需主人先发一条消息）外没有 ERROR。
- 公网：两个域名首页 200、`/chat-api/health` 正常；各发一条问当前时间的真实聊天，分别 15 秒、17 秒，回答与服务器时间一致。

第 2 节各项在重启前已分别验证（用 Hermes 自己的解析器只读计算）：

- 分流：主人的微信 ID 匹配到 `xue-owner`，任意其他 ID 匹配到 `wechat-public`。
- 严格附件：两个公共 profile 下测试的服务器文件路径全部被拦截。
- `@file:` / `@folder:`：空工作目录以外的路径全部返回 `path is outside the allowed workspace`。
- 工具解析：cron 平台 10 个工具且没有终端、写文件一类；网站 API 入口 12 个；微信访客入口 12 个。

**没有做的验证**：用真实微信号的端到端测试（主人消息、访客消息、语音）。到目前为止只有主人一个微信号与机器人有过会话；其他微信号能否直接给这个 iLink 机器人发消息取决于腾讯一侧，需要实测。

## 5. 恢复

- 第 2.1、2.2 节：从修改前的四份配置副本还原对应键，重启 `hermes-gateway.service`。还原后访客读文件的路径会重新打开，主人消息会重新落到访客 profile。
- 第 2.3 节：备份只是换了位置，需要时由 root 取回。
- 第 2.4 节：删除 drop-in 文件并 reload ssh。
- 第 2.5 节：`systemctl --user enable --now xue-diary-ingest.timer`（在记忆服务的 LLM 配置修好之前不要启用）。
- 第 3 节：删除 `51unattended-upgrades-security` 即停止自动安装安全更新；旧内核 6.8.0-117 仍在 `/boot`，可在引导菜单中选择。

## 6. 尚未处理

只列方向，细节在私有记录中。

- 公开聊天的成本上限：桥接加每日总量上限；在模型服务商后台给密钥设消费上限。
- 桥接在上游快速失败时可能把内部报错文字带给访客。
- 回环接口的访问控制（记忆服务）、CI 发布密钥的命令限制、管理员登录密钥的保护方式、记忆数据库口令轮换。
- 网站 API 密钥仍可读取和删除本 profile 的访客会话（只有桥接持有该密钥）。
- 服务器上已安装的只读插件与仓库中的版本不一致，其中 `life-memory` 不在仓库里。
- 记忆管线：服务的 LLM 配置仍指向失效的提供方；原文存档在升级后翻倍；队列里有重复项。
- GitHub 分支保护与依赖告警、域名的 SPF / DMARC / CAA、Nginx 的 HSTS。
- 一条 10 月的密码登录记录待所有者确认是否本人。
- 是否把「消息平台展开 `@` 引用」与官方文档不一致一事反馈给上游，由用户决定。

## 7. 重建方案的状态

用户要求按官方建议的治理方式重建小薛：主人通过微信持续加深小薛对他的了解，网站和微信访客侧由小薛接待想了解他的人。当日完成的只是准备工作：

- 逐页核对了 v0.23.4 官方文档里关于 `SOUL.md`、`USER.md`、`MEMORY.md`、`AGENTS.md`、技能、profile、记忆提供方和网关安全的做法。
- 列出了与开箱状态不同的全部规则、记忆内容、配置和自建部件，并起草了每个 profile 的人设。

这些清单含个人记忆内容，保存在所有者本机仓库目录下的 `private-agent-review/`（通过 `.git/info/exclude` 忽略，不入库；不得提交，未经用户同意不得删除）。**在用户挑拣并批准之前，服务器上的人设、记忆和插件都没有按新方案改动。**
