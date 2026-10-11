# 搜索与 AI 可发现性维护

长期目标见 [AGENTS.md](../AGENTS.md)，资源、发布和恢复见[维护总览](MAINTENANCE.md)。本指南覆盖全站当前及未来公开内容；以下样本是 2026-10-11 的基线，不是允许索引的主题白名单。

## 平台优先级与下一阶段验收

2026-10-11 用户明确：**中文站 `xuesiyuan.com` 重点在百度**。中文站优先验收百度发现、抓取、收录及中文查询曝光；继续维护 Google、Bing 与 AI 跨平台发现，保留已完成的 Google 站点验证和稳定路由。英文站继续安排 Google/Bing 维护，这是当前实施安排，不代表用户另行明确了英文平台排序。

1. 在百度搜索资源平台核查已有站点，优先复用；没有站点时按平台提供的方式验证 `xuesiyuan.com`，保留既有 DNS 与 Google 验证记录。
2. 从当前构建清单取得全部中文索引候选 URL（当前 14 个），按账号实际开放的普通提交、API 或 sitemap 能力提交，记录实际入口、配额和回执；不预设 API、快速收录或 sitemap 入口必定可用，未开放时记录限制和可执行的替代入口。
3. 分别核查百度抓取、索引及中文查询报告；查询覆盖下表全部内容类型与查询方式。记录实际返回页面、时间和证据，暂无数据与未取得权限分别标注。
4. 保持 Google 中文 sitemap 异常复查、英文索引观察和 Bing 接入待办；AI 搜索发现、直接读取 URL 与多页面综合继续独立检查。维护频率沿用月度检查和季度政策复核，不创建定时自动化。

百度平台当前归属、提交与收录情况须以百度实际界面或回执取证。Google 本次 28 URL 的 8 个已索引、19 个未知及 1 个历史 noindex，以及 IndexNow HTTP 202，均不能视为百度状态。当前操作证据与待办见[百度优先级审计](audits/2026-10-11-baidu-priority.md)。

百度接入当前进展：用户已完成账户资料和安全验证码，平台站点显示 `https://www.xuesiyuan.com`，分类为“信息技术”“其它”。所有权页仅提供文件和 HTML 标签验证，已选择 HTML 标签；GitHub Actions repository variable `BAIDU_SITE_VERIFICATION_ZH` 已配置，用于仅向中文首页 `<head>` 输出 `baidu-site-verification`。代码待发布，百度“完成验证”权限操作待确认，尚未完成平台验证或提交。平台要求验证后保留标签；实际值不写入源码或文档。此前输入 apex、当前显示 www 的原因及属性适用范围待核查，现有 canonical 与重定向保持不变。各阶段事实保留在本次审计，私人资料和验证码不入文档。

百度验证变量须在首次新提交发布前配置。部署按 SHA 复用产物，后续修改或移除变量都必须使用新 commit SHA 走正常 Actions；重跑或手动触发同一 SHA 不足以更新线上标签。验证实际中文首页 HTML、英文站排除、两域名 release SHA 及百度回执；停用前先核对所有权影响。

20:07:47 北京时间，以模拟 Baiduspider/2.0 访问中文站 14 个 HTML 候选页及 7 个公开入口，21 次请求均返回 200、无跳转；HTML 语言、canonical、noindex 排除检查及 sitemap 集合核对通过。该检查只证明当前访问来源使用该 UA 时可读取页面，不证明百度真实抓取、支持相关 sitemap 格式、已收录或已有曝光；完整结果见本次审计。

## 内容发布约定

1. 保持中英文内容配对和稳定 URL。正常页面经首页或正文的 HTML 链接可达；新页面类型须登记公开/索引策略。新文章与图集从内容集合自动进入清单。
2. `description` 保持现有正文用途；可选 `seoDescription` 只提供元信息摘要，缺省回退 `description`。摘要应交代人物与内容的实际关系，不能增加正文不存在的成绩或经历。
3. 使用真实日期。未知日期留空，不以构建时间或图片文件时间代替作品、演出或上传日期。视频 sitemap 所需事实缺失时报告缺项，不捏造。
4. 图片/视频原件和缩略图继续按媒体指南上传，Git 仅维护 ID 与元数据。只有允许索引页面实际引用的公开媒体进入发现入口，尺寸变体不重复计为作品。
5. 预览、占位及重定向不进入 sitemap。`noindex` 页要允许爬虫读取该指令；robots 不是隐私访问控制。私人内容不得进入公开构建。
6. 文章 RSS 保持原身份；图集等通过首页与 sitemap 发现。公开 IndexNow manifest 仅列可索引 URL 和内容摘要哈希，不含草稿、聊天或私有事实。

原生文章视频同样被构建扫描：`video[src]` 或第一个安全 `source[src]`、`poster`、`title`/`aria-label` 和相邻 `figcaption`/`aria-description` 提供已有公开信息；已知真实上传日期和时长可分别标注 `data-upload-date`、`data-duration`。缺项进入报告，不回退文章日期；不存在的日历日期被拒绝。图集中已有的视频元数据优先，替代编码不计为新作品。

