# 图集内容维护

图集用于展示已有项目、研究或活动的真实材料。内容模型在 [gallery.ts](../src/utils/gallery.ts)，集合入口在 [content.config.ts](../src/content.config.ts)，配对和读取入口在 [galleries.ts](../src/utils/galleries.ts)，呈现在 [GalleryContent.astro](../src/components/GalleryContent.astro)。开始更新前先读 [维护总览](MAINTENANCE.md)。

## 文件与双语配对

每个图集使用一个稳定 slug，并提供两个 JSON 文件：

```text
src/content/galleries/<slug>/en.json
src/content/galleries/<slug>/zh.json
```

slug 只用小写英文字母、数字及单个连字符，例如 `project-notes`；不要使用空格、下划线、连续连字符或语言后缀。公开地址为 `/gallery/<slug>/`，由两域名各自显示固定语言版本。两语言的 `category`、`order`、`preview` 和 `layout` 必须相同，其余文字需准确翻译。

`draft` 默认是 `true`，控制页面是否公开；`preview` 默认是 `false`，标记公开页面是否仍为占位预览。普通图集任一语言为草稿，则两个域名均不公开该图集。缺翻译的草稿不会成为公开图集；准备公开时必须配齐两语言，并同时将 `draft` 设为 `false`。缺少公开译文、分类、排序或预览状态不一致会阻止构建，不应通过删掉验证绕过。

| 状态 | 两语言字段 | 生产页面 | 首页 / sitemap |
|---|---|---|---|
| 正式图集 | `draft: false`、`preview: false` | 公开，可索引 | 均进入 |
| 条目占位预览 | `draft: false`、`preview: true` | 公开，`noindex` | 进入首页，不进 sitemap |
| 普通草稿 | 任一语言 `draft: true` | 不生成 | 均不进入 |
| 固定版式样例 `layout-preview` | `draft: true`、`preview: true` | 特例公开，`noindex` | 均不进入 |

`layout-preview` 是唯一允许草稿公开的固定例外；`preview: true` 本身不会使普通草稿公开。sitemap 根据内容 JSON 的草稿与预览状态排除页面，不另维护各预览条目的 slug 名单。

## 字段与真实素材

以下仅说明结构，示例保持草稿；媒体 ID 必须换成已准备并直传校验的清单条目才能使用。

```json
{
  "title": "图集标题",
  "description": "简短介绍：说明真实背景及展示内容。",
  "period": "2026 年 10 月",
  "homeMeta": "简短说明",
  "role": "准确说明本人承担的工作或参与方式。",
  "category": "projects",
  "order": 0,
  "draft": true,
  "preview": false,
  "images": [
    {
      "src": "project-notes/overview",
      "alt": "描述图片中可见内容的替代文本。",
      "caption": "说明这张图片的背景、本人贡献或必要出处。"
    }
  ],
  "links": [
    {
      "label": "原始项目资料",
      "href": "https://example.com/project"
    }
  ]
}
```

`title`、`description`、`role` 及每张图片的 `alt`、`caption` 都必须是非空文本。`description` 同时用于页内短介绍与页面描述，无需另写 Markdown 正文。`period` 是可选的图集时间或活动背景文本，可表达区间、持续工作或周年活动；它不是文章发布日期，不应为了 SEO 编造日期。`homeMeta` 是可选的独立首页括号文案，只填写简短说明，不展示年月或时间区间；图集正文仍可使用 `period`。未提供 `homeMeta` 时首页不显示括号，不回退展示 `period`。两个字段填写时都必须非空，并分别在两语言一致选择显示或省略。不需要时间或括号的持续兴趣同时省略两语言的 `period` 和 `homeMeta`，首页不显示括号，图集也不输出空的时间段落。正式图集的 `role` 应写本人实际角色，不把参与写成领导，也不把设计示意写成实际成果。占位预览可明确写「待补充实际角色」或「时间待补充」，不能用推测填满字段。

