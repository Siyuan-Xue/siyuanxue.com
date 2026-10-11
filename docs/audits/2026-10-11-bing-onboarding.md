# Bing Webmaster Tools 接入与提交核查

日期：2026-10-11，北京时间。延续[搜索后续审计](2026-10-11-search-followup.md)；此前“已登录、等待 GSC 只读权限确认、尚未导入”是当时的真实状态，保留原记录。本轮由主任务操作浏览器并提供平台证据，文档整合不另行操作账号。账号标识、邮箱、凭据及 OAuth 会话地址不入文档。

## 授权范围与选择

用户已明确确认 Bing 所请求的 Google Search Console 只读权限，且明确仅导入 `xuesiyuan.com` 与 `siyuanxue.com`。授权回跳后进入 GSC 导入选择页。授权页面所述范围覆盖当前 Google 账号内全部已验证站点的只读访问，不能将权限范围写成仅限这两个域名；实际导入选择另行限定为两站。

导入选择页总站点数和可导入数均为 2，只列出 `https://xuesiyuan.com/` 与 `https://siyuanxue.com/`，Role 均为 Administrator、Sitemaps Count 均为 0；只勾选这两站。该 sitemap 数字仅描述导入页当时可提供的文件，不否定 Google 已有提交记录，也不能解释为所有搜索平台未发现 sitemap。

## 平台结果

约 21:47 点击 Import，平台显示 Adding site information，随后返回 Home 一度空白。重新打开控制台后进入中文站主页，站点选择器只出现上述两站，没有站点验证待办。没有新增其他域名、验证文件、DNS 或 CI 配置。

中文站 Home 提示报告数据正在处理，可能需要最多 48 小时，并建议提交 sitemap；这是平台提示，不是完成时限承诺，也不是已抓取、已收录或有曝光的证明。导入页每站 sitemap 为 0，中文站 Sitemaps 实际列表也为 0 行，因此在约 21:48–21:49 分别手动提交两站原有的 index，逐站复查如下。

| 字段 | 中文站 | 英文站 |
|---|---|---|
| 实际提交 URL | `https://xuesiyuan.com/sitemap-index.xml` | `https://siyuanxue.com/sitemap-index.xml` |
| Known sitemaps | 1 | 1 |
| Errors / Warnings | 0 / 0 | 0 / 0 |
| Total URLs discovered | 0 | 0 |
| 唯一列表行 Last submit | `10/11/2026`，Submitted | `10/11/2026`，Submitted |
| Last crawl | `-` | `-` |
| Status | Processing | Processing |
| 行内 URLs discovered | `-` | `-` |

上述初次复查只取得两份 sitemap 提交记录，当时尚无对应文件抓取或处理成功证据。汇总的 0、行内的 `-` 和状态 Processing 分别保留；没有错误/警告不能代替抓取成功或解析成功，也不能把初始 URL 计数当成全站未收录。未另提交每个子 sitemap；后续页面 URL 通知见下节，不能混同为 sitemap 处理成功。

约 21:53–21:54 再次检查中文站，index 已变为 Success；详情显示 Successfully processed、Last processed `10/11/2026`、Sitemaps discovered 3、URLs discovered 26。三个子文件均为 Success、Last crawl 均为 `10/11/2026`：页面 sitemap 为 14、图片 sitemap 为 10、视频 sitemap 为 2。**26 是跨 sitemap 来源 URL 条目计数，14+10+2 之间存在重叠，不是 26 个独立网页，更不是 64 张图片或 5 个视频已被收录。** 这提供中文 sitemap 抓取/处理成功证据，不替代页面索引或曝光。

英文站约 21:54 刷新后 index 也变为 Success，列表 Last crawl 为 `10/11/2026`，行内 URLs discovered 与 Total URLs discovered 均为 3。打开详情显示 Successfully processed、Last processed `10/11/2026`、Sitemaps discovered 0、URLs discovered 3、No data available，没有子文件列表。这是此时实际报告；英文 index 已处理成功，子文件明细尚未出现，不能用中文的 14/10/2 填入英文，也不能把两站计数强行统一。无需据此重提或认定 XML 格式故障，后续观察英文子文件报告更新。

