# 中文站百度优先级与接入跟进

日期：2026-10-11，北京时间。用户明确“中文网站重点在百度”。本记录追加平台优先级和后续操作证据；此前 Google 接入、IndexNow 和网站发布审计保留各自时间点的事实。

## 用户目标与实施安排

- 中文站 `xuesiyuan.com` 优先验收百度的发现、抓取、收录和中文查询曝光，覆盖所有公开内容及姓名、主题、自然语言、跨语言和多媒体查询，不限于几个示例主题。
- 保留 Google、Bing 与 AI 跨平台发现，继续维护已经验证的 Google 属性、DNS TXT 与稳定路由。英文站继续安排 Google/Bing 维护，不将该安排写成用户另行指定的英文平台排序。
- 网站可见正文和路由不因平台重点变化而改动；元数据与结构化数据仍须有公开事实支持，不增加机器人专属事实。

## 平台状态与证据边界

| 项目 | 当前证据 / 下一步 |
|---|---|
| 初始百度账号与站点 | 本轮最初浏览器已登录，普通收录页提示“因您未添加网站，只可以浏览部分内容”，站点管理列表当时无站点；后续 apex 验证通过见下文 |
| 此前添加站点的前置要求 | 点击主要“添加网站”按钮后曾弹出强制“完善账户信息”表单，要求真实姓名、职务、中国大陆手机号及验证码、邮箱及验证码、QQ、微信、所在地，并阅读接受百度隐私权保护声明后保存。当时尚未进入网站地址或所有权验证页面 |
| 后续账户资料状态 | 用户已自行填写并保存平台要求的资料，浏览器确认进入添加网站第 1 步；不在文档记录账号名、私人资料或任何字段值 |
| 此前安全验证步骤 | 添加第 1 步选择 HTTPS、填写 `xuesiyuan.com`，点击下一步后出现百度安全验证码；当时等待用户自行完成，尚未进入站点属性或所有权验证页面 |
| 此前站点领域 | 用户完成安全验证码后，站点领域步骤显示 `https://www.xuesiyuan.com`；已选择“信息技术”“其它”。旧 www 站点属于此前阶段，不主动删除 |
| 此前所有权步骤 | 验证页只提供文件验证和 HTML 标签验证，没有 DNS 选项。已选择 HTML 标签方式，平台要求首页 `<head>` 包含 `baidu-site-verification` 并在验证后保留；约 20:42 公网确认旧标签输出，当时请求用户确认完成验证的权限操作 |
| 用户反馈与当前验证对象 | 用户随后报告已自行尝试旧 www 验证，百度要求 HTTP 200、实际收到 301；该错误来自用户报告，并非代理亲眼核对旧错误。用户已改为无 www、提供新标签并要求重新提交；当前浏览器验证页确认目标为 `https://xuesiyuan.com`，标签与用户提供内容一致 |
| 当前授权与进度 | 继续完成 apex 验证和提交已获本次直接授权；新变量值随 `57a0c8a` 在公网生效，约 21:00 apex 验证通过。已填 14 个候选 URL 点击手动提交，等待用户完成验证码，尚无提交成功回执。现有 canonical 和 www 重定向保持不变 |
| 中文候选页面 | 当前构建产物 `.build/zh/indexnow-manifest.json` 核对为 14 个 canonical URL；它们是公开可索引的提交候选，不是百度已抓取或已收录页面数，不另建固定 URL 白名单 |
| 提交入口 | 当前普通收录的 API、sitemap、手动三个标签页均可见。手动入口每次最多 20 条 URL、不支持 sitemap 文件；已填 14 个候选并点击提交，触发验证码，尚无成功回执。API token 未抄录或使用；sitemap 入口的具体提交规则待核查 |
| 百度抓取、索引和曝光 | 尚未取得本轮平台证据；不能记为 0 或“未收录”，后续分别读取可用报告并注明核查日期 |
| 其他平台证据 | Google 28 URL 检查的 8 已索引、19 未知和 1 历史 noindex 仅属于 Google；IndexNow 202 仅为该通知回执，均不代替百度状态 |

## HTML 所有权验证实现与发布准备

