# 搜索平台后续核查与独立主页名称修正

日期：2026-10-11。操作时段约北京时间 21:30 起；Google 显示的抓取时间按界面原样记录，不推断时区。本记录延续[Google 接入审计](2026-10-11-search-console-onboarding.md)与[百度优先级审计](2026-10-11-baidu-priority.md)，不将后续状态改写为此前已完成。账号邮箱、凭据、设备码、OAuth 会话地址与验证值均不入文档。

## 当前结果与边界

| 项目 | 本轮实际结果 | 未完成或不能推断的部分 |
|---|---|---|
| 独立 GitHub 个人主页 | README 项目标签已改为 `Pixel Done`，远端 `main` 与提交补丁复核通过 | 只改标签；项目 URL、其他介绍和本站源码不变 |
| Google 中文 index | Google 实时测试再次抓取成功；原 sitemap 报告仍读取失败 | 具体原因未知；不能判为已修复或必然是处理延迟 |
| Google 中文页面子 sitemap | 独立提交取得成功回执；之后报告仍 `Couldn't fetch`，独立 Live test 抓取成功 | 提交、实时抓取和 sitemap 报告处理分别记录；报告失败原因仍未知 |
| 公网 sitemap 诊断 | 两域名 40 次方法/版本/压缩检查通过，XML 及引用集合核对通过 | 只证明本次来源的结果，不能冒充真实 Google 抓取 |
| Bing Webmaster Tools | 已通过 Google 完成基本登录，原站点列表为空，已到 GSC 只读授权页 | 用户尚未确认所见授权范围；尚未授权或导入两站 |
| 百度 | 按用户“暂不备案，收尾任务”的要求继续暂缓备案登记与反馈 | 本轮没有操作百度；此前配额、提交和报告状态不构成新验收 |
| AI 检索与引用 | 78 查询样本、28 AI 直接读取及普通 HTTPS 对照、276 次媒体 HEAD、3 个受控综合案例与 Gemini Auto 两次临时聊天已记录 | AI web 无当前正文读取确认；Gemini 找到两域名及英文排球详情，但中文指定页读取与事实准确性仍有缺口，不能标为整体通过 |

## GitHub 主页名称修正