### URL 检查与当前读取

英文首页的 Bing Index 检查显示 Indexed successfully、URL can appear on Bing；报告字段为：

| 字段 | 平台记录 |
|---|---|
| Discover | `30 Aug 2026` |
| Last crawl attempted | `27 Sept 2026 at 06:13` |
| Crawl allowed / Page fetch / Indexing allowed | Yes / Successful / Yes |
| SEO/GEO issues | No issues found |
| Markup | 1 type |

日期时间按平台原样保留，不推断时区。这是历史抓取对应的已索引证据，不证明已抓取 2026-10-11 当前部署；不能把约 9 月的报告成功改写成今日实时测试通过。

英文首页首次 Live URL 测试返回 `Error encountered while inspecting Live URL https://siyuanxue.com/`，未提供具体 HTTP 原因。执行一次 Re-try 后成功，平台显示 Tested on Today at 21:51、URL can be indexed by Bing、2 Markup types found。View Tested page 确认本次响应 HTTP 200、Content-Type 为 `text/html`、HTML `lang=en`，显示当前站点 head 和主题脚本。响应头 Date 为 `Sun, 11 Oct 2026 13:50:43 GMT`、Last-Modified 为 `Sun, 11 Oct 2026 12:55:09 GMT`，gzip、no-cache；这些是该次响应的原样字段，不用于替代 release SHA。

本次英文实时测试另提示 1 项 SEO/GEO 问题：Meta Description too long or too short。这是摘要长度建议，不是 noindex 或抓取阻断；本轮没有据此修改页面元信息。首次通用错误与重试成功均保留；最后这次 HTTP 200 才是实际实时读取证据，不能由此前历史索引或 sitemap 提交记录推得。

中文首页的 Bing Index 显示 Discovered but not crawled、URL cannot appear on Bing，Page Fetch 为 Failed、Crawl allowed 为 N/A、Last crawl attempted 为空；发现日显示 `01 Jan 2006`。该发现日期明显异常，仅原样记作平台字段，不能当作真实站龄、上线日期或首抓时间。

随后中文首页 Live URL 成功，平台显示 Tested on Today at 21:51、URL can be indexed by Bing、No SEO/GEO issues found、2 Markup types found。View Tested page 确认实际响应 HTTP 200；Date 为 `Sun, 11 Oct 2026 13:51:24 GMT`、Last-Modified 为 `Sun, 11 Oct 2026 12:55:09 GMT`，Content-Type `text/html`，gzip、no-cache。因此历史 Discovered but not crawled / Fetch Failed 不能用来证明当前抓取故障；实时可索引也不能写成已进入 Bing 索引。

### 全部候选页面的提交通知

从 `.build/discovery/zh.json` 与 `en.json` 读取 `indexable: true` 的完整清单，分别为 14 个 canonical；本轮没有以几个示例项目代替全站清单。英文首页先在 URL Inspection 请求索引，返回 Indexing requested，记录为 Today at 21:51；其余 13 个英文 URL 经 URL Submission 批量提交，记录为 Today at 21:53，未重复首页。中文 14 个 URL 全部通过 URL Submission 提交，记录均为 Today at 21:52。

| 双域名共同路径 | 中文站记录 | 英文站记录 |
|---|---|---|
| `/` | URL Submission，21:52 | Request Indexing，21:51 |
| `/chat/` | URL Submission，21:52 | URL Submission，21:53 |
| `/essay/why-this-site/` | 同上 | 同上 |
| `/gallery/b-spline-policy/` | 同上 | 同上 |
| `/gallery/bnds-life/` | 同上 | 同上 |
| `/gallery/family/` | 同上 | 同上 |
| `/gallery/finding-li-bai/` | 同上 | 同上 |
| `/gallery/imathbook/` | 同上 | 同上 |
| `/gallery/leda-agent/` | 同上 | 同上 |
| `/gallery/pixeldone/` | 同上 | 同上 |
| `/gallery/volleyball/` | 同上 | 同上 |
| `/gallery/walking-with-light/` | 同上 | 同上 |
| `/post/congrats-you-hit-the-limit/` | 同上 | 同上 |
| `/post/first-note/` | 同上 | 同上 |