GitHub Actions repository variable `BAIDU_SITE_VERIFICATION_ZH` 通过 CI 环境提供给构建，仅在有值时向中文首页的 `<head>` 输出 `baidu-site-verification`。变量已用 `gh variable set` 设置成功，后续 API 仅核对名称及 `configured: true`，没有输出值。验证值不进入源码或本审计；配置与验证标签不代表百度推送 API 凭据，也不等于站点已经验证。

代码与构建配置完成本地检查后，以新 SHA 走现有 Actions 发布；提交发布前的阶段为“变量已配置、代码待发布”，首次线上结果见下节。公开验证变量配置和发布沿用用户既定授权，先完成原始 HTML 与两域名发布 SHA 验收；当时在百度“完成验证”按钮前向用户请求具体权限确认。用户随后反馈旧 www 验证的 301 问题并直接要求改为 apex 新标签重新提交，授权已明确。验证成功后按平台要求保留标签，现有 canonical、重定向和 Google DNS TXT 不变。

配置顺序必须先设置 `BAIDU_SITE_VERIFICATION_ZH`，再首次发布包含验证代码的新 commit SHA。`ops/release.sh` 会复用 `releases/<SHA>`，当前 SHA 已激活时直接返回；后续变量修改或移除也必须产生新 commit SHA 并走正常 Actions。同 SHA 的工作流重跑或 `workflow_dispatch` 即使成功，也不足以证明变量变更已更新线上标签，须核对实际 HTML。

本地验证与当前限制：

- 类型检查覆盖 105 个文件，0 errors / 0 warnings / 0 hints。
- 有配置值和空值的两次双语构建均通过产物检查，每次 34 tests / 6702 assertions；38 个 HTML 中仅有配置时的中文首页包含验证标签，移除该标签后与无配置产物的 HTML 哈希相同。
- 首次完整 `bun test` 为 171 passed、1 failed，失败位于未修改的聊天测试。最初出现 loopback `EPERM`；允许本地 loopback 后，Node 26.5.0 的 21 个子测试通过 20 个，隔离执行并发用例仍出现实际 200 / 预期 429。
- 后续将已安装的 bundled Node 24.19.0 放在 PATH 首位并允许 loopback，完整 `bun run test` 为 **172 passed、0 failed、703 assertions**（5.51 秒），Node 子套件 21/21 通过。只读内存诊断中，Node 26 丢弃流式 `Response` 引用时连接提前关闭、第五个请求为 200；保留引用时连接持续、第五个请求正确为 429，定位为测试响应生命周期与运行时清理行为交互，未进一步断言具体 GC 机制。未修改聊天源码，Node 26 测试兼容性留作后续复核。CI 未单独固定 Node 版本，仍以实际运行结果作为发布验收。
- 代码审查发现的同 SHA 产物复用问题已补入操作说明：变量须在首次新 SHA 发布前配置，之后变更也需要新 SHA。

## 正式发布与约 20:42 独立公网验收

代码 SHA：`c3821e4825176caa70850671a86dbf9856c46df0`。[Actions 38139843736](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38139843736) 最终为 **completed / success**，`verify`、`Deploy verified release`、`Notify IndexNow after successful release` 三个 job 均成功，rollback skipped。约 20:42 独立公网检查时 deploy 尚在 `Verify both public locales`，当时未提前标记整个工作流成功；本段以后续最终回执补齐正式发布状态。IndexNow 此处仅记录 job 成功，不推断通知数量、逐项 HTTP 回执或实际收录。

独立公网检查 38 个实际路由全部通过：

- 两域名 `/__health` 均为上述新 SHA。
- 恰有中文首页包含 1 个 `baidu-site-verification`，与专用 repository variable 精确匹配；其余 37 个 HTML 均不含该标签。验证值未输出或入文档。
- 两站语言、canonical 和 noindex 与 discovery 清单一致；旧 `/gallery/probfun/` 按实际旧路由抓取，其 canonical 仍指向 iMathBook，noindex 保持。
- `https://www.xuesiyuan.com` 经现有 301 重定向至 apex 首页，最终 HTML 可读到验证标签；这不等于百度平台已经接受该验证方式或确认 www/apex 属性范围。

