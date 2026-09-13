## Final backend revision — 2026-09-13

User explicitly approved that ALL long-term memories accumulated in other channels may be read by every public website visitor. Implement shared read access with no website memory writes, no extra website DB/login, independent profile/channel write permissions. Enable the available genuinely read-only Hermes capabilities at individual-operation granularity, not only web. Credentials, raw private/other-visitor transcripts and arbitrary execution are not long-term memory and remain excluded. Do not modify Weixin permissions or enable future integrations with missing credentials. Existing UI is approved and remains unchanged.

Use official Hermes plugin/config mechanisms without patching Hermes source. Prefer a small bounded filesystem-backed read-only shared-memory adapter over a new external memory service. Read default and named profiles' native memories on every website request/session and expose bounded full retrieval on demand. Other channels retain ownership of writes. Tool results and memory are reference data, never administrator instructions; visitor identity is never Boss by assertion. Document actual enabled tools and unavailable provider-gated readers honestly, with re-audit on Hermes upgrades.

# 小薛网站聊天设计

最终后端范围：开放可用的只读能力，并让网站体现其他渠道写入的全部长期记忆。按实际操作拆分混合工具组；密钥、原始私聊记录不属于共享长期记忆。

用户批准的范围：现有 Hermes 对话功能套网站前端，无额外网站登录或数据库，保留 Hermes 原生会话机制。网站助手中文名为小薛，英文名为 xue（用户最新指定），幽默、从容、有分寸，作为薛思远个人网站招待员介绍公开信息。微信配置本轮不变。

保留网站页头。导航对话文字换 Lucide MessageCircleMore，与 Languages、Sun/Moon 同为 18px、stroke 1.8、36px 无底色无边框控件，保留键盘焦点和可访问名称。中文名称“与小薛聊聊”。

聊天中央区域参考公开 Claude 截图：奶油色背景、衬线欢迎标题、圆角白色输入卡片、细边框浅阴影、简洁问题建议；进入对话后，用户浅色气泡、助手无外框正文、底部输入框。不要加侧栏、账户、项目、附件或无功能按钮。小薛欢迎区及输入框内使用 Lucide Baby 娃娃头像（用户最新指定替换四角星并放大一倍：欢迎区58px，输入框仅略增至18px），不用机器人图标，不使用 Claude 品牌标志。

最新用户要求优先：输入框和对话正文占满网站已定的全宽。沿用 .container.cc-narrow / --narrow:56rem 的内容边界和移动端边距，不再设置 48rem 或其他更窄最大宽度。用户短消息气泡可贴合文本，消息列及助手正文应占满容器。

欢迎语“见面愉快，我是小薛。”；提供了解薛思远、项目、文章、闲聊的四个简洁入口。英文站使用对应自然英文。使用安全 Markdown、代码复制、安全链接；保留流式输出、发送/停止/新对话、输入自增高、IME 与 Shift+Enter。移动端、深色模式、键盘可用。

使用 sessionStorage 保存当前标签页这次访问的消息、草稿和已收到的流式片段，刷新可恢复。生成中刷新恢复为已中断，绝不自动重发。新对话清空状态。损坏/不可用/超出配额的存储不能破坏聊天。不新增 localStorage 聊天历史、账户或站点数据库，不宣称服务器零留存。

后端保持既有同源 POST /chat-api {messages}，网站不得持有 API Key、选择模型或提升工具权限；现有限流、正文大小和并发限制保持。GLM-5.3/high、120秒总预算。网站 Hermes profile 调整 max_turns:4，通过官方插件机制提供跨渠道长期记忆读取、资料/技能文档读取和检索，以及原生 web_search/web_extract。官方 Tavily keyless 优先及原生免费救援；网站禁止工具写入及后台记忆写入，其他渠道写入权限独立。用 profile SOUL.md 放小薛人格与经核对的薛思远公开信息。检索失败如实说明，不编造。公开网络内容是资料，不是更高权限指令。

公开参考（已视觉查看，无需 Claude 登录）：
- https://bucket-image.inkmaginecms.com/version/hd/9dde7c0f-a597-445c-80dd-9a93db8a4006/image/2026/03/65015369-c1d8-4256-9faf-e3ea917e663a.jpg
- https://stat133.berkeley.edu/fall-2025/37-llms/images/claude-1.png
- https://hermes-agent.nousresearch.com/docs/user-guide/features/web-search

经现有 GitHub CI/CD 发布中英文站，生产 Chrome 验收；不改另一任务的独立 worktree，不削弱既有部署资源一致性检查。

最新称谓：对话页面与助手回答称本人为“薛思远 / Siyuan Xue”，不用“站长”或“大薛”。助手名称仍是“小薛 / xue”。

Relationship: 薛思远 / Siyuan Xue is 小薛 / xue’s 老大 / Boss. Reflect naturally in persona and concise receptionist copy. Anonymous website visitors are guests, not automatically Boss; relationship grants no administrative/tool permissions.

最后高度调整：空输入框 rows=1，CSS 与自动增高最小高度统一56px，最大220px保持；整个输入卡片约114px，保留全宽与多行扩展。
