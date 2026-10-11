# 2026-10-11 AI 检索、直接读取与引用核验

## 执行范围与结论

执行日期：**2026-10-11，Asia/Shanghai（UTC+08:00）**。检索与直接读取主要执行于 **21:30–21:36**；普通 HTML 对照执行于 **21:33:57**，媒体对照完成于 **21:35:27**。本报告是新一轮实测，不覆盖同日较早的历史记录。

本子任务入口为 Codex 代理可用的 **`web.search_query`、`web.image_query`、`web.open`**（通过 `web__run` 调用）。这些工具结果不等同于 ChatGPT 消费者产品、Gemini、Claude 或 Perplexity 的各自验收；Gemini 产品界面另见下方根代理补充小节。工具未提供检索后端、用户地区、个性化和全量索引范围信息。Google/Bing 控制台证据由本轮另一项审计单独记录。百度侧备案登记继续按用户要求暂缓，本次没有操作百度平台。

检查前分支为 `main`，HEAD 为 `4b154a1`，单一工作树、工作区干净。范围来自本机 `.build/discovery/zh.json`、`en.json` 的 `indexable: true` 条目和 [搜索指南](../SEARCH.md)；每站 14 页，包含首页、聊天静态入口、9 个项目/活动图集、3 篇文章。公开 manifest 同时可读。两站 [中文健康入口](https://xuesiyuan.com/__health) / [英文健康入口](https://siyuanxue.com/__health) 在本轮返回同一部署 SHA：`57a0c8a9d744e9ed511594452737c75e09db65dc`。本地文档提交与网站部署 SHA 的不同不是发布失败。

- **自然检索：28 条无域名限制的文本查询中，5 条返回本站 URL，去重后仅 2 页：英文首页和英文开站短记。** 中文姓名、别名、所有图集主题和自然语言综合问题均未取得目标详情页。5 条中的建站动机查询返回的是开站短记、排球跨语言查询返回的是首页，不能算相应详情页命中。
- **逐 URL 定向检索：28 条（双域名各 14）中，3 条所要求的 canonical 精确命中，均为英文首页、建站动机、开站短记。** 中文 14 条全部空结果；英文不少带详情路径的查询被工具放宽到同域名其他页。另做 2 条视频定向查询，不纳入这 28 条分母。
- **AI 直接 URL 读取：28 次，24 次 “not accessible via this tool”、1 次 “Cache miss”；3 次返回旧抓取快照。** 本轮没有一页获得足以确认是当前部署内容的 AI web 实时读取证据。不能把 3 个缓存结果写成 3 个当前页读取通过。
- **普通 HTTPS：28/28 当前 HTML 返回 200、无跳转，语言及唯一 canonical 匹配。** 这与 AI web 失败同时成立，说明不能仅凭工具错误断言网站下线、robots 封禁、真实爬虫抓取失败或所有 AI 产品不可达。
- **媒体发现：18 条无域名限制的中英图片查询覆盖全部 9 个图集，另 2 条 site 图片查询，均未返回本站来源页；视频主题查询也未返回本站对应详情页/媒体。** 普通 HTTP 的媒体可达性单独通过，见下文。
- **引用准确性：完成 3 个“提供实时 HTTP 提取正文的受控引用核验”示例。** 提供正文后可以建立受来源支持、区分个人与团队、保留时间和证据边界的答案；这不是自然搜索成功、消费者产品引用或独立盲测成绩。
- **Gemini Auto 补充：根代理独立执行 2 次临时聊天请求。** 找到两域名和英文排球详情，但六个指定中文详情没有对应正文读取成功证据；存在英文替代来源、田波误写“天博”及占位研究被扩写为成果等问题，详见单独小节。

本检索子任务没有修改正文、路由、元信息、图片、视频、顶栏、爬虫策略、服务、账户、secret 或定时器；截至本子任务交付时没有提交、推送或对外发布。根任务后续对审计文档的提交与推送另行记录。

## 方法与判定口径

1. 每条文本查询独立调用，使用原样 `q`，`response_length: long`，不设置 recency。自然查询不加 `site:`、不传 domains，也不预先提供目标 URL。查完无域名限制样本后才进行定向和直接读取；后面的补充无姓名样本仍按工具参数归类为自然查询，不声称是独立无上下文消费者会话。
2. “命中本站”只数返回来源 URL 的 hostname 为 `xuesiyuan.com` 或 `siyuanxue.com`；“详情页命中”另要求完整 canonical 路径一致。相似词、原论文、其他同名人、其他大学页面、同域名首页和旧占位页不能替代目标详情页。
3. 返回列表并非某搜索引擎的固定前十名、完整结果集或曝光报告。表中保留原查询、目标、本站命中和首个其他来源，便于复跑；“没有返回”只描述本次工具结果，不写“全网未收录”。
4. 对 28 个 canonical 使用 `web.open`；工具会返回缓存，无法强制其从源站实时读取。旧版首页列表、旧双语混排和旧文章段落与本次 HTTPS 正文不一致，因此明确记为旧快照。
5. 普通 HTTPS 对照使用 Python `urllib.request` GET，UA 为 `Mozilla/5.0 (compatible; public-site-audit)`；没有伪装为搜索爬虫。解析 HTML 的 `lang`、canonical 和可见正文。首次受限网络环境 DNS 解析失败；在获准的网络环境重跑后 28 次成功，最终表只将成功重跑作为 HTTP 证据，不把本机沙箱 DNS 错误归因于站点。
6. 媒体核对读取公开页面 HTML 与仓库公开资源元数据，通过 HEAD 验证 URL 与类型；未下载媒体作为显示限制的绕过手段。没有逐像素判断照片人物、播放视频逐帧、验证音轨或重算视频完整内容哈希。
7. 受控案例由当前代理在读取实时公开正文后撰写并逐句回查。本人站点是第一方陈述；本人 GitHub 仓库仍属本人维护的第一方项目材料。机构报道和原论文需另行读取，失败就保留失败，不用链接存在代替独立佐证。没有访问访客聊天记录、会话、私人记忆或草稿。

## 无域名限制的文本查询

以下覆盖姓名/别名、无姓名主题、角色/组织、自然语言、跨语言、全部 14 个候选路径和视频主题。ID 按执行顺序；Q21–Q48、Q52–Q53 为另表定向查询，所以这里编号不连续。

| ID | 原样查询（无 site、无域名过滤） | 预期落点 | 本站返回结果 | 首个返回来源（用于复核歧义） |
|---|---|---|---|---|
| Q1 | 薛思远 | `/` | 未返回本站 URL | [薛思远-晋中信息学院](https://www.jzci.edu.cn/info/2821/95861.htm) |
| Q2 | Siyuan Xue BUPT | `/` | [Siyuan Xue（薛思远）｜Personal Website](https://siyuanxue.com/) | [Siyuan Xue（薛思远）｜Personal Website](https://siyuanxue.com/) |
| Q3 | Miles BUPT | `/` | 未返回本站 URL | [BUPT · GitHub](https://github.com/bupt) |
| Q4 | iMathBook uMathHub 开发 | `/gallery/imathbook/` | 未返回本站 URL | [I Math Hub - Apps on Google Play](https://play.google.com/store/apps/details?id=school.management.tufeestudent.imath) |
| Q5 | LeDA Neo4j LangGraph | `/gallery/leda-agent/` | 未返回本站 URL | [LangGraph + Neo4j Integration - Neo4j Labs](https://neo4j.com/labs/genai-ecosystem/genai-frameworks/langgraph/) |
| Q6 | Pixel Done 安卓待办 | `/gallery/pixeldone/` | 未返回本站 URL | [Limit interruptions with Modes & Do Not Disturb on Pixel phone or Pixel Tablet - Pixel Phone Help](https://support.google.com/pixelphone/answer/6111295?hl=en-2) |
| Q7 | B-Spline Policy 复现 | `/gallery/b-spline-policy/` | 未返回本站 URL | [B-spline Policy](https://b-spline-policy.github.io/) |
| Q8 | BNDS.life 高三视频 | `/gallery/bnds-life/` | 未返回本站 URL | [高考志愿填报知识讲座／百年生涯升学规划](https://www.bnsya.com/spkc/) |
| Q9 | 与光同行 叶培大 | `/gallery/walking-with-light/` | 未返回本站 URL | [叶培大：与光同行，烛照后学 - 中华人民共和国教育部政府门户网站](https://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2024/2024_zt06/rmxyjyj/202404/t20240425_1127524.html) |
| Q10 | 寻找李白 田波 | `/gallery/finding-li-bai/` | 未返回本站 URL | [抢票！原创舞台剧《寻找李白》第六轮展演！_烈士_时空_地下党员](https://www.sohu.com/a/1028975985_121106842) |
| Q11 | 曹禺 家 高觉新 薛思远 | `/gallery/family/` | 未返回本站 URL | [家 (小说)](https://zh.wikipedia.org/wiki/%E5%AE%B6_%28%E5%B0%8F%E8%AF%B4%29) |
| Q12 | 北邮 校排球队 院排球队 薛思远 | `/gallery/volleyball/` | 未返回本站 URL | [北京邮电大学世纪学院](https://ccbupt.com.cn/sjyw/603947dcc56041deb20a39878ab17c71.htm) |
| Q13 | 为什么建立个人网站 薛思远 | `/essay/why-this-site/` | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/) | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/) |
| Q14 | AI 订阅额度 API 成本 薛思远 | `/post/congrats-you-hit-the-limit/` | 未返回本站 URL | [sub2api/README_CN.md at main · Wei-Shaw/sub2api · GitHub](https://github.com/Wei-Shaw/sub2api/blob/main/README_CN.md) |
| Q15 | 个人网站上线短记 薛思远 | `/post/first-note/` | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/)<br>[Siyuan Xue（薛思远）｜Personal Website](https://siyuanxue.com/) | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/) |
| Q16 | 薛思远 AI 助手 聊天 | `/chat/` | 未返回本站 URL | [AI Conversation](https://ai-conversation.youdao.com/) |
| Q17 | 薛思远参与过哪些项目，各自做了什么？ | `多个项目页` | 未返回本站 URL | [明新记忆丨薛思远：幻想的未来里种下现实的花_新闻学_学期_核心](https://www.sohu.com/a/906234519_121124305) |
| Q18 | 薛思远有哪些工程以外的公开经历？ | `话剧与排球页` | 未返回本站 URL | [程思远](https://zh.wikipedia.org/wiki/%E7%A8%8B%E6%80%9D%E8%BF%9C) |
| Q19 | Walking with Light Ye Peida Siyuan Xue | `/gallery/walking-with-light/` | 未返回本站 URL | [Ye Peida](https://en.wikipedia.org/wiki/Ye_Peida) |
| Q20 | BUPT volleyball Siyuan Xue | `/gallery/volleyball/` | [Siyuan Xue（薛思远）｜Personal Website](https://siyuanxue.com/) | [Siyuan Xue（薛思远）｜Personal Website](https://siyuanxue.com/) |
| Q49 | B-Spline Policy robot demo Siyuan Xue | `/gallery/b-spline-policy/` | 未返回本站 URL | [B-spline Policy](https://b-spline-policy.github.io/) |
| Q50 | LeDA Agent 演示 薛思远 | `/gallery/leda-agent/` | 未返回本站 URL | [AgentOne企业级Agent平台 - 瓴羊](https://www.lydaas.com/agentone) |
| Q51 | 薛思远 北京邮电大学 | `/` | 未返回本站 URL | [教师一览-北京邮电大学 计算机学院（国家示范性软件学院）](https://scs.bupt.edu.cn/szjs1/jsyl.htm) |
| Q54 | 曹禺 家 高觉新 北邮 话剧 | `/gallery/family/` | 未返回本站 URL | [北京师范大学《家》在实验剧场上演_中央戏剧学院](https://www.chntheatre.edu.cn/cn/xiao/detail/11280.html) |
| Q55 | 北邮 校排球队 院排球队 | `/gallery/volleyball/` | 未返回本站 URL | [校级组织 ／ BUPT 生存指南](https://guide.byrdocs.org/%E5%AD%A6%E7%94%9F%E7%BB%84%E7%BB%87/%E6%A0%A1%E7%BA%A7%E7%BB%84%E7%BB%87/) |
| Q56 | 为什么建立个人网站 把想法写清楚 | `/essay/why-this-site/` | 未返回本站 URL | [为什么我要做一个个人网站？ · Latent Note](https://andingdrlin.github.io/blog/why-personal-website/) |
| Q57 | AI 订阅额度 API 成本 心理记账 | `/post/congrats-you-hit-the-limit/` | 未返回本站 URL | [计费、Credits与订阅 - APIGOTO API 文档](https://www.apigoto.com/apidoc/guide-billing.html) |
| Q58 | 个人网站上线短记 Markdown 中英 | `/post/first-note/` | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/) | [A short note on launch — Siyuan Xue](https://siyuanxue.com/post/first-note/) |


Q2、Q15、Q20 的英文首页结果含旧项目占位描述；Q13、Q15、Q58 的英文短记结果包含早期双语文本。Q1/Q17/Q18 返回的同名人物不能归并为本站作者；本轮没有根据名字相同补入论文、工作经历或奖项。Q7/Q49 找到原研究资料不代表找到作者本人的复现页。Q49/Q50 是普通 web 检索中的视频语义查询，工具没有独立视频垂直搜索 API，不能据此宣称视频专区收录状态。

## 定向检索

实际 URL 缩写：[E-首页](https://siyuanxue.com/)、[E-建站](https://siyuanxue.com/essay/why-this-site/)、[E-短记](https://siyuanxue.com/post/first-note/)、[E-旧占位](https://siyuanxue.com/wip/)。

Q21–Q48 对应双域名 28 canonical 候选。仅 Q35/Q37/Q48 所要求路径精确命中。Q52/Q53 为补充视频定向测试。定向结果常返回域名内其他页，故不能把“site 查询返回了本站”误当“这个详情页已被发现”。

| ID | 原样定向查询 | 实际返回的本站页面 | 所要求路径是否精确命中 |
|---|---|---|---|
| Q21 | `site:xuesiyuan.com 薛思远` | 空结果 | 否 |
| Q22 | `site:xuesiyuan.com/chat/ AI 助手` | 空结果 | 否 |
| Q23 | `site:xuesiyuan.com/essay/why-this-site/ 为什么建这个站` | 空结果 | 否 |
| Q24 | `site:xuesiyuan.com/gallery/b-spline-policy/ B-Spline` | 空结果 | 否 |
| Q25 | `site:xuesiyuan.com/gallery/bnds-life/ BNDS.life` | 空结果 | 否 |
| Q26 | `site:xuesiyuan.com/gallery/family/ 家 高觉新` | 空结果 | 否 |
| Q27 | `site:xuesiyuan.com/gallery/finding-li-bai/ 寻找李白 田波` | 空结果 | 否 |
| Q28 | `site:xuesiyuan.com/gallery/imathbook/ iMathBook` | 空结果 | 否 |
| Q29 | `site:xuesiyuan.com/gallery/leda-agent/ LeDA` | 空结果 | 否 |
| Q30 | `site:xuesiyuan.com/gallery/pixeldone/ Pixel Done` | 空结果 | 否 |
| Q31 | `site:xuesiyuan.com/gallery/volleyball/ 排球` | 空结果 | 否 |
| Q32 | `site:xuesiyuan.com/gallery/walking-with-light/ 与光同行` | 空结果 | 否 |
| Q33 | `site:xuesiyuan.com/post/congrats-you-hit-the-limit/ AI 额度` | 空结果 | 否 |
| Q34 | `site:xuesiyuan.com/post/first-note/ 开站短记` | 空结果 | 否 |
| Q35 | `site:siyuanxue.com Siyuan Xue` | E-首页、E-短记、E-建站、E-旧占位 | 是 |
| Q36 | `site:siyuanxue.com/chat/ AI assistant` | E-首页、E-建站、E-短记 | 否 |
| Q37 | `site:siyuanxue.com/essay/why-this-site/ Why this site` | E-建站、E-首页、E-短记 | 是 |
| Q38 | `site:siyuanxue.com/gallery/b-spline-policy/ B-Spline` | E-首页、E-短记、E-建站 | 否 |
| Q39 | `site:siyuanxue.com/gallery/bnds-life/ BNDS.life` | E-建站、E-首页、E-短记 | 否 |
| Q40 | `site:siyuanxue.com/gallery/family/ Family Gao Juexin` | E-首页、E-短记、E-建站 | 否 |
| Q41 | `site:siyuanxue.com/gallery/finding-li-bai/ Finding Li Bai Tian Bo` | E-首页、E-建站、E-短记 | 否 |
| Q42 | `site:siyuanxue.com/gallery/imathbook/ iMathBook` | E-首页、E-短记、E-建站 | 否 |
| Q43 | `site:siyuanxue.com/gallery/leda-agent/ LeDA` | E-首页、E-建站、E-短记 | 否 |
| Q44 | `site:siyuanxue.com/gallery/pixeldone/ Pixel Done` | E-首页、E-短记、E-建站 | 否 |
| Q45 | `site:siyuanxue.com/gallery/volleyball/ volleyball` | E-首页、E-短记、E-建站 | 否 |
| Q46 | `site:siyuanxue.com/gallery/walking-with-light/ Walking with Light` | E-首页、E-短记、E-建站 | 否 |
| Q47 | `site:siyuanxue.com/post/congrats-you-hit-the-limit/ Congrats limit` | E-首页、E-短记、E-建站 | 否 |
| Q48 | `site:siyuanxue.com/post/first-note/ short note launch` | E-短记、E-首页、E-建站 | 是 |
| Q52 | `site:siyuanxue.com B-Spline Policy robot demo` | E-首页 | 否；所求 B-Spline 视频详情未返回 |
| Q53 | `site:xuesiyuan.com LeDA 演示` | 空结果 | 否 |


Q35 还返回旧 `/wip/`，该路由在当前清单中不属于索引候选。这里记录的是旧缓存曝光迹象，不把它加入候选清单，也不据此推断当前 noindex 设置失败；清理效果需在相关平台后续重新抓取和报告中验证。

## 28 个 canonical 直接读取对照

AI 结果码：**F** = 明确返回 URL “is not accessible via this tool”；**M** = “Failed to fetch … Cache miss”；**C** = 返回可读正文但为旧抓取快照。三类均不能证明读取了当前部署。HTTP 列是 **21:33:57 本机普通网络**独立 GET，全部唯一 canonical 与输入 URL 一致；响应字节和摘要用于辨识本次观察快照，动态重新抓取后摘要可能变化。

| canonical URL（逐项测试） | AI web.open 结果 | 普通 HTTPS GET | HTML 字节 | SHA-256 前 16 位 |
|---|---|---|---:|---|
| [xuesiyuan.com/](https://xuesiyuan.com/) | F：工具不可访问 | 200，无跳转，zh-CN | 17651 | `fa9ebb0e23ddf9b6` |
| [xuesiyuan.com/chat/](https://xuesiyuan.com/chat/) | F：工具不可访问 | 200，无跳转，zh-CN | 19131 | `84c87b2f1d8f25ed` |
| [xuesiyuan.com/essay/why-this-site/](https://xuesiyuan.com/essay/why-this-site/) | F：工具不可访问 | 200，无跳转，zh-CN | 17234 | `e31ebe353c36f6be` |
| [xuesiyuan.com/gallery/b-spline-policy/](https://xuesiyuan.com/gallery/b-spline-policy/) | F：工具不可访问 | 200，无跳转，zh-CN | 23149 | `e96917b73c11d3e0` |
| [xuesiyuan.com/gallery/bnds-life/](https://xuesiyuan.com/gallery/bnds-life/) | F：工具不可访问 | 200，无跳转，zh-CN | 28135 | `1c67573447adf392` |
| [xuesiyuan.com/gallery/family/](https://xuesiyuan.com/gallery/family/) | F：工具不可访问 | 200，无跳转，zh-CN | 36299 | `a6fda9bce0b03237` |
| [xuesiyuan.com/gallery/finding-li-bai/](https://xuesiyuan.com/gallery/finding-li-bai/) | F：工具不可访问 | 200，无跳转，zh-CN | 35837 | `4fb212eb8d7438fe` |
| [xuesiyuan.com/gallery/imathbook/](https://xuesiyuan.com/gallery/imathbook/) | F：工具不可访问 | 200，无跳转，zh-CN | 32643 | `96ec52b239bdb15c` |
| [xuesiyuan.com/gallery/leda-agent/](https://xuesiyuan.com/gallery/leda-agent/) | F：工具不可访问 | 200，无跳转，zh-CN | 21222 | `5062ea6b21ede70d` |
| [xuesiyuan.com/gallery/pixeldone/](https://xuesiyuan.com/gallery/pixeldone/) | F：工具不可访问 | 200，无跳转，zh-CN | 27037 | `2feb56a0bd6146b1` |
| [xuesiyuan.com/gallery/volleyball/](https://xuesiyuan.com/gallery/volleyball/) | F：工具不可访问 | 200，无跳转，zh-CN | 38420 | `44eecb9fcbcd5286` |
| [xuesiyuan.com/gallery/walking-with-light/](https://xuesiyuan.com/gallery/walking-with-light/) | F：工具不可访问 | 200，无跳转，zh-CN | 53611 | `df3bc0ca7e753fd2` |
| [xuesiyuan.com/post/congrats-you-hit-the-limit/](https://xuesiyuan.com/post/congrats-you-hit-the-limit/) | F：工具不可访问 | 200，无跳转，zh-CN | 13081 | `b73a1c16685eb52e` |
| [xuesiyuan.com/post/first-note/](https://xuesiyuan.com/post/first-note/) | F：工具不可访问 | 200，无跳转，zh-CN | 12097 | `b88ee21c815cb755` |
| [siyuanxue.com/](https://siyuanxue.com/) | C：旧快照，Crawled 4 days ago | 200，无跳转，en | 17870 | `f91f6ceb0e79ca87` |
| [siyuanxue.com/chat/](https://siyuanxue.com/chat/) | F：工具不可访问 | 200，无跳转，en | 19318 | `f37b8cdeeafa2749` |
| [siyuanxue.com/essay/why-this-site/](https://siyuanxue.com/essay/why-this-site/) | C：旧快照，Crawled last month | 200，无跳转，en | 17195 | `76510f2e08b0dec5` |
| [siyuanxue.com/gallery/b-spline-policy/](https://siyuanxue.com/gallery/b-spline-policy/) | F：工具不可访问 | 200，无跳转，en | 23874 | `e5c59bd589a7c0d9` |
| [siyuanxue.com/gallery/bnds-life/](https://siyuanxue.com/gallery/bnds-life/) | F：工具不可访问 | 200，无跳转，en | 28721 | `3a918cfde9246c75` |
| [siyuanxue.com/gallery/family/](https://siyuanxue.com/gallery/family/) | F：工具不可访问 | 200，无跳转，en | 37238 | `9a705069a2b7bad0` |
| [siyuanxue.com/gallery/finding-li-bai/](https://siyuanxue.com/gallery/finding-li-bai/) | F：工具不可访问 | 200，无跳转，en | 36510 | `1ee031a5f2da9258` |
| [siyuanxue.com/gallery/imathbook/](https://siyuanxue.com/gallery/imathbook/) | F：工具不可访问 | 200，无跳转，en | 33220 | `9493023c919ed889` |
| [siyuanxue.com/gallery/leda-agent/](https://siyuanxue.com/gallery/leda-agent/) | F：工具不可访问 | 200，无跳转，en | 21689 | `7d0db6090c60f8b2` |
| [siyuanxue.com/gallery/pixeldone/](https://siyuanxue.com/gallery/pixeldone/) | F：工具不可访问 | 200，无跳转，en | 27323 | `67d66863817af2e1` |
| [siyuanxue.com/gallery/volleyball/](https://siyuanxue.com/gallery/volleyball/) | F：工具不可访问 | 200，无跳转，en | 39610 | `92a575a0b9fa3c07` |
| [siyuanxue.com/gallery/walking-with-light/](https://siyuanxue.com/gallery/walking-with-light/) | F：工具不可访问 | 200，无跳转，en | 54177 | `db6cac171e0302e9` |
| [siyuanxue.com/post/congrats-you-hit-the-limit/](https://siyuanxue.com/post/congrats-you-hit-the-limit/) | M：Cache miss | 200，无跳转，en | 13001 | `a84f45f6359a1ee3` |
| [siyuanxue.com/post/first-note/](https://siyuanxue.com/post/first-note/) | C：旧快照，Crawled last month | 200，无跳转，en | 12256 | `ffd614d149591f8a` |


旧快照的可复核差异：

- 英文首页直接读取标记 “Crawled: 4 days ago”，仍列旧 `ProbFun` / `PixelDone` 及占位排球，缺少现行多个图集入口；实时 HTTP 已有 `Pixel Done`、B-Spline Policy、BNDS.life、三部话剧等当前列表。
- 两篇英文文章直接读取标记 “Crawled: last month”，出现中英混排及旧 RSS 计划；实时 HTTP 为固定英文。文章内容中的 2026 年 7 月发布日期是原文时间，不是本次部署或抓取时间。
- 英文首页的搜索摘要标记抓取时间与直接 open 的标记也不同，说明这两个入口不能自动视为同一最新快照。
- 失败信息没有给出可审计的具体 robots、WAF 或网络拒绝原因；本报告不推断原因。即使以后某产品能读，也不能反向消除本次失败证据。

## 图片与视频

### 图片检索

I1–I18 为无 site、无 domains 的图片查询，每个图集各一条中文和英文样本。I19–I20 是域名定向补充。全部未返回本站来源 URL，不能以主题相似图片代替本人项目截图或照片。

| ID | 原样图片查询 | 目标图集路径 | 本站图片来源命中 | 首个返回来源 |
|---|---|---|---|---|
| I1 | iMathBook uMathHub 截图 | `/gallery/imathbook/` | 未取得 | [错题订正-学生端 - 帮助中心](https://zx-math.17zuoye.com/exam-help/%E6%93%8D%E4%BD%9C%E6%B5%81%E7%A8%8B/%E3%80%90%E8%80%83%E8%AF%95%E9%98%85%E5%8D%B7%E3%80%91/%E9%80%9A%E7%94%A8/%E9%94%99%E9%A2%98%E8%AE%A2%E6%AD%A3-%E5%AD%A6%E7%94%9F%E7%AB%AF) |
| I2 | LeDA 智能体 演示 截图 | `/gallery/leda-agent/` | 未取得 | [Purple Apps - iPhone and iPad Apps by David Picknell](https://purpleapps.ai/) |
| I3 | Pixel Done 安卓 截图 | `/gallery/pixeldone/` | 未取得 | [Here's everything new in the Android 11 Beta ／ Android Central](https://www.androidcentral.com/heres-everything-new-android-11-beta) |
| I4 | B-Spline Policy 真机实验 图片 | `/gallery/b-spline-policy/` | 未取得 | [Why Robots Keep Crashing Into Walls (And How Diffusion Fixed It) – Foundation Models & Robotics](https://layernorm.dev/posts/robotics/1-diffusion-policy/index.html) |
| I5 | BNDS.life 网站 截图 | `/gallery/bnds-life/` | 未取得 | [过年私藏的小网站，深夜专用 ／ 阿云的宝库](https://yunxge.cn/archives/25) |
| I6 | 与光同行 叶培大 薛思远 照片 | `/gallery/walking-with-light/` | 未取得 | [A Amizade de Jia Haixia e Jia Wenqi ／ Momentos ternos - TudoPorEmail](https://www.tudoporemail.com.br/content.aspx?emailid=6521) |
| I7 | 寻找李白 田波 薛思远 照片 | `/gallery/finding-li-bai/` | 未取得 | [首次披露！《简牍探中华》专家揭秘里耶古城遗址考古新发现_国内频道_新闻中心_长江网_cjn.cn](https://news.cjn.cn/bsy/gnxw_19788/202312/t4760020.htm) |
| I8 | 家 高觉新 薛思远 演出照片 | `/gallery/family/` | 未取得 | [话剧《家客》再归来， 周野芒、宋忆宁、钱程同台飚戏叙说人生！ - 演出 -  子彦娱乐 - ziyanent.com.cn](https://ziyanent.com.cn/portal.php?aid=14530&mod=view) |
| I9 | 北邮 排球 薛思远 照片 | `/gallery/volleyball/` | 未取得 | [缪伊雯太牛！一人之力带领四川击败福建！庄宇珊郑益昕状态不佳！／胡进／四川女排／梁桂倩／二传／扣球_新浪新闻](https://k.sina.com.cn/article_7563502179_1c2d1e263001018ax6.html) |
| I10 | iMathBook uMathHub screenshots | `/gallery/imathbook/` | 未取得 | [4:57 PM N 14.3 Vo 4G+ 89 ST 9: Mathematics IX (ศิธิ ... 10 11 12 13 14 15..](https://askfilo.com/user-question-answers-smart-solutions/4-57-pm-n-14-3-vo-4g-89-st-9-mathematics-ix-sithi-10-11-12-3335323033303330) |
| I11 | LeDA Agent Neo4j screenshots | `/gallery/leda-agent/` | 未取得 | [Daddy Agent ／ Devpost](https://devpost.com/software/daddy-agent) |
| I12 | Pixel Done Android app screenshots | `/gallery/pixeldone/` | 未取得 | [Las 20 mejores apps de pixel art en móvil](https://vinduapp.com/post/las-mejores-apps-de-pixel-art-en-movil.html) |
| I13 | B-Spline Policy Siyuan Xue robot images | `/gallery/b-spline-policy/` | 未取得 | [Robotic Arm Trajectory Planning Based on Improved Slime Mould Algorithm](https://www.mdpi.com/2075-1702/13/2/79) |
| I14 | BNDS.life website screenshots | `/gallery/bnds-life/` | 未取得 | [Support - Using B Better - B Better](https://bbettermembership.com/support-using-b-better/) |
| I15 | Walking with Light Ye Peida Siyuan Xue photos | `/gallery/walking-with-light/` | 未取得 | [11 Rekomendasi Tontonan Drama China yang Masih On Going Sejak Juni hingga Juli 2025 - KapanLagi.com](https://www.kapanlagi.com/foto/berita-foto/korea/11-rekomendasi-tontonan-drama-china-yang-masih-on-going-sejak-juni-hingga-juli-2025.html) |
| I16 | Finding Li Bai Tian Bo Siyuan Xue photos | `/gallery/finding-li-bai/` | 未取得 | [该文章已不存在_手机新浪网](https://k.sina.cn/article_7857201856_1d45362c0019020gda.html) |
| I17 | Family Gao Juexin Siyuan Xue theatre photos | `/gallery/family/` | 未取得 | [四川人艺原创小剧场话剧《共生》首演 看成都家庭有哪些板眼儿_四川在线](https://sichuan.scol.com.cn/ggxw/202211/58767036.html) |
| I18 | BUPT volleyball Siyuan Xue photos | `/gallery/volleyball/` | 未取得 | [缪伊雯太牛！一人之力带领四川击败福建！庄宇珊郑益昕状态不佳！／胡进／四川女排／梁桂倩／二传／扣球_新浪新闻](https://k.sina.com.cn/article_7563502179_1c2d1e263001018ax6.html) |
| I19 | site:xuesiyuan.com 图片 照片 截图 | `双域名全部` | 未取得 | 空结果 |
| I20 | site:siyuanxue.com screenshots photos | `双域名全部` | 未取得 | 空结果 |


这些结果没有给出可确认来自本站的图片，因此 **AI 图片搜索的“目标图片—来源页—alt—原图”闭环未通过**。以下 HTTP/HTML 检查只证明本站自身的关联与可达性，不算图片搜索命中。

### 当前 HTML 与媒体 URL 对照

每站 64 张候选原图（首页肖像 1 张、9 图集共 63 张）、5 个公开视频（B-Spline 3、LeDA 2）。双语页共享相对媒体路径，语言文字分别维护。

| 当前图集路径 | 每站图片数 | 每站视频数 | 本轮 HTML 元信息检查 |
|---|---:|---:|---|
| `/gallery/imathbook/` | 7 | 0 | alt 与构建清单一致，展示图属于同一原图的登记变体 |
| `/gallery/leda-agent/` | 1 | 2 | 同上；两个标题、source 与 poster 分别匹配 |
| `/gallery/pixeldone/` | 5 | 0 | alt 与构建清单一致，展示图/原图关系匹配 |
| `/gallery/b-spline-policy/` | 1 | 3 | 同上；1×、2×、4× 三个标题、source 与 poster 分别匹配 |
| `/gallery/bnds-life/` | 5 | 0 | alt 与构建清单一致，展示图/原图关系匹配；这是网站截图页，不将其等同于站内原生视频页 |
| `/gallery/walking-with-light/` | 16 | 0 | alt 与构建清单一致，展示图/原图关系匹配 |
| `/gallery/finding-li-bai/` | 9 | 0 | 同上 |
| `/gallery/family/` | 9 | 0 | 同上；Bilibili 是外部演出录像链接，不计入本站 5 个视频 |
| `/gallery/volleyball/` | 10 | 0 | alt 与构建清单一致，展示图/原图关系匹配 |

媒体检查结果：

- 28 页 HTML 中，清单图数、可见 `img` 数、alt 顺序与文本一致；视频数、`aria-label`、MP4 source 和 poster 逐项一致，没有关系差异。
- 双站 **128 组原图—展示图**关系逐项在 `src/data/media.json` 的同一资源/variants 中核对，没有串图引用；没有遍历每张图的全部 AVIF/WebP 尺寸变体。
- **276 次 HEAD 均 200**：128 原图 + 128 页面实际 `img src` 展示图 + 10 MP4 + 10 poster。均有大于零的 Content-Length；MIME 合计为 128 `image/webp`、100 `image/jpeg`、38 `image/png`、10 `video/mp4`。
- 视频共 5 个独立作品、两个域名各一套访问，不把 10 个 URL 写成 10 个作品。视频文件/海报可达不证明 AI 能播放、理解内容或搜索引擎已建立视频索引。当前 B-Spline 真机数据展示是图片，3 个 MP4 是仿真速度演示，不能误写成 3 个真机视频。

## 受控跨页引用核验

以下三个例子统一采用：**把 21:33:57 普通 HTTPS 提取的公开正文提供给本代理，再作综合和逐项引用检查。** 这些详情页的 `web.open` 未成功，因此不能包装成仅凭 web 搜索就完成的回答。来源都是公开内容，未将任何私人材料公开化。

### 案例 A：项目、时间与个人贡献

问题：“薛思远参与过哪些工程项目，各自做了什么？哪些是个人工作，哪些是合作或复现？”

受控答案与证据核对：

| 可引用的答案要点 | 支持位置 | 核验与限制 |
|---|---|---|
| 据本人介绍，他于 2025 年 5 月加入 ProbFun，7 月组建 iMathBook 团队并主导其开发；uMathHub 是 ProbFun 后续名称关系的一部分。 | [iMathBook 中文页](https://xuesiyuan.com/gallery/imathbook/)的本人角色与首段；[英文对应页](https://siyuanxue.com/gallery/imathbook/) | 角色和年月对应；不把“主导 iMathBook”扩大成独自创建/完成两个平台。不把累计服务人次写成独立用户数；官方认证和人次仍为本人陈述。 |
| LeDA 是他与室友共同开发的项目；2025 年 7–8 月开始，使用 Neo4j 与 LangGraph，个人身份为项目组成员。 | [LeDA 中文页](https://xuesiyuan.com/gallery/leda-agent/)的本人角色与首段；[英文对应页](https://siyuanxue.com/gallery/leda-agent/) | 合作关系明确。正文/证书图说记 2026 年 7 月国家级结题，本轮校方入口未读成功，不能称已获独立官方核实。 |
| Pixel Done 首版据本人记述于 2026 年 6 月底用一天完成；工作包括设计、AI 协作开发、分发和持续维护。 | [Pixel Done 中文页](https://xuesiyuan.com/gallery/pixeldone/)的时间、角色与首段；[英文对应页](https://siyuanxue.com/gallery/pixeldone/) | 一天仅指首版，不能改成全部开发维护仅花一天；保留真实项目名及稳定路由。 |
| 2026 年 7–8 月实习期间，他复现并改进 Han、Xiong 等人的 B-Spline Policy，做了训练、推理、仿真与真机实验。 | [B-Spline 中文页](https://xuesiyuan.com/gallery/b-spline-policy/)的时间、角色与首段；[英文对应页](https://siyuanxue.com/gallery/b-spline-policy/) | 个人贡献是复现和实验，不是原论文首创。页面中平滑度改善限于该组数据，不推广为所有任务/速度。 |
| BNDS.life 据本人记述于 2026 年 9 月用一周完成主要功能，工作包括网站设计开发、视频整理和部署。 | [BNDS.life 中文页](https://xuesiyuan.com/gallery/bnds-life/)的时间、角色与首段；[英文对应页](https://siyuanxue.com/gallery/bnds-life/) | 一周限于主要开发，不等于未来无需维护；不把朋友们的高中经历归为个人独立作品。 |

额外来源核验：本轮成功读取 [B-Spline 原论文](https://arxiv.org/abs/2607.09648)，作者为 Xiaoshen Han、Haoyu Xiong、Haonan Chen、Chaoqi Liu、Antonio Torralba、Yuke Zhu、Yilun Du，提交于 2026-07-10，作者列表没有 Siyuan Xue。这支持区分原研究与个人复现，**并不独立证明实习或个人实验成果**。[本人项目仓库](https://github.com/Siyuan-Xue/openpi05-bsp)可读且明确为 openpi 的 fork；仓库 About 描述 BSP 相关实现，是本人项目材料，不能作为独立第三方认证，也不能把继承的上游 README 中所有能力归给本人。

判定：提供实时正文后，五个项目的角色、时间和引用可对应；仅自然查询的发现链没有达到同样覆盖。

### 案例 B：工程之外的经历与团队荣誉

问题：“What has Siyuan Xue done outside engineering, and which roles or awards can the sources actually support?”

| 受控英文答案要点 | 来源与定位 | 核验与限制 |
|---|---|---|
| In his own account, Xue's theatre debut was as Gao Juexin in *Family*. | [Family](https://siyuanxue.com/gallery/family/)的角色和首段；[中文对应页](https://xuesiyuan.com/gallery/family/) | 首次登台与角色对应；未给出确切演出日期，不填年份。 |
| His second production was *Finding Li Bai*, playing Tian Bo. | [Finding Li Bai](https://siyuanxue.com/gallery/finding-li-bai/)的角色和首段；[中文对应页](https://xuesiyuan.com/gallery/finding-li-bai/) | 第二次与角色对应；不推断是首次/第几轮全剧制作，也不由照片时间补日期。 |
| He says he played Ye Peida in *Walking with Light*, staged at BUPT in October 2025 and at the Central Academy of Drama in November. | [Walking with Light](https://siyuanxue.com/gallery/walking-with-light/)首段；[中文对应页](https://xuesiyuan.com/gallery/walking-with-light/) | 本人角色和剧目演出时间对应。奖项段是剧目层面的描述，不能写“He personally won Best Actor”。 |
| He describes playing for BUPT's university and college volleyball teams, competing in Beijing, and winning campus championships with college teammates. | [Volleyball](https://siyuanxue.com/gallery/volleyball/)角色与首段；[中文对应页](https://xuesiyuan.com/gallery/volleyball/) | 主语和团队归属对应；未给赛季、具体名次、数量、队长身份，不补。 |

本轮 [北邮获奖报道](https://www.bupt.edu.cn/info/1079/90114.htm)经 AI web 返回 HTTP **412 Precondition Failed**，所以没有把该外链标记为本轮读取成功或个人获奖的佐证。本轮没有对外部《家》录像逐帧识别人，照片及自述也不能替代独立演员名单。跨语言标题、角色和已写出的时间在本次双站正文中相符；这不等同于跨语言自然查询已经找到详情页。

判定：受控答案能保留角色与团队边界；自然跨语言查询 Q19 没有本站结果，Q20 只找到首页，不能支持上述完整细节。

### 案例 C：写作动机、上线短记与 AI 额度观点

问题：“这些文章说明他为什么写个人网站，以及如何看待 AI 使用额度？文章日期能否证明当前部署？”

受控回答：他在 2026 年 7 月 14 日的建站文章中，把动机放在完成较长的表达和集中展示项目/活动；同日短记记录第一版骨架与中英 Markdown 配对的扩展方式。7 月 19 日的额度文章讨论订阅限额与 API 成本在消费者/企业语境下不同的心理记账。把三篇文章并读，可以归纳其对表达方式和工具使用的关注；最后一句是本次阅读归纳，不是新增个人履历。[建站动机](https://xuesiyuan.com/essay/why-this-site/)、[开站短记](https://xuesiyuan.com/post/first-note/)、[AI 额度观点](https://xuesiyuan.com/post/congrats-you-hit-the-limit/)

| 检查项 | 判定 |
|---|---|
| 角色与来源 | 都是本人观点/回忆，不包装成产品官方文档或他人采访。 |
| 时间 | 7 月 14 日、7 月 19 日与当前正文日期对应；不把日期当成当前 Actions 发布时间。 |
| 成果 | 短记仅证明作者当时记述的第一版骨架；当前上线版本仍由健康 SHA/Actions 验证。 |
| 价格与成本 | 额度文章是观点讨论，没有提取或补造当下任何厂商的价格、套餐或实际企业财务结果。 |
| 缓存差异 | 英文建站/短记能从 web 取得旧快照，但本例用当前 HTTP 文本；英文额度页 web Cache miss，故整个三页综合不记为 web-only 通过。 |

判定：受控引用支持文字结论和时间边界；自然搜索只发现英文短记，不能当作三个文章主题均已自然可发现。

## 根代理补充：Gemini Auto 产品界面实测

本节由本轮根代理在 **2026-10-11 约 21:35–21:40，Asia/Shanghai** 的 Gemini Auto 临时聊天中执行，再将观测证据转交本文汇总；本子代理没有独立重复操作。证据是当前工作对话里的 `cua_repl` 可访问性文本及实际打开的来源弹窗，无本地截图路径。本节 **2 次产品请求**与前文 **78 条 web 工具查询样本**分别计数；产品内部实际改写了多少查询未知，不把二者混为 80 条检索。

### 第一次：不给域名的公开经历发现

原样输入：

> 请联网检索北京邮电大学的薛思远（Siyuan Xue，也使用 Miles 这个名字）的公开经历。尝试找到他的个人网站，以及与他本人有关的项目、话剧和排球经历页面。请用简短表格列出：经历、本人具体角色、实际来源链接。区分个人贡献与团队成果；没有找到或无法核实的项目请明确说明。只使用公开网页，不使用当前账号的私人资料或聊天历史。

观察结果：

- Gemini 找到两个域名。根代理打开来源弹窗，确认有 [中文首页](https://xuesiyuan.com/)（摘要对应当前内容）以及 [英文排球详情页](https://siyuanxue.com/gallery/volleyball/)；工程和话剧的多项结论主要引用 [英文首页](https://siyuanxue.com/)。
- 这证明本次 Gemini 产品入口的发现结果与本代理 web 工具不同；不把一种入口的失败推广到另一种。
- `iMathBook` 仅概括为参与开发，没有辨认详情页所写的组建团队和主导开发；这属于贡献描述不完整，不是“参与”这一宽泛表述本身为假。
- 把《寻找李白》角色写为 **“天博”**，与公开中英详情页的 **田波 / Tian Bo** 不符，属于具体事实错误。
- 将尚属占位的 Yuheng 条目写成研究成果并赋予“科研项目参与者”角色，没有可用正文支持实际贡献；不能凭首页列名补全研究成果。该条不应进入已核实公开成果清单。

### 第二次：指定六个中文详情 URL

原样输入：

```text
现在做直接读取与多页面综合核验。请实际打开以下六个页面，不要仅根据首页摘要、网址名称或上一轮回答补全内容：
https://xuesiyuan.com/gallery/imathbook/
https://xuesiyuan.com/gallery/pixeldone/
https://xuesiyuan.com/gallery/b-spline-policy/
https://xuesiyuan.com/gallery/walking-with-light/
https://xuesiyuan.com/gallery/finding-li-bai/
https://xuesiyuan.com/gallery/volleyball/
请逐页报告能否读取正文，并提取1—2项具体事实，用对应页面链接引用。最后用这些页面回答：薛思远的工程贡献、戏剧角色和排球经历分别是什么？把本人陈述与独立外部证明分开，团队获奖不能写成个人奖项。无法读取就明确标记，不猜测。
```

| 指定中文路径 | Gemini 自述 / 实际来源核验 | 本轮判定 |
|---|---|---|
| `/gallery/imathbook/` | 明确表示读不到正文，仅据首页摘要 | 中文详情读取未通过 |
| `/gallery/pixeldone/` | 同上 | 中文详情读取未通过 |
| `/gallery/b-spline-policy/` | 同上 | 中文详情读取未通过 |
| `/gallery/walking-with-light/` | 同上 | 中文详情读取未通过 |
| `/gallery/finding-li-bai/` | 同上；综合中仍重复“天博” | 中文详情读取未通过，角色错误未纠正 |
| `/gallery/volleyball/` | 声称该页读取成功，但实际来源弹窗 URL 为 **英文** `https://siyuanxue.com/gallery/volleyball/`，带包含 “within a week” 的 text fragment | 英文替代来源提供了正文细节，不能计为指定中文页直接读取成功 |

排球回答正确获得“入学一周内加入校队与院队”，并将校内冠军归于与队友共同取得，未将团队荣誉写成独立个人奖。该细节能由 [英文排球详情](https://siyuanxue.com/gallery/volleyball/)支持。页面来源仍为本人陈述，即使 Gemini 称已核实页面，也不构成独立外部证明。

**产品层结论：**本次 Gemini 能发现两域名和英文排球详情，但六个指定中文详情均未取得对应 canonical 正文读取成功证据；有一个英文替代来源、角色错字和占位研究过度推断。该结果只属于本次 Auto 模式、这两次请求和这段时间，不能据此声称 Gemini 全面通过/失败，亦不能代替其他产品测试。以后复测必须检查来源弹窗的实际 URL，不能仅数答案中的引用标记。


## 失败边界、可执行后续与维护清单

1. **保留当前准确正文和稳定 URL。** 当前 HTML 和媒体入口可读，不能为缓解本次检索失败追加未经支持的角色、成绩、关键词页、隐藏事实或改名路由。
2. **后续复测优先看新抓取是否替代旧快照。** 使用本报告原样样本，分别记录产品/入口、时间、完整来源 URL、当前还是缓存、精确路径匹配。先看中文站和新增详情页的读取/搜索变化，再比较自然语言综合和图片视频；不承诺固定排名。
3. **工具失败原因仍待查。** 如需定位网络、WAF 或爬虫差异，应核对同一时间真实服务器访问日志/平台抓取诊断，再决定是否修改；本轮没有读取服务器日志，不因 “not accessible” 就放宽安全规则或训练爬虫策略。
4. **外部证据仍有缺口。** LeDA 校方页未读成功、话剧获奖报道 412；未来可在可用官方入口重试，仍须确认具体姓名、角色和获奖对象。本人仓库可用来了解实现，不提升为独立验证。
5. **按产品保留各自实测。** Gemini Auto 的两次临时聊天结果见上节；消费者 ChatGPT、Claude、Perplexity 尚未在本报告中测试。后续仍需分别记录输入、模式、来源弹窗和正文覆盖，不能把 web 工具或 Gemini 的结论推广到其他产品。
6. **百度登记继续暂缓。** 当前报告没有改变其所有权/额度/索引状态，也没有使用 Google、Bing、IndexNow 或 AI 工具回执替代百度证据；不新建自动化。
7. **恢复方式：** 本次仅新增审计文档；修正文档采用新更正说明保留时间语义。网站、媒体和服务没有发生需回滚的本轮变更。

| 维护项 | 本轮状态 |
|---|---|
| 当前 Git/工作树、历史记录、维护联动表 | 已核对；不处理归档、未推送提交或备份 |
| 全部候选与多种查询方式 | 已记录：28 自然文本、28 逐路径定向、2 视频定向、20 图片查询，共 78 查询样本 |
| AI 直接读取与普通 HTTP 分开 | 已记录 28 对照；失败与旧快照保留 |
| 公开事实及双语引用 | 已完成 3 个受控案例；个人/团队、第一方/外部、时间/部署分开 |
| 图片视频 | 已核对公开元信息与 276 次 HEAD；搜索发现和视觉/播放能力未证明 |
| 搜索平台所有权/提交、维护总览入口 | 本报告不修改；由父任务合并本轮相关平台证据与本报告入口 |
| 可见网站、服务、数据存储、账号、密钥、定时任务、发布 | 不适用：没有变更 |
| 外部独立佐证与各 AI 消费产品后续观察 | Gemini Auto 两次请求已单列；其他产品及外部缺口待处理，不把未取得证据写成通过 |

## 复核说明

查询表保留了全部原样输入；使用同一类工具独立重跑，按返回 URL 完整路径计数，不按摘要关键词计数。直接读取按 28 URL 表逐项 `open`，同时做普通 HTTPS GET。HTTP 摘要只用于本次快照辨识，不是搜索平台提供的收录证据。临时原始提取结果在本机 `/tmp/ai-retrieval-validation-http.json`、`/tmp/ai-retrieval-validation-media.json` 和 `/tmp/ai-query-summary.json`，它们不是长期备份或稳定审计链接；本文件保留可复跑的输入、结果和边界。没有把无关搜索结果的全文或私人资料提交到仓库。