## 事实与证据基线

本表核对日期均为 **2026-10-11**。本人页面是第一方陈述；链接到报道、论文或项目本身不自动证明所有个人贡献。未在本轮成功读取外部证据时，不标记“独立核实”。事实变化时同时检查双语正文、元数据和本表。

| 内容 / 稳定路径 | 第一方事实来源 | 外部资料 / 本轮证据状态 |
|---|---|---|
| 个人 `/` | `src/data/site.ts`：薛思远 / Siyuan Xue，北邮专业、工程方向、话剧与排球经历 | GitHub 账号公开 name/bio/blog、独立主页 README 与两仓库 About 已经 API 核查，姓名及域名一致；不等于校方学籍验证 |
| iMathBook `/gallery/imathbook/` | 双语 JSON 的加入 ProbFun、组建团队与开发经历 | [iMathBook](https://imathbook.com)、[uMathHub](https://umathhub.com) 是项目入口；“官方认证”和使用量沿用本人正文，未新增独立验证结论；摘要不强化该指标 |
| LeDA `/gallery/leda-agent/` | 双语 JSON 的团队、知识图谱与 RAG 实现 | [北邮项目页](https://win.bupt.edu.cn/program.do?id=9909) 本轮 web 读取不可用；国家级结题仍按本人陈述记录，不声称本轮独立核实 |
| Pixel Done `/gallery/pixeldone/` | 双语 JSON 的设计、开发和维护经历 | [公开源码](https://github.com/Siyuan-Xue/PixelDone) 为项目链接；个人主页 README 仍显示旧称 `PixelDone / 像素清单`，待独立仓库更新；本站保持 Pixel Done |
| B-Spline Policy `/gallery/b-spline-policy/` | 双语 JSON 的实习、复现、仿真与真机实验 | [代码](https://github.com/Siyuan-Xue/openpi05-bsp)、[原论文](https://arxiv.org/abs/2607.09648) 为关联资料；明确原研究作者与个人复现贡献，实验结论不泛化到所有任务 |
| BNDS.life `/gallery/bnds-life/` | 双语 JSON 的高三回忆、一周网站开发经历 | [项目](https://bnds.life)、[代码](https://github.com/Siyuan-Xue/bnds.life)；开发时长为本人陈述 |
| 《与光同行》 `/gallery/walking-with-light/` | 双语 JSON 的饰演叶培大及演出经历 | [北邮获奖报道](https://www.bupt.edu.cn/info/1079/90114.htm) 本轮 web 返回 412，其他来源沿用正文链接；剧目奖项不得转写为个人获奖 |
| 《寻找李白》 `/gallery/finding-li-bai/` | 双语 JSON：饰演田波、第二次参演 | 无独立外链；本人陈述及公开演出照片 |
| 《家》 `/gallery/family/` | 双语 JSON：首次登台、饰演高觉新 | [演出录像](https://www.bilibili.com/video/BV1ZD421u7mP/) 为资料链接；本轮未逐帧核验 |
| 排球 `/gallery/volleyball/` | 双语 JSON：校队与院队、赛事经历 | 无独立外链；本人陈述及比赛照片，不补队员名单、名次、赛季或奖项数量 |
| 为什么建站 `/essay/why-this-site/` | 双语 Markdown 本人文章 | 观点文章，保留实际发布日期，无需包装外部佐证 |
| AI 额度 `/post/congrats-you-hit-the-limit/` | 双语 Markdown 本人文章 | 观点文章，不将定价讨论写成最新厂商价格信息 |
| 开站短记 `/post/first-note/` | 双语 Markdown 本人短记 | 站点发布回忆，不将文字日期替代部署 SHA 的时间证据 |
| 聊天 `/chat/` | 静态入口和公开使用说明 | 用户消息、动态回复、持久化会话和服务记忆不进入内容清单或 sitemap 媒体 |

`yuheng`、`layout-preview`、`wip`、`404` 和 `probfun` 重定向不属于索引候选；不能因这里提到它们就加入 sitemap。

## 查询、抓取与引用检查

每次从构建清单导出全部候选 URL，两域名分别检查；本轮 14 个候选路径即上表。状态分列 HTTP/原始 HTML、平台索引、曝光、AI 引用。未登录平台或暂无结果填写“未取得证据”，不能填“未收录”。

| 方式 | 样本与期望落点 |
|---|---|
| 姓名 / 别名 | 薛思远、Siyuan Xue、Miles + BUPT；首页确认同一人，再跟随具体经历链接 |
| 无姓名的项目查询 | iMathBook uMathHub 开发、LeDA Neo4j LangGraph、Pixel Done 安卓待办、B-Spline Policy 复现、BNDS.life 高三视频；落到各项目页 |
| 事件 / 角色 / 组织 | 与光同行 叶培大、寻找李白 田波、曹禺 家 高觉新、北邮 校排球队 院排球队；落到相应经历页 |
| 研究及新内容 | 真实研究公开后按其主题、贡献及论文关联生成样本；占位 Yuheng 不提前争取索引 |
| 文章主题 | 为什么建立个人网站、AI 订阅额度与 API 成本、个人网站上线短记；落到具体文章 |
| 自然语言 | “薛思远参与过哪些项目，各自做了什么？”“他有哪些工程以外的公开经历？”核对多页面综合，避免将团队成果归给个人 |
| 跨语言 | Walking with Light Ye Peida Siyuan Xue；BUPT volleyball Siyuan Xue；中英文人物与译文链接一致 |
| 图片 | 每个图集主题 + 照片/截图，以及英文同义查询；核对来源页、alt、缩略图与原图对应关系 |
| 视频 | B-Spline Policy robot demo、LeDA Agent 演示；核对所属页面、视频标题、公开原件和缩略图；不承诺进入视频专栏 |
| AI 直接读取 | 给定每个 canonical URL，不靠搜索缓存，检查正文能否读取、事实能否引用 |
| AI 搜索发现 | 不给 URL，只提供姓名或主题，记录实际返回来源、查询时间和产品；结果不能代表所有引擎 |
| AI 多页综合 | 指定若干经历页，要求区分角色、时间、第一方陈述与外部来源，逐项核对引用是否支持结论 |

2026-10-11 本轮搜索工具执行四条姓名/项目/角色查询时，返回过英文首页，但摘要仍是旧的“整理中”项目列表；话剧与 iMathBook 组合查询没有取得可确认的目标详情页结果。这是该工具当次结果，不能据此断言 Google/Bing/百度未收录。直接抓取与部署验收另见当次审计。

## 平台、通知与维护

- 2026-10-11 首轮核查时 Google Search Console、Bing Webmaster Tools、百度搜索资源平台均未登录；这是当时的证据边界。同日后续 Chrome 已登录 Google，原资源列表只有 X 和 YouTube，没有两网站。用户明确确认保存 TXT 并授予当前账号所有者权限后，`sc-domain:siyuanxue.com` 显示 Ownership verified、`sc-domain:xuesiyuan.com` 显示 Ownership auto verified，方式均为 Domain name provider。
- 两域名使用 DNSPod（`lennon.dnspod.net` / `radius.dnspod.net`）。19:01 分别保存 `@` Google 验证 TXT，默认线路、TTL 600，公开 DNS 值完全匹配；原有 `@` / `www` A 均指向 `82.156.77.131`、TTL 600，保持不变。持续验证需要保留 TXT；账号邮箱与 TXT 值不写入文档。注册商、到期日仍未知。
- [中文 sitemap](https://xuesiyuan.com/sitemap-index.xml) 与[英文 sitemap](https://siyuanxue.com/sitemap-index.xml) 均已提交。英文详情显示 Sitemap index processed successfully，最终列表复查 Status Success；中文约 19:11 复查仍显示 Sitemap could not be read，但 19:11:49 Google 对该 XML 的实时抓取成功；未给 XML 申请索引。中文 Manual actions 为 No issues detected；报告失败原因尚未确定，不能断言一定是延迟，后续复查。两站 Last read 均为 `10/11/26`、discovered pages/videos 均为 0，不能用这些初始计数推断未收录；总览 processing data，平台提示约一天后查看，没有创建自动化。
- 同次公网核对两域名 index、三个子 sitemap 与 robots.txt，在普通和 Googlebot UA 下共 20 次请求均返回 200、无重定向，XML 可解析且 robots 允许抓取；模拟 UA 不代表真实 Google 抓取来源。当前每站 14 个候选 URL 均已检查：[28 URL 清单](audits/2026-10-11-search-console-onboarding.md)记录 8 个已索引、19 个 Google 未知、1 个英文排球页历史 noindex 排除。当前英文排球 HTML 不含 noindex，Google 实时测试也已确认 Page can be indexed；该页及两站首页请求均返回 Indexing requested，已加入优先抓取队列；实际后续收录/更新仍待复查。不能将历史抓取或 URL unknown 当成当前 robots 阻断结论。该次结束时 Bing/百度尚待登录后核查；本轮百度的新状态见上方平台优先级及本次审计。
- IndexNow 验证键通过 GitHub 仓库 secrets `INDEXNOW_KEY_EN`、`INDEXNOW_KEY_ZH` 管理，值为公开所有权验证材料，但不写入源码或维护文档。变更键时重新构建发布并检查每域名验证文件；工作流通知结果与待重试列表独立记录。200/202 接收不等于已索引。
- 每月优先检查中文站百度新增/删除页面、抓取与索引原因、姓名与无姓名中文查询及媒体结果，同时维护 Google/Bing 和 AI 引用准确性；每季度检查爬虫政策。没有创建定时自动任务。
- 搜索与 AI 的依据以官方说明为准：[Google AI 搜索](https://developers.google.com/search/docs/appearance/ai-features)、[Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)、[OpenAI 爬虫](https://developers.openai.com/api/docs/bots)、[Anthropic 爬虫](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)、[Perplexity 爬虫](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)、[IndexNow](https://www.indexnow.org/faq)。保留现有训练策略；搜索可达不等于同意新增训练用途。