两站各自列表最终均为 1–14 of 14、URLs submitted today 14、Quota left 86（原额度 100）。`/chat/` 仅为公开静态入口，不含访客消息、动态回复、私人会话或记忆；预览、占位和重定向未进入本次清单。**本轮是 28 个 URL 提交记录、2 个首页实时读取成功**，没有逐页完成 28 个 Bing 实时抓取，更没有取得 28 页全部入索引的结果。无需再重复提交通知；后续观察新增抓取、索引与查询报告。

### AI Performance Beta

两站分别打开 AI Performance Beta。来源栏为 Microsoft Copilots and Partners，默认 3M 区间为 `July 11, 2026–Oct 10, 2026`；两站均显示 Total Citations 0、Avg. Cited Pages 0，Grounding Queries 为 No data available、0 行。平台同时提示这是整体活动的样本，结果可能进一步修订。

以上只记录该来源范围、该时间窗口和本次新接入时可见报告；不能写成全平台、全时段未被 AI 引用，也不覆盖 10 月 11 日的 Gemini 实测。接入后的报告仍在处理，后续要以相同来源/时间口径比较变化；本轮没有创建自动监测。未重复做 robots 测试；两首页实际抓取证据已单列，不扩大成全站所有页面或所有爬虫策略验收。

## 持续验证与恢复

主任务本轮完整读取 Bing 官方[从 Search Console 导入站点说明](https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/)，正文标注更新于 2025 年 6 月。该机制使用已有 GSC 权限自动验证导入站点，并定期向 GSC 复核所有权；撤销 GSC 访问后，需要重新连接或改用 meta、DNS 等其他验证方式。此说明解释当前无额外验证待办的导入方式，不等于未来永久无需保持验证。

现有 Google Domain 属性及 DNS 验证 TXT 保留；本轮不需额外验证文件，也未修改网站、DNS、Google 或百度验证配置。授权管理入口为 [Google 第三方连接](https://myaccount.google.com/connections)。若未来明确要求停用，可在那里撤销相应 Bing 连接；为继续维护 Bing 站点，应先确认替代验证方式及其实际生效，再撤销依赖。重新接入时恢复 GSC 连接或按 Bing 实际界面验证，复查站点权限和报告；不通过删除 Google TXT“恢复”本次导入。

若只需撤销本轮新增 sitemap 提交，在相应 Bing 站点的 sitemap 管理界面处理提交记录即可；无需删公网 XML、站点或其他搜索平台记录。本轮未执行撤销授权、移除站点或删除 sitemap 记录。已发送的 URL 通知及平台报告/抓取历史不属于可从 Git 回滚的数据，文档回滚不能撤销上述外部操作。

## 维护清单

- **已核对：**开工为干净 `main`、提交 `d4e5422`、单一工作树；原有文档与平台阶段状态已阅读；用户授权范围与实际两站选择已区分。
- **已更新：**两站 GSC 导入、两份 index 提交及处理成功、中文三个子文件处理成功、全部 28 候选 URL 通知、两个首页实时读取、两站 AI Performance Beta 报告；维护总览和搜索指南入口；持续所有权及恢复方式已依据本轮平台与官方说明记录。
- **待核验：**英文子文件明细仍待报告更新。其他 26 页未做 Bing 逐页实时/索引检查，详情页实际抓取与收录、中文首页后续索引及查询/AI 曝光继续观察；未取得证据不记成功。
- **不适用：**本站正文、结构、交互、媒体、服务、DNS、CI 变量和 secret 均无本轮变更；百度备案仍按用户要求暂缓，不新建自动化。
- **文档验证与恢复：**本轮三份文档的 83 个本地链接、围栏、尾部空白、凭据模式与 `git diff --check` 均通过；14 条提交路径与两语言清单严格一致。文档通过 Git 历史恢复，外部平台操作按实际记录单独恢复；使用 `[skip ci]` 提交，不触发网站重新部署。