初次核查脚本曾按 canonical 抓取旧 probfun 页，因实际读取目标不符出现断言；修正为按路由路径抓取后通过，未发现线上页面问题，也未因此修改页面或部署代码。

此时已向用户请求百度新站点所有权的具体操作确认，尚未点击“完成验证”。网站标签验收不等于百度验证、提交、真实抓取、收录或曝光。

## 后续改用 apex 验证

用户回复称已自行尝试旧 www 验证，百度要求 HTTP 200、实际收到 301，随后改成无 www 并给出新的 HTML 标签，明确要求重新提交。旧验证错误按用户报告记录；当前浏览器已独立确认验证对象是 `https://xuesiyuan.com`，新标签与用户提供内容一致。文档不记录标签值或私人资料，旧 www 站点不主动删除。

`BAIDU_SITE_VERIFICATION_ZH` 更新成功（命令 exit 0），API 仅以布尔结果核对 `matches_current_baidu_value: true`，不输出值。随后以文档新 commit SHA 触发现有 Actions（没有使用 `[skip ci]`），构建输出 apex 对应的新标签；这次未修改网站源码、canonical、www 重定向或 Google TXT。此前 `c3821e4` 发布及标签验收保留为旧标签阶段事实，不能用于证明新 apex 验证已通过。本次只有构建变量值及文档变化，不重复运行本地源码测试；新 Actions 执行完整 CI，最新结果见下节。

## 约 20:58 新标签上线与约 21:00 百度验证

新 SHA 为 `57a0c8a9d744e9ed511594452737c75e09db65dc`，[Actions 38141044881](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38141044881) 于约 21:01:40 确认为 **completed / success**，verify、Deploy verified release、Notify IndexNow after successful release 三个 job 均成功，rollback skipped。约 20:58 独立检查时工作流仍在 `Verify both public locales`；本段按后续最终回执补齐发布状态。IndexNow 仅记录 job 成功，不推断通知数量、HTTP 回执或收录。约 20:58 独立公网 38 路由检查全部通过，两域名 `/__health` 均为新 SHA；唯一中文首页标签与新 repository variable 匹配，首页直接 GET 返回 200，检查不跟随跳转。

百度 apex HTML 验证首次明确显示“无法连接到您网站的服务器”；同一页面再次重试约 21:00 后进入站点管理属性页，确认 `https://xuesiyuan.com` 所有权验证通过。平台分类为“信息技术”“其它”，站点类型暂为 PC，关联主体为未关联；没有因此改动这些属性。首次连接错误与后续成功分别记录，不将错误原因断定为缓存、DNS 或网络暂态。

普通收录页面可见 API、sitemap、手动三个入口。手动提交说明每次最多 20 条、不支持 sitemap 文件，已填全部 14 个候选 canonical URL 并点击提交，随后触发新的安全验证码，已请求用户接手。尚无提交成功回执，不能记为已提交、已抓取或已收录；API token 虽在页面可见，未抄录、使用或写入文档。

同阶段只读连通性核查：

- Google 与 Cloudflare 的 DoH 查询返回 A `82.156.77.131`，未返回 AAAA。固定该 IP 并使用正确 SNI 时，TLS 1.2 和 TLS 1.3 的证书链均通过，SAN 覆盖 apex/www；不同 UA 返回 200 且正文一致。
- 本机存在 fake-IP 解析路径，普通本机请求不足以代表百度来源；上述固定 IP/TLS 结果也不证明百度所有抓取节点均可连接。
- SSH BatchMode 使用默认凭据认证失败，未取得服务器访问日志，未修改 DNS 或 Nginx。缺少服务端日志和百度具体错误原因，不能从测试成功推断首次验证失败的根因。
- 等待期间刷新 Google Search Console 中文 sitemap，列表仍为 Couldn't fetch、详情为 Sitemap could not be read，没有更具体原因；继续保留 Google 报告待办，不与百度已验证混为一项。

## 20:07:47 公网可读取性核查

2026-10-11 北京时间 20:07:47，使用模拟 `Baiduspider/2.0` UA 对中文站进行 GET 检查；本次没有网站代码或部署变更。