资源为独立仓库 [Siyuan-Xue/Siyuan-Xue](https://github.com/Siyuan-Xue/Siyuan-Xue) 的 `main:README.md`，网站仓库提交不会自动更新它。修改前查阅根目录维护规则和维护总览，并确认本站在 `main`、工作区干净、仅一个工作树；无切换、删除或清理归档。

通过既有 GitHub CLI 读取公开 README，先备份，再以原 blob SHA 作并发保护调用 Contents API。首次 PUT 返回网络 EOF，重新读取确认原文件未变后才重试；实际只产生一个新提交。

```diff
-- [PixelDone / 像素清单](https://github.com/Siyuan-Xue/PixelDone)
+- [Pixel Done](https://github.com/Siyuan-Xue/PixelDone)
```

- 修改前提交：`2de81af53ebe2241e2ef0869ec20463a46175562`；README blob：`80cebca660040a5cc11b7ce5ddc7f82d6f4c8403`。
- 新提交：[7edf6cfb902f98a77dfa1129bfabf81037d500cc](https://github.com/Siyuan-Xue/Siyuan-Xue/commit/7edf6cfb902f98a77dfa1129bfabf81037d500cc)，北京时间 21:31:26；新 README blob：`c4d3048d089e539416d3161f054296088c9e8d40`。
- 提交后重新读取远端默认分支 README 和最新提交：内容与预期逐字相同，仅一个文件、一增一删；所有 URL 顺序与内容完全一致。两语言展示共用 `Pixel Done`，不修改实际仓库地址或 `/gallery/pixeldone/`。
- API 只读核对账号 name/bio/blog、独立主页内容与两仓库 About：姓名为 Siyuan Xue / 薛思远、别名 Miles，简介包含 BUPT 和既有工程方向；英文主页与中文域名关联一致。本站 `src/data/site.ts` 已为两语言 `Pixel Done`，README 和 `BaseHead.astro` 指向现用账号及两域名；未扩大编辑账号侧栏或 About，也未刷新 CLI 权限。

原文、修改稿、请求/响应、补丁与重新读取结果保存在 `/tmp/pixeldone-profile-20261011/`，只含公开 README 与提交信息，**临时目录不是长期备份**。GitHub 原提交是持久恢复入口：需要撤销时，先检查后续合法修改，再撤销本次提交，或读取最新 blob SHA 后以 Contents API 写回所需原文；不要无条件覆盖后续修改。此修正无需本站 CI、服务器安装或单元测试。

## Google 中文 sitemap 复查

此前英文 index 报告 Success、中文 index 报告读取失败、28 URL 索引检查、两站总览 processing data 等仍以各自[接入审计](2026-10-11-search-console-onboarding.md)时间为准。本轮未把历史 URL 检查结果当作新收录验收。

1. 刷新中文 `https://xuesiyuan.com/sitemap-index.xml` 报告，仍为 `Couldn't fetch / Sitemap could not be read`，未取得可展开的具体 HTTP 或解析原因。
2. 对相同 XML 再次执行 Google Live test。界面时间原样为 `Oct 11, 2026, 9:31:19 PM`，本地操作北京时间约 21:31；Google Inspection Tool smartphone 返回 Crawl allowed Yes、Page fetch Successful、Indexing allowed Yes。没有为 XML 申请索引。
3. 为区分 index 与页面子文件处理，单独提交 `https://xuesiyuan.com/sitemap-0.xml`，取得 `Sitemap submitted successfully` 回执。
4. 随后约 21:34 复查列表，index 与子文件均显示类型 Unknown、状态 Couldn't fetch。尚无 sitemap 处理成功证据；不能把提交弹窗或实时测试当作报告成功。
5. 随后打开页面子 sitemap 详情，Last read 为 `10/11/26`、Discovered pages/videos 均为 0，状态 `Sitemap could not be read`，没有可展开的具体原因。列表 Last read 当时为空；列表与详情是不同视图，分别保留，不把空白改写为详情没有读取日期，也不把 0 推广为全站未收录。
6. 对页面子 sitemap 单独执行 Google Live test，界面时间原样为 `Oct 11, 2026, 9:39:34 PM`；Google Inspection Tool smartphone 同样返回 Crawl allowed Yes、Page fetch Successful、Indexing allowed Yes。没有为 XML 申请索引；此结果不消除报告失败。

同期[公网诊断](2026-10-11-sitemap-public-diagnostics.md)核对 DNS、TLS、HTTP/1.1 与 HTTP/2、GET/HEAD、压缩前后摘要、XML 与语言/媒体引用集合，两域名合计 40 次 canonical 请求均为 200、无跳转；两域名健康 SHA 均为 `57a0c8a9d744e9ed511594452737c75e09db65dc`。没有证据支持本轮改动 DNS、Nginx、压缩、XML 或页面。

为补真实服务器证据，使用既有本机 SSH 作只读连接尝试，启用 BatchMode 并保留严格主机校验；返回 `Permission denied (publickey,password)`，未能读取访问/错误日志。该结果只说明当前凭据不可用，不能写成服务器封禁、网络故障或已找到失败请求；没有放宽校验、修改认证或变更配置。

后续以新增证据推进：记录平台精确 URL、详细错误、Last read 和抓取时段；若持续失败且提供时间，再在可用的既有授权访问方式下核对该时段服务器记录及真实 Google 来源。当前日志证据因上述认证失败未取得。报告未给原因时保留“未知”，不把缓存、备案或延迟写成已证实原因，也不反复重提代替诊断。删除本轮单独新增的子 sitemap 提交记录可在 GSC 管理界面完成；不需删除公网 XML、原 index 或 DNS 验证记录。此处未执行删除。

## Bing 进度与权限边界

通过 Google 完成 Bing Webmaster Tools 基本登录后，原站点列表为空。随后选择从 Google Search Console 导入，抵达 Google 的 GSC 只读授权页。所见权限覆盖账号内全部已验证站点的只读访问；拟导入的网站仍限定为 `xuesiyuan.com` 与 `siyuanxue.com`。

当前仍在等待用户对该权限范围的明确确认，**尚未授权、尚未导入**。基本登录不证明站点归属、sitemap 提交、Bing 抓取或收录；IndexNow 的独立回执也不能代替这些结果。本记录不保存 OAuth 地址或账号标识。后续如确认并导入，再补实际选择、平台回执、验证方式和撤销入口。

## AI 检索、直接读取与综合的证据边界

完整输入与逐 URL 结果见[AI 检索审计](2026-10-11-ai-retrieval-validation.md)。Codex 可用 web 工具共执行 78 查询样本：28 条无域名限制文本、28 条逐路径定向、2 条视频定向和 20 条图片查询。自然文本仅 5 条返回本站 URL，去重为英文首页和开站短记；逐路径定向仅英文首页、建站文章和短记 3 个 canonical 精确命中。18 条自然图片和 2 条域名定向图片查询没有本站来源，不能以相似图片或同域首页替代目标详情页/媒体发现。

对 28 个候选 canonical 的 AI `web.open`，24 次不可访问、1 次 Cache miss、3 次为旧快照，尚未取得任何一页为当前部署正文的读取确认。同期普通 HTTPS 28/28 返回 200、固定语言和正确 canonical；128 组原图与展示图关系正确、276 次媒体 HEAD 均 200。两类结果同时保留，工具失败具体原因未知，不能据此判定网站封禁、真实爬虫失败或全平台未收录；媒体可达也不等于 AI 能看图、播放、理解或引用。

3 个多页综合案例使用普通 HTTP 提取的实时公开正文作为输入，分别核对项目贡献、工程外经历和文章观点。它们证明提供正文后的引用可核对，不是仅凭 web 工具自然搜索/直接读取成功；本人陈述、合作成果、原研究与个人复现、剧目荣誉与个人获奖均保持区分。

同期另在 Gemini Auto 临时聊天执行两次产品请求，原样输入与来源核验见 AI 审计。不给域名时找到两域名和英文排球详情，但将《寻找李白》的田波误写为“天博”，把 Yuheng 占位扩写为研究成果，iMathBook 的组建团队/主导开发描述不完整。随后给定六个中文详情 URL，五页明确未读到正文；排球回答虽提供了受英文详情支持的细节，实际引用仍为英文 canonical，不能算指定中文页读取成功。角色错字未纠正。该实测证明产品间结果不同，不能将 web 工具结论推广到所有 AI；也不能凭答案中的引用标记认定六页已读。两次产品请求与 78 条工具查询分开计数，其他消费者产品未在本轮测试。

## 维护交付清单

- **已更新：**独立主页 README 展示名；维护总览的资源、临时备份、恢复和待办；搜索指南的名称事实与后续平台证据；本审计。
- **待处理：**Google 中文 sitemap 报告失败原因及后续处理，Bing 所需授权与两域名导入，AI 当前正文的自然发现/读取和消费者产品引用复核；索引、曝光和引用继续分别取证。
- **按用户要求暂缓：**百度侧备案登记和反馈，本轮不再操作或等待相关材料；不否定、撤销用户已提供的真实备案。
- **不适用：**没有本站页面、交互、媒体、DNS、CI 变量/secret 或独立服务变更，没有新自动化；不需要静态发布或服务器回滚。
- **验证与恢复：**本地文档检查相对链接、路径、差异和敏感信息；文档通过 Git 历史恢复，GitHub README 及 GSC 新增提交记录恢复按上文处理。未经新验证不复用旧测试作为本轮验收。

本轮最终文档核验覆盖维护总览、搜索指南和三份新增审计：87 个本地链接均存在，代码围栏、尾部空白和凭据模式扫描通过，`git diff --check` 无错误。根代理另行复核公开 HTTP/媒体原始结果和 AI 工具记录，确认 28 次 HTML GET 与 276 次媒体 HEAD 均为 200，AI 直接读取为 24 次不可访问、1 次 Cache miss、3 个旧快照。本站源码与静态版本未改，不复跑构建或复用旧测试作为本轮验收；文档使用 `[skip ci]` 提交，不触发静态发布。