`images` 至少一张。`src` 是 [media.json](../src/data/media.json) 中的图片 ID，例如 `project-notes/overview`；未知 ID 或视频 ID 会阻止构建。两语言可以引用同一图片。原图和缩略图保存在服务器 `shared/media/`，不再保存在 Git；先按 [直传流程](../ops/README.md#direct-media-uploads) 准备、上传、校验，再修改双语 JSON。使用有权展示的真实图片或实际项目截图，保留准确图注和出处。`alt` 描述图片本身，`caption` 补充上下文，两者都要提供各语言版本。不要虚构人物身份、照片、成果或活动事实。

`preview: true` 时可以复用抽象占位图，但介绍、替代文本和图注必须明确其为排版示意，不代表真实项目画面或经历。尚为预览的首页条目复用清单中 `gallery-preview/hero`、`gallery-preview/detail`、`gallery-preview/portrait`、`gallery-preview/closing` 四张示意图；标题、已知年份和既有资料链接沿用原始内容，角色与贡献待核实。占位页可用于查看完整导航和灯箱，不作为个人成果证据。

`layout` 默认为 `photos`，沿用照片图集：首图优先加载且通栏，后续两张并列，未配对的末张通栏；600px 及以下全部单列。

需要区分同一图集中的不同主题时，可添加 `imageSections`，例如 `[{"title":"校排球队","start":0},{"title":"院排球队","start":4}]`。`start` 是原始 `images` 数组的零起始索引：第一组必须从 `0` 开始，后续索引严格递增且小于图片总数。每组一直显示到下一组的起点，最后一组显示剩余图片；不留空组。两语言必须使用相同的分区数量、起点及图片顺序，标题分别翻译。每区使用可见二级标题，并各自沿用当前照片或产品布局；只有整页第一张优先加载。灯箱仍按整页图片顺序连续浏览，图注 ID 全页唯一。未填写时保持原来的单一图集版式。

产品界面截图可在两份 JSON 中设置 `"layout": "product"`。产品图集桌面三列、600px 及以下两列，所有图片采用相同的宽度限制，不单独放大首图或末图；图片宽度最多 11.25rem（默认字号下为 180px），窄屏会继续缩小。Pixel Done 采用该布局，让竖屏截图作为紧凑的功能展示。两语言布局不一致会阻止构建。

两种布局均保持原始比例，图注常驻页内。点击图片打开可前后切换、缩放及用 Escape 关闭的多图灯箱；可见控件使用英文。无 JavaScript 或灯箱加载失败时，普通链接仍可访问原图。

演示或模拟器结果可使用可选 `videos` 数组，并用 `videoDescription` 补充比较说明。每项填写视频媒体 ID `src`、图片媒体 ID `poster`、可见 `label`、常驻 `caption`、实际时长 `duration`（秒）和首次公开的 `uploadDate`（`YYYY-MM-DD`）。图片与视频 ID 不可混用；两语言必须引用相同数量、顺序的视频和预览帧。视频与预览帧先直传校验，再发布引用。不要通过播放器改变录制结果的速度来冒充不同实验。

视频默认使用 `videoLayout: "comparison"`：桌面三列并排，600px 及以下单列，每个最多 224px。产品演示可设置 `videoLayout: "demos"`，按顺序单列排列，与正文共用窄栏宽度，手机上随正文缩小；两语言必须采用同一布局。`demos` 与图片一样只在媒体下方显示说明，不显示各视频的上方小标题；视频之间以及视频区到图片区的间距均为 2rem，图注使用相同字体、颜色及行高。视频 `label` 仍用于播放器辅助技术名称、下载链接名称及元信息，不能删空。可用 `videoTitle` 提供各语言的总标题，未填写时沿用「模拟器结果 / Simulation results」；显式设为 `null` 时不显示总标题，视频区仍有供辅助技术读取的名称。`comparison` 继续显示各视频标题：有总标题时用三级标题，无总标题时用二级标题。两语言必须同步显示或隐藏总标题。两种布局均保持原比例，使用浏览器原生播放控件、行内播放和元数据预加载，不自动播放。视频下方保留下载链接，即使脚本关闭也可播放或获取原文件；图片灯箱只处理图片。页面元信息在 `ImageGallery` 中添加对应 `VideoObject`，使用真实时长、公开日期与预览帧。

可使用 `comparison` 的非空 `title`、`description` 提供简短结果说明，直接输出 HTML。图片内已有的实验表格不在正文中重复制作；原图可通过灯箱放大。说明应忠实于实验记录，不将单次结果写成普遍性能保证。

`links` 默认是空数组，只有需要资料链接时才填写。每个链接必须有非空 `label`，且 `href` 只允许完整 HTTP(S) 地址。不要写 `javascript:`、设备码、私有配置、带凭据的 URL 或恢复密钥。

## 首页关联与博客

`category` 只允许 `projects`、`research`、`appearances`。非草稿的正式图集和条目占位预览均进入对应首页分类；`order` 是整数，默认为 `0`，数值较小的图集先被读取，相同值按 slug 稳定排序。两语言必须使用相同值。

已有首页条目在 [site.ts](../src/data/site.ts) 中用 `gallerySlug` 关联图集。slug 和分类匹配且已公开时，该条目的标题、首页括号和链接改用图集内容，并指向站内 `/gallery/<slug>/`；同一图集不会重复列出。原有首页条目保留其既定位置，新公开且尚未关联的图集按上述顺序追加到对应分类，因此 `order` 不会任意重新排列现有首页条目。

2026-10-11 首页括号后续按用户指定的「时间 · 简短说明」改由八个图集的双语 `homeMeta` 提供。五个项目依次为数学教学平台、开发者知识图谱与 RAG、安卓待办清单、具身智能算法复现与创新、视频播放平台；三部话剧依次说明北邮70周年校庆献礼新大师剧、上一部大师剧第五轮复演、剧团年度大戏。用户补充确认《寻找李白》为 2024 年 10 月、《家》为 2024 年 6 月；《与光同行》沿用已知的 2025 年 10–11 月。排球队继续省略两个字段，不显示括号。《家》的双语 `links` 同时增加用户提供的 Bilibili 演出录像 `BV1ZD421u7mP`，使用不含追踪参数的稳定视频链接。图集详细经历、媒体及入口保留；具体发布与恢复见 [首页括号审计](audits/2026-10-11-home-entry-context.md)。早期章节中的占位时间、空资料链接和校庆背景是当时阶段的记录。

同日用户进一步要求首页括号不再展示时间：八个双语 `homeMeta` 已改为仅保留简短说明，首页也不再从 `period` 或源资料 `year` 回退显示时间；图集正文的真实时间保留。维护规则与后续验证见 [顶栏与首页后续调整](audits/2026-10-11-header-toc-refinements.md)。上段「时间 · 简短说明」保留为此前版本的历史记录。

原有七个条目分别关联 `probfun`、`imathbook`、`leda-agent`、`pixeldone`、`yuheng`、`walking-with-light`、`volleyball`，以独立的公开占位页打通站内入口。没有公开图集的其他条目仍显示「整理中 / In preparation」，不继续外跳。来源数据中的原始外链仍被保留；适用链接及准确双语标签放入图集的 `links`，作为相关资料展示。不要把原外链替换成尚不存在的图集地址。

2026-10-11 后续按用户要求，`probfun` 与 `imathbook` 已合并为单一「iMathBook · uMathHub」条目，沿用 `/gallery/imathbook/`，在首页项目列表首位展示。原 `probfun` 双语占位 JSON 撤下，旧 `/gallery/probfun/` 由 Astro 静态跳转到合并页：HTML 提供即时刷新、可点击的备用入口、目标 canonical 和 `noindex`，旧路径不进入 sitemap；无需修改 Nginx。两个平台外链都在合并页保留。七张真实截图按用户顺序引用 `imathbook/screenshot-01` 至 `screenshot-07`，分为前三张 uMathHub 和后四张 iMathBook；双语 JSON 同时为正式图集。介绍、参与时间与本人角色依据用户提供的经历，素材直传、验证、实际发布和恢复见 [合并审计](audits/2026-10-11-imathbook-umathhub-gallery.md)。上段七个入口是此前占位阶段的记录，不代表合并后的首页数量。

`bnds-life` 是有真实截图与已确认介绍的正式项目图集，使用 `draft: false`、`preview: false`，首页项目列表进入 `/gallery/bnds-life/`。五张用户提供的原始截图已直传至服务器，由 `bnds-life/*` 媒体 ID 引用，两语言 JSON 共用图片并各自提供介绍、alt 和图注；页末保留项目网站和公开源码链接。其构建产物进入 sitemap，实际上线状态以维护总览及审计为准。

`pixeldone` 也已补齐用户确认的开发经历与五张真实 App 截图，在原址 `/gallery/pixeldone/` 转为正式图集。双语 JSON 共用 `pixeldone/*` 媒体 ID 对应的原始截图，依次展示待办首页、任务编辑、清单编辑、Dock 自定义和云端设置；相关资料保留 GitHub 仓库链接。时间写明首版开发一天，后续根据同学反馈持续迭代，不把截图里的同步异常状态当作成功同步的验收。其构建产物进入 sitemap；LeDA、《与光同行》和排球队同样补齐正式内容后，余下三个原有条目仍为占位预览。Pixel Done 与 BNDS.life 中文资料链接的可见名称均为「GitHub 仓库」。

`leda-agent` 在原址 `/gallery/leda-agent/` 补齐正式双语内容：2025 年 7–8 月与室友共同开发，LangGraph、Neo4j 知识图谱检索与长期个性化推荐；用户确认完整数据库包含 80,000 余个资源节点。两个原始演示视频按功能演示、图谱浏览的顺序展示，使用 `demos` 布局及真实录制帧作为封面，随后展示国家级大创项目结题证书。结题时间为 2026 年 7 月，个人角色为项目组成员，不写成负责人或获奖名次。两语言共用 `leda-agent/*` 媒体 ID，`preview: false`；首页保留既有入口，页末附北邮项目主页与 Awesome 仓库。来源、媒体与本轮发布结果见 [LeDA 审计](audits/2026-10-11-leda-gallery.md)。

`walking-with-light` 在原址 `/gallery/walking-with-light/` 转为正式图集，中文标题为「话剧《与光同行》· 饰 叶培大」，英文为「Walking with Light · as Ye Peida」。用户确认饰演男主角叶培大、五个多月的排练及 2025 年 10–11 月演出经历；奖项在正文中作为剧目经历呈现，不另行推定个人获奖归属。16 张用户提供的真实照片共用 `walking-with-light/photo-01` 至 `photo-16` 媒体 ID；横向舞台照作为首图，后续包含舞台、幕后、谢幕和赴中戏合影，沿用 `photos` 自然比例与双语图注、灯箱。页末保留用户指定的四篇报道。原始编号对应素材输入顺序，页面可以按叙事顺序排列；恢复时以 JSON 的 ID 顺序为准。媒体直传、资料核对及本轮发布结果见 [话剧图集审计](audits/2026-10-11-walking-with-light-gallery.md)。

`finding-li-bai` 是新增兴趣爱好图集，双语标题为「话剧《寻找李白》· 饰 田波 / Finding Li Bai · as Tian Bo」，路径为 `/gallery/finding-li-bai/`，首页排列在《与光同行》之后、排球队之前。用户确认这是第二次话剧演出及本人饰演田波，介绍保留剧团友谊与演出结束后的强烈不舍；未提供演出年月时，以「第二次参演话剧」表达相对经历，不猜测日期。九张真实照片对应 `finding-li-bai/photo-01` 至 `photo-09`；横向舞台全景作为首图，两张竖照并排，剧组与朋友合影在后，默认自然比例及灯箱保持不变。没有提供资料链接，`links` 为空，不添加推测来源。两语言同时为正式图集；媒体直传、内容与发布结果见 [本轮审计](audits/2026-10-11-finding-li-bai-gallery.md)。

`family` 是新增的正式兴趣爱好图集，标题为「话剧《家》· 饰 高觉新 / Family · as Gao Juexin」，稳定地址为 `/gallery/family/`，首页排列在《寻找李白》之后、排球队之前。用户确认这是首次登上话剧舞台并饰演男主角高觉新；介绍说明曹禺改编的剧目背景及本人大学生活体验。未提供年月时以「首次登上话剧舞台 / My theatre debut」表达经历，不猜测演出日期。九张真实照片按用户输入顺序引用 `family/photo-01` 至 `photo-09`，自然比例、图注与灯箱沿用现有 `photos` 布局，合影位于末尾。两语言同步公开并可索引，`links` 为空。媒体直传、验收与恢复见 [本轮审计](audits/2026-10-11-family-gallery.md)。

`volleyball` 在原址 `/gallery/volleyball/` 补齐十张真实照片及用户确认的经历：上大学后一周内加入校队和院队、代表学校参加多次北京市比赛、代表学院多次赢得校内比赛冠军。按用户后续要求，排球贯穿大学生活，两语言省略 `period`，首页和图集均不显示时间，不从单张横幅推定全部照片年份。编号 `volleyball/photo-01` 至 `photo-10` 保留输入顺序，`imageSections` 分为前四张「校排球队 / University team」和后六张「院排球队 / College team」。两语言均为正式图集，首页原位置保持，`links` 为空；《与光同行》条目的括号背景同时改为「北邮70周年校庆 / BUPT 70th anniversary」，正文演出经历保留。素材准备、验证及实际上线状态见 [排球队审计](audits/2026-10-11-volleyball-gallery.md)。

博客合并展示 essays 与 posts，按日期倒序排列；文章仍使用原有 kind 和 slug 对应的 URL，RSS 身份也保持原样。图集不要求迁移或重命名既有文章。

`b-spline-policy` 为 2026 年 7–8 月极智深诣公司实习 Demo 的正式图集。首页关联位置在 Pixel Done 之后、BNDS.life 之前；两语言共享三个 1× / 2× / 4× 原始模拟视频、三张预览帧及一张真机结果图，引用 `b-spline-policy/*` 媒体 ID。正文说明论文复现与算法改进的实际参与，实验表格仅在原图中展示，图下保留简短结果说明；页末提供 [GitHub 仓库](https://github.com/Siyuan-Xue/openpi05-bsp) 和 [B-spline Policy 论文](https://arxiv.org/abs/2607.09648)。该图集的初次发布见 [审计](audits/2026-10-11-b-spline-gallery.md)，移除重复表格见 [后续调整](audits/2026-10-11-b-spline-table-cleanup.md)。

## 预览转正式与发布检查

条目占位预览使用长期保留的 slug。补齐已核实的介绍、实际角色、真实图片、替代文本和图注后，将两语言 `preview` 同时改为 `false`，并保持 `draft: false`。同一地址即可成为正式图集，自动进入 sitemap，无需新增路径或迁移首页链接。只改一份 JSON 会因预览状态不一致而阻止构建。

`layout-preview` 配对样例使用四张抽象 PNG，仅验证排版和交互。它不代表真实项目、本人照片或成果；两语言仍保持 `draft: true`。按公开预览白名单约定，生产构建允许生成两域名的 `/gallery/layout-preview/`，页面带 `noindex`，不进入首页分类或 sitemap。该例外仅适用于这个固定 slug，其他普通草稿仍不生成生产页面。公开预览的存在不表示真实图集已发布，也不证明部署已完成；是否上线仍需核对 Actions 和两域名目标 SHA。

本地运行 `bun run dev:zh` 或 `bun run dev:en`，打开终端显示的地址下的 `/gallery/layout-preview/` 查看样例。Astro DEV 也可以查看其他完整双语草稿对；所有开发环境图集统一 `noindex`，包括两语言草稿状态暂时不一致的情况。`bun run preview` 读取正式构建产物，可以查看固定版式样例、条目占位预览及正式公开图集，不能查看其他普通草稿。

产物测试将版式样例复制为 `published-fixture`，将双语 `draft` 和 `preview` 均设为 `false`，按正式公开图集条件验证页面生成、元信息、首页关联和 sitemap；额外普通草稿用于验证隔离。这些测试 fixture 不代表实际项目，也不应作为真实内容提交或发布。

`bun run test:gallery` 在临时项目内准备上述 fixture，分别真实构建中英文以验证模板、图片和搜索元信息，结束后删除临时目录；不会修改源样例或正式 `dist/`。该测试已接入 `ops/verify.sh`。普通 `bun run build` 的验收应确认所有已公开条目可由首页进入，条目预览带 `noindex` 且不进 sitemap，正式图集可索引且进入 sitemap；固定版式样例公开但不进首页或 sitemap；其他普通草稿仍不出页。应同时检查双语预览状态一致，以及正式 fixture 可以正常进入 sitemap。

正式发布前检查：

- 两份 JSON、真实介绍、时间、角色、图片、替代文本和图注齐全，资料来源可核对。
- 双语 `category`、`order` 相同，两个 `draft` 和两个 `preview` 均设为 `false`。
- 媒体 ID 正确且两站原图和缩略图已校验，原始外链已按需要转入 `links`，不含敏感资料。
- 有图片分区时，核对双语标题、起点和图片数量/顺序，全部图片各出现一次；分区间灯箱连续切换，图注关联和优先加载仍正确。
- 有视频时核对两语言顺序、预览帧、时长和首次公开日期，并验证原生播放、下载、两域名 Range 响应及不自动播放；实验图片与文字说明核对单位和适用条件，避免重复展示图内表格。
- 两语言桌面及窄屏、明暗主题、无 JavaScript 原图链接、灯箱键盘操作和焦点回归可用。
- 运行与改动匹配的类型检查、测试及双语构建，核对 canonical、hreflang、首页入口和 sitemap。

只公开占位预览时，两语言保持 `preview: true`，检查明确的占位说明、首页入口、`noindex` 和 sitemap 排除；不得将「页面可访问」记成「真实素材已齐」。各轮执行结果见带日期的审计，本指南不代替本次验证记录。

网站通过现有 GitHub Actions CI/CD 发布。需要发布时按维护总览核对 Actions 和两域名目标 SHA；本地预览、构建通过或推送本身都不等于线上验收完成。静态图集更新不要求安装聊天、Hermes 或其他独立服务。

恢复内容时，优先从 Git 还原该图集的两份 JSON 与媒体清单；已上传的旧媒体不会被 release 回滚或清理删除。媒体丢失时，从本机 `media-local/` 或服务器媒体快照恢复并核验摘要，再重新验证构建。尚未公开的内容继续保持 `draft: true`；正式图集或条目预览需临时撤下时，两语言一并恢复为草稿并重新发布，原地址会不再生成，首页回到整理中。仅将 `preview` 设为 `true` 会取消索引资格，不会撤下页面。`layout-preview` 的公开入口由固定例外控制，保持草稿不会撤下该预览；需要撤下时应移除相应例外并重新发布。整个网站版本回滚仍使用维护总览中的 Actions rollback 流程。
