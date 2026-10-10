# 图集内容维护

图集用于展示已有项目、研究或活动的真实材料。内容模型在 [gallery.ts](../src/utils/gallery.ts)，集合入口在 [content.config.ts](../src/content.config.ts)，配对和读取入口在 [galleries.ts](../src/utils/galleries.ts)，呈现在 [GalleryContent.astro](../src/components/GalleryContent.astro)。开始更新前先读 [维护总览](MAINTENANCE.md)。

## 文件与双语配对

每个图集使用一个稳定 slug，并提供两个 JSON 文件：

```text
src/content/galleries/<slug>/en.json
src/content/galleries/<slug>/zh.json
```

slug 只用小写英文字母、数字及单个连字符，例如 `project-notes`；不要使用空格、下划线、连续连字符或语言后缀。公开地址为 `/gallery/<slug>/`，由两域名各自显示固定语言版本。两语言的 `category`、`order` 和 `preview` 必须相同，其余文字需准确翻译。

`draft` 默认是 `true`，控制页面是否公开；`preview` 默认是 `false`，标记公开页面是否仍为占位预览。普通图集任一语言为草稿，则两个域名均不公开该图集。缺翻译的草稿不会成为公开图集；准备公开时必须配齐两语言，并同时将 `draft` 设为 `false`。缺少公开译文、分类、排序或预览状态不一致会阻止构建，不应通过删掉验证绕过。

| 状态 | 两语言字段 | 生产页面 | 首页 / sitemap |
|---|---|---|---|
| 正式图集 | `draft: false`、`preview: false` | 公开，可索引 | 均进入 |
| 条目占位预览 | `draft: false`、`preview: true` | 公开，`noindex` | 进入首页，不进 sitemap |
| 普通草稿 | 任一语言 `draft: true` | 不生成 | 均不进入 |
| 固定版式样例 `layout-preview` | `draft: true`、`preview: true` | 特例公开，`noindex` | 均不进入 |

`layout-preview` 是唯一允许草稿公开的固定例外；`preview: true` 本身不会使普通草稿公开。sitemap 根据内容 JSON 的草稿与预览状态排除页面，不另维护各预览条目的 slug 名单。

## 字段与真实素材

以下仅说明结构，示例保持草稿；图片路径必须换成实际存在的文件才能使用。

