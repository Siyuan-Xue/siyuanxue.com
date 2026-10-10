# 2026-10-10 全部首页条目接入图集预览

用户要求「假装已经有图片，打通所有条目到画廊」。本轮以明确标注的抽象占位图打通七个现有条目的站内入口，不将占位图或待补角色写成个人成果。此要求晚于同日的[固定版式预览发布](2026-10-10-gallery-preview.md)；该记录及 [10 月 8 日图集与博客审计](2026-10-08-gallery-blog.md) 保留各自当时的边界和验收结果。

## 基线与范围

- 分支 `codex/all-gallery-previews`，源码基线 `3fdf80272545dd356807fe0ab3911ee17d17ecc7`。
- 本轮开始前生产静态版本为 `5040c31a6a66f1e5d03e3507380d7f065eb6abeb`；这不是本轮发布结果。
- 内容位置为 [src/content/galleries](../../src/content/galleries)，配对字段与规则见 [gallery.ts](../../src/utils/gallery.ts)，路由见 [[slug].astro](../../src/pages/gallery/[slug].astro)，sitemap 配置见 [astro.config.mjs](../../astro.config.mjs)。作者流程见 [GALLERIES.md](../GALLERIES.md)，资源联动见[维护总览](../MAINTENANCE.md)。
- 下列本机验证由本轮主任务执行；发布提交、Actions 与公网结果待回填，不能继承此前的通过状态。

## 内容与页面约定

七个现有条目各提供双语 JSON，使用 `draft: false`、`preview: true`，首页链接进入各自长期保留的地址：

| 既有条目 | 地址 | 已知时间 |
|---|---|---|
| 邮趣数学 / ProbFun | `/gallery/probfun/` | 2025 |
| iMathBook | `/gallery/imathbook/` | 2025 |
| LeDA 智能体 / LeDA Agent | `/gallery/leda-agent/` | 2026 |
| 像素清单 / PixelDone | `/gallery/pixeldone/` | 2026 |
| 语衡 · 多模态隐喻检测 / Yuheng | `/gallery/yuheng/` | 2026 |
| 《与光同行》· 北京市大学生戏剧节 | `/gallery/walking-with-light/` | 2025 |
| 校排球队 · 院排球队 | `/gallery/volleyball/` | 待补充，不编造年份 |

- 标题、已知年份和已有外链沿用现有公开资料；没有来源的角色、贡献与时间明确待补充。相关链接仍只用已有资料，不新增臆造的成果来源。
- 各页复用 [gallery-preview](../../src/assets/gallery-preview) 中的四张抽象 PNG。双语介绍、替代文本和图注明确为占位示意，保留现有自然比例、常驻图注、原图链接及灯箱。
- 新增 `preview` 字段，默认 `false`；双语取值必须相同。`draft` 继续默认 `true`；普通草稿即使标为预览也不生成生产页面。
- 七个非草稿预览页公开且可由首页进入，但标记 `noindex`，从 sitemap 排除。sitemap 读取内容 JSON 的 `draft` / `preview` 状态，不维护七个路径的硬编码排除名单。
- `layout-preview` 保持 `draft: true`、`preview: true`，仍是唯一草稿公开的固定例外；它不进入首页或 sitemap。
- 补齐真实图片、角色、介绍和图注后，两语言同时设置 `preview: false` 并保持 `draft: false`，原地址即成为正式图集并自动进入 sitemap。既有文章路径及 RSS 身份不变。

## 验证与发布状态

| 项目 | 本轮状态 |
|---|---|
| 类型检查 | `bun run check`：79 文件，0 errors / warnings / hints |
| schema、双语预览状态及首页关联测试 | `bun run test`：100 测试、388 断言通过 |
| 双语构建与实际产物：七个首页入口、预览 noindex / sitemap 排除、普通草稿隔离 | 两语言各 15 页；`test:output`：24 测试、1580 断言通过 |
| 独立 fixture：正式图集进入 sitemap、原图与灯箱资源 | `bun run test:gallery`：1 测试、238 断言通过 |
| 本机首页至独立图集、灯箱交互 | 端口 4340 首页显示七个站内入口；点击邮趣数学进入独立页，打开首图为 `1 / 4`，Right 切至 `2 / 4`，Escape 关闭并回焦首图 |
| 文档相对链接、路径及差异 | 相对链接与空白检查完成；详见本轮文档复查 |
| 发布提交与 GitHub Actions | 待回填 |
| 两域名目标 SHA、入口与页面、语言、资源、noindex / sitemap、旧照片拒绝 | 待回填 |

独立审查未发现阻断项；产物测试已按源内容的 `preview` 状态判断索引条件，避免未来转正式后仍要求七页永久 `noindex`。本机导航和灯箱记录不代替新设备、双语窄屏或公网验收。

公开预览不等于真实成果已经整理完毕；本地页面或测试通过也不等于已上线。发布仍使用现有 GitHub Actions CI/CD，并核对两域名实际目标 SHA。

## 维护联动与恢复

- **已更新：**图集指南的状态、配对、占位说明、原址转正式与撤下流程；维护总览中的当前边界和图集联动检查；本轮独立审计。
- **不适用：**身份事实、账号、域名、依赖、CI 变量/secret、Nginx/helper、聊天、Hermes、微信、模型、记忆、数据存储与备份均无本轮变更，无需独立服务安装。
- **待处理：**本轮上线结果；七个条目的真实图片、实际角色、介绍及准确图注。未核实前保留预览标记。
- **撤下单个条目：**将其双语 `draft` 同时改为 `true` 后重新验证发布，该普通图集不再生成，首页回到整理中。仅设置 `preview: true` 不会撤下页面。固定版式样例仍需移除专用例外才能撤下。
- **恢复本轮前行为：**按源码基线 `3fdf802` 恢复本轮相关代码与内容并重新验证；整站静态回滚使用维护总览中的 Actions 流程，本轮前生产目标为 `5040c31a6a66f1e5d03e3507380d7f065eb6abeb`。实际执行前确认该 release 仍可用，回滚后重新验收两域名，不覆盖独立服务。