- 共 21 个 URL：14 个 HTML 候选页，以及 `/robots.txt`、4 个 sitemap（index、页面、图片、视频）、`/__health` 和 `/indexnow-manifest.json`。全部返回 HTTP 200，无跳转。
- 14 个 HTML 均为 `zh-CN`、canonical 指向自身，没有 meta robots 或 `X-Robots-Tag` 的 noindex；原始 HTML 主体可读。robots 允许 Baiduspider 读取。
- 4 个 sitemap XML 均可解析；`/sitemap-0.xml` 的 URL 集合等于公开 manifest 的 14 个 canonical URL。图片 sitemap 为 10 个来源页、64 张图片，视频 sitemap 为 2 个来源页、5 个视频。
- 公开 manifest 与本地构建产物一致；`/__health` 为 `c42d2fdd957c0d39470d2525d40d5c8a45ada785`。

这些结果只证明当前访问来源使用该 UA 时可以读取页面及发现入口，不代表来自真实百度爬虫，也不证明百度支持或已处理这些 sitemap、已经收录或取得曝光。百度平台状态继续分别取证。

## 接下来按序执行

1. apex 所有权已验证，新标签和两站 SHA 已核对，Actions 已整体成功。用户完成当前手动提交的安全验证码后，核对 14 个候选 URL 的真实成功回执；此前仅填表和点击不算提交成功。
2. 核查可见 sitemap 入口的具体提交规则，按实际能力提交现有 sitemap；不要把 sitemap 文件 URL 放进手动页面 URL 入口。若额度或入口受限，记录具体限制与尚未提交的项目。
3. 检查百度抓取诊断、索引及查询报告的可用范围，分别记录实际抓取、收录、曝光和排除原因；需要服务器日志时再针对实际异常排查。
4. 按[搜索指南](../SEARCH.md)覆盖姓名、无姓名主题、组织/角色、文章、自然语言、跨语言及图片/视频查询；AI 搜索发现、直接读取与多页面综合独立记录来源及事实准确性。
5. 持续保留 Google 中文 sitemap 复查和英文索引观察、Bing 接入待办。没有创建提醒或自动化。

## 联动、验证与恢复

- **已更新：**根目录 `AGENTS.md`、维护总览和搜索指南的平台优先级，以及本次审计；HTML 验证构建链路、repository variable 和操作说明已发布，apex 新标签的 `57a0c8a` 公网验收通过、百度所有权验证通过。`57a0c8a` 的 Actions 整体成功；旧 `c3821e4` 发布结果保留为此前阶段记录。Google 接入等历史审计不改写。
- **待处理：**当前手动提交验证码与 14 URL 成功回执、sitemap 入口具体规则与提交，以及抓取、索引与中文查询证据。本次重新验证和提交已获用户直接授权，当前尚无百度 URL 提交成功、真实抓取或索引证据；Node 26 既有聊天并发测试差异另留运行时兼容性待办。
- **不适用：**此前账户资料与公网核查阶段未修改网站代码或部署；后续 HTML 验证配置已实现并经新 SHA 在公网生效，不能沿用此前状态声称整轮无代码变更。没有媒体、独立服务、Google DNS TXT 变更或定时自动化，文档不保存验证值、secret 或私人资料。
- **验证：**浏览器核对百度登录状态、初始站点列表为空、此前账户信息表单及安全验证码；用户完成后核对站点领域步骤显示的 www 地址及分类选择。模拟 Baiduspider 公开 GET 检查 21 个 URL，以及新 SHA 下 38 路由与 www 跳转的独立公网核查；本次本地测试与 CI verify 结果见上节。文档核对差异、相对链接和状态表述，旧版测试不当作本次新验收。
- **恢复：**文档可按 Git 历史恢复；验证标签配置上线后，停用需先核对百度所有权影响，再移除变量、生成新 commit SHA 并按既有 Actions 发布和核对实际 HTML，不能只重跑同 SHA，也不能把日常清理当作移除验证标签的理由。本次不撤销 Google 所有权验证，不删除 DNS TXT 或其他解析。