```json
{
  "title": "图集标题",
  "description": "简短介绍：说明真实背景及展示内容。",
  "period": "2026 年 10 月",
  "role": "准确说明本人承担的工作或参与方式。",
  "category": "projects",
  "order": 0,
  "draft": true,
  "preview": false,
  "images": [
    {
      "src": "./images/overview.jpg",
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

`title`、`description`、`period`、`role` 及每张图片的 `alt`、`caption` 都必须是非空文本。`description` 同时用于页内短介绍与页面描述，无需另写 Markdown 正文。`period` 是可见时间文本，可表达区间或持续进行的工作；它不是文章发布日期，不应为了 SEO 编造日期。正式图集的 `role` 应写本人实际角色，不把参与写成领导，也不把设计示意写成实际成果。占位预览可明确写「待补充实际角色」或「时间待补充」，不能用推测填满必填字段。

`images` 至少一张。`src` 通过 Astro 本地 image schema 解析，路径相对于所在的 JSON 文件，例如 `./images/overview.jpg` 对应同一 slug 目录下的 `images/overview.jpg`；两语言可以引用同一图片。使用有权展示的真实图片或实际项目截图，保留准确图注和出处。`alt` 描述图片本身，`caption` 补充上下文，两者都要提供各语言版本。不要虚构人物身份、照片、成果或活动事实。

`preview: true` 时可以复用抽象占位图，但介绍、替代文本和图注必须明确其为排版示意，不代表真实项目画面或经历。目前七个首页条目的预览复用 [gallery-preview](../src/assets/gallery-preview) 中的四张 PNG；标题、已知年份和既有资料链接沿用原始内容，角色与贡献待核实。占位页可用于查看完整导航和灯箱，不作为个人成果证据。

页面首图优先加载且通栏，后续两张并列，未配对的末张通栏；600px 及以下全部单列。图片按自然比例展示，图注常驻页内。点击图片打开可前后切换、缩放及用 Escape 关闭的多图灯箱；可见控件使用英文。无 JavaScript 或灯箱加载失败时，普通链接仍可访问原图。

`links` 默认是空数组，只有需要资料链接时才填写。每个链接必须有非空 `label`，且 `href` 只允许完整 HTTP(S) 地址。不要写 `javascript:`、设备码、私有配置、带凭据的 URL 或恢复密钥。

## 首页关联与博客

`category` 只允许 `projects`、`research`、`appearances`。非草稿的正式图集和条目占位预览均进入对应首页分类；`order` 是整数，默认为 `0`，数值较小的图集先被读取，相同值按 slug 稳定排序。两语言必须使用相同值。

已有首页条目在 [site.ts](../src/data/site.ts) 中用 `gallerySlug` 关联图集。slug 和分类匹配且已公开时，该条目的标题、时间和链接改用图集内容，并指向站内 `/gallery/<slug>/`；同一图集不会重复列出。原有首页条目保留其既定位置，新公开且尚未关联的图集按上述顺序追加到对应分类，因此 `order` 不会任意重新排列现有首页条目。

目前七个现有条目分别关联 `probfun`、`imathbook`、`leda-agent`、`pixeldone`、`yuheng`、`walking-with-light`、`volleyball`，以独立的公开占位页打通站内入口。没有公开图集的其他条目仍显示「整理中 / In preparation」，不继续外跳。来源数据中的原始外链仍被保留；适用链接及准确双语标签放入图集的 `links`，作为相关资料展示。不要把原外链替换成尚不存在的图集地址。

博客合并展示 essays 与 posts，按日期倒序排列；文章仍使用原有 kind 和 slug 对应的 URL，RSS 身份也保持原样。图集不要求迁移或重命名既有文章。

## 预览转正式与发布检查

条目占位预览使用长期保留的 slug。补齐已核实的介绍、实际角色、真实图片、替代文本和图注后，将两语言 `preview` 同时改为 `false`，并保持 `draft: false`。同一地址即可成为正式图集，自动进入 sitemap，无需新增路径或迁移首页链接。只改一份 JSON 会因预览状态不一致而阻止构建。

`layout-preview` 配对样例使用四张抽象 PNG，仅验证排版和交互。它不代表真实项目、本人照片或成果；两语言仍保持 `draft: true`。按公开预览白名单约定，生产构建允许生成两域名的 `/gallery/layout-preview/`，页面带 `noindex`，不进入首页分类或 sitemap。该例外仅适用于这个固定 slug，其他普通草稿仍不生成生产页面。公开预览的存在不表示真实图集已发布，也不证明部署已完成；是否上线仍需核对 Actions 和两域名目标 SHA。

本地运行 `bun run dev:zh` 或 `bun run dev:en`，打开终端显示的地址下的 `/gallery/layout-preview/` 查看样例。Astro DEV 也可以查看其他完整双语草稿对；所有开发环境图集统一 `noindex`，包括两语言草稿状态暂时不一致的情况。`bun run preview` 读取正式构建产物，可以查看固定版式样例、条目占位预览及正式公开图集，不能查看其他普通草稿。

产物测试将版式样例复制为 `published-fixture`，将双语 `draft` 和 `preview` 均设为 `false`，按正式公开图集条件验证页面生成、元信息、首页关联和 sitemap；额外普通草稿用于验证隔离。这些测试 fixture 不代表实际项目，也不应作为真实内容提交或发布。

`bun run test:gallery` 在临时项目内准备上述 fixture，分别真实构建中英文以验证模板、图片和搜索元信息，结束后删除临时目录；不会修改源样例或正式 `dist/`。该测试已接入 `ops/verify.sh`。普通 `bun run build` 的验收应确认七个条目预览可由首页进入、带 `noindex` 且不进 sitemap；固定版式样例公开但不进首页或 sitemap；其他普通草稿仍不出页。应同时检查双语预览状态一致，以及正式 fixture 可以正常进入 sitemap。

正式发布前检查：

- 两份 JSON、真实介绍、时间、角色、图片、替代文本和图注齐全，资料来源可核对。
- 双语 `category`、`order` 相同，两个 `draft` 和两个 `preview` 均设为 `false`。
- 本地图片路径正确，原始外链已按需要转入 `links`，不含敏感资料。
- 两语言桌面及窄屏、明暗主题、无 JavaScript 原图链接、灯箱键盘操作和焦点回归可用。
- 运行与改动匹配的类型检查、测试及双语构建，核对 canonical、hreflang、首页入口和 sitemap。

只公开占位预览时，两语言保持 `preview: true`，检查明确的占位说明、首页入口、`noindex` 和 sitemap 排除；不得将「页面可访问」记成「真实素材已齐」。各轮执行结果见带日期的审计，本指南不代替本次验证记录。

网站通过现有 GitHub Actions CI/CD 发布。需要发布时按维护总览核对 Actions 和两域名目标 SHA；本地预览、构建通过或推送本身都不等于线上验收完成。静态图集更新不要求安装聊天、Hermes 或其他独立服务。

恢复内容时，优先从 Git 还原该图集的两份 JSON 与所引用图片，再重新验证构建。尚未公开的内容继续保持 `draft: true`；正式图集或条目预览需临时撤下时，两语言一并恢复为草稿并重新发布，原地址会不再生成，首页回到整理中。仅将 `preview` 设为 `true` 会取消索引资格，不会撤下页面。`layout-preview` 的公开入口由固定例外控制，保持草稿不会撤下该预览；需要撤下时应移除相应例外并重新发布。整个网站版本回滚仍使用维护总览中的 Actions rollback 流程。
