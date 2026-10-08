# 个人图集与博客实现计划

依据：用户在本会话批准的「个人图集与博客的内容设计」。基线main `a99d48b`，开发分支 `codex/gallery-and-blog`。

## 共同约定

- 首页保持文字目录：简介、项目、研究、兴趣、博客。博客合并按日期倒序，保留原文章URL和RSS身份。
- 独立双语图集 `/gallery/<slug>/`；真实内容才公开。描述为可见短介绍，另有时间、角色、图片、常驻图注及资料链接。
- 沿用42rem窄栏、明暗tokens、即时粘土色反馈。主图通栏、后续两两并列，剩余单图通栏；600px及以下单列，图片不裁切。
- 多图PhotoSwipe独立于浪漫肖像；可见灯箱控件用英文，键盘可用，加载失败仍可通过普通图片链接访问大图。
- 不改服务、账号、依赖或发布配置；现有 CI 验证入口增加隔离的图集构建测试。不伪造成果，不生成可索引的空图集。本轮实现与本地验收，不自动发布。
- 在共享开发分支内按文件分工协调；不清理归档、备份或其他人的修改。子任务不提交、不推送、不自行派生审查agent；统一集成后独立审查。

### Task 1: 图集内容与首页

所有权：`src/content.config.ts`、`src/utils/gallery.ts`、`src/utils/galleries.ts`、`src/utils/content.ts`、`src/data/site.ts`、`src/pages/index.astro`、内容相关新测试。不要修改页面元信息、图库视图和灯箱。

接口：在`src/utils/gallery.ts`定义并导出`GalleryImage`（`src: ImageMetadata, alt: string, caption: string`）、`GalleryLink`（`label: string, href: string`）、`GalleryData`（`title, description, period, role: string; category: 'projects'|'research'|'appearances'; order: number; draft: boolean; images: GalleryImage[]; links: GalleryLink[]`）。description同时作为可见短介绍与页面描述，不另设Markdown正文。

图集采用`src/content/galleries/<slug>/{en,zh}.json`，使用Astro的image schema解析本地图片；所有文本需非空，图片至少一张，资料链接只允许http(s)，draft默认true，order默认0。导出schema工厂供content.config与测试复用。双语发布必须成对、category/order一致，任一draft则两站均不公开。slug仅小写字母数字加单连字符。`getGalleries(includeDrafts = false)`从Astro集合读取，返回`{slug, entry}[]`，正常只返回完整公开对；开发预览可显式读取完整草稿对。

首页优先使用已发布图集。现有条目加稳定gallerySlug标识，与图集匹配时切换站内地址；新图集也可自动出现在对应分类，避免重复。用户已明确选择：资料未齐条目显示「整理中 / In preparation」，取消外跳；原外链保存在来源数据中供正式图集引用。图集不存在时不得生成假地址。

合并博客数据时保留原kind/slug，用原URL，按日期倒序，日期相同时稳定排序。RSS已有合并逻辑，不作无关重构。

验证先覆盖：草稿隔离、缺翻译、空图片、危险链接、同slug双类型文章不冲突、首页图集优先与不重复。先看有意义的失败，再实现。不要为简单文案或CSS加源码断言测试。

### Task 2: 图集视图与多图灯箱

所有权：`src/components/GalleryContent.astro`、`src/styles/gallery.css`、`src/utils/galleryLightbox.ts`及灯箱相关新测试；不改content model、Base/BaseHead、路由与现有浪漫肖像。

`GalleryContent.astro` Props使用上述`GalleryData`的`title, description, period, role, images, links`，不包含Base布局。输出带`data-gallery-page`标识的语义article，标题、时间文本、本人角色、介绍、figure/img/figcaption、相关资料。首张及未配对末张通栏，其余两列；图片自然比例、响应式资源、首图优先，其余lazy，宽高稳定。

锚点直接href大图，数据属性提供真实尺寸与alt，JavaScript按需加载PhotoSwipe；保留原生链接作为无JS/加载失败回退。多图前后切换/缩放/Escape/焦点回归，不增加旋转、悬停缩放或布局位移动画；遵循reduced-motion，英文可见控件文案，ARIA语义可本地化。外链rel安全，图注常驻页内；灯箱可显示当前图片图注但不得复制HTML作为未净化innerHTML。

任务自测聚焦加载与回退、用户意图/修饰键、单图/多图/清理。交付后主agent做浏览器集成QA。

### Task 3: 路由、SEO、预览与集成

主agent负责Base/BaseHead可选图集元信息与独立OG图片、动态静态路由、明确标注的draft版式预览数据及authoring文档。复用Person稳定ID；图集使用ImageGallery/WebPage语义，不误标BlogPosting，不用活动时间假造发布日期。canonical/hreflang保持对应路径；预览仅DEV路由、noindex，无正常生产路径/sitemap入口。

真实素材尚缺，预览使用明确的版式示意素材，不能写成实际项目或活动事实。后续发布门槛：双语正文/角色/时间/图片真实且齐全，然后将draft设false。

完善产物测试区分博客article与图集article，验证首页顺序、旧URL/RSS、公开页元信息及无JS内容、draft不进入生产与sitemap。运行check、全量行为测试、双语构建；桌面与窄屏检查图库、灯箱键盘和明暗模式。记录维护联动、素材缺口和实际测试结果。独立整体验收后交付本地预览，保留开发分支。
