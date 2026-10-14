# 2026-10-14 具身智能体文章草稿与配图支持

来源为用户提供的 `/workspace/blog-src/draft.txt` 及 `fig-000.png` 至 `fig-003.png`。开工基线为干净的 `main`，SHA `ac6a1fe3f5b23b1736cc1ee223aa7c0f62bb484d`，一个工作树。用户要求自行完成写作与代码、保留草稿、本机准备媒体并提交；媒体上传和 PR 交由父任务，撰写时待处理，后续见 PR。

## 内容与实现

- [英文](../../src/content/essays/embodied-agent/en.md)及[中文](../../src/content/essays/embodied-agent/zh.md)使用同一日期 `2026-10-14`，均为 `draft: true`。四个编号章节依次说明构想、动机、蓝图与个人原因；明确这是 Miles / 薛思远的本科毕业设计方案，没有新增实验结果、论文引文、导师信息或已实现能力。
- [文章集合](../../src/content.config.ts)新增可选 `figures` 数组，字段为局部 `id`、媒体 `src`、非空 `alt` 和 `caption`。复用现有图片媒体 schema，未登记或视频 ID 在内容同步时失败，包括草稿；局部 ID 不可重复。
- 正文独立行 `<!-- figure:architecture -->` 对应 frontmatter 的 `id: architecture`。[EssayContent](../../src/components/EssayContent.astro)保留原 Markdown 渲染与标题锚点，在标记处通过现有 `MediaPicture` 输出响应式图片及常驻图注；原图链接无需 JavaScript。图宽、留白及图注颜色适配既有窄栏和主题。未新增灯箱交互。
- [标记处理](../../src/utils/essayFigures.ts)拒绝未知、遗漏或重复标记；代码块中转义后的示例不被替换。没有 figures 的旧文章保留原正文 HTML。图集渲染、文章配对及草稿路由筛选逻辑不变，未新增公开预览例外。

## 媒体

四次执行 `bun run media:prepare <id> <源 PNG>`，使用默认 `photos` profile；脚本没有专门的图表 profile。输出原 PNG、320/640/960/1280px 的 AVIF 与 WebP、1200px JPEG 封面，各 10 个文件，共 40 个文件、2,096,760 字节。

| 源文件 | 媒体 ID | 用途 |
|---|---|---|
| `fig-000.png` | `essays/embodied-agent/architecture` | 完整架构 |
| `fig-001.png` | `essays/embodied-agent/orchestration` | 编排路径 |
| `fig-002.png` | `essays/embodied-agent/generation` | 生成与工具循环 |
| `fig-003.png` | `essays/embodied-agent/pipelines` | 离线与在线管线 |

原图均为 2560×1440。文件按 SHA-256 名称保存在当前工作区 `media-local/`；本机核验了全部文件的大小、摘要、尺寸和哈希地址，以及四张原图与来源逐字节一致。`git check-ignore` 确认 40 个文件全部忽略；清单只追加上述四个 ID，既有记录完全不变。

## 本次验证及限制

本次收尾在实际仓库的 `blog/embodied-agent` 分支重新执行以下完整验证，使用 Node v22.23.3、Bun 1.4.2；没有发现需要修复的代码问题，依赖及锁文件未变更。每个执行 Bun 的 shell 均通过 `fnm use 22` 选择 Node，并核对主版本为 22。默认 fnm 状态目录只读，首次切换未生效；随后将 `XDG_STATE_HOME` 指向 `/tmp` 下的临时目录，重新完成安装及全部检查。

- `bun install`：成功。
- `bun run check`：99 个文件，0 errors/0 warnings/0 hints，TypeScript 检查通过。
- `bun run test`：176 pass/0 fail，715 个断言。
- `bun run build`：中英文构建成功，内含的产物检查通过。
- `bun run test:output`：单独执行，34 pass/0 fail，6,746 个断言。
- `bun run test:gallery`：1 pass/0 fail，344 个断言。

此前专项检查与验证范围：

- `bun test tests/essay-figures.test.ts tests/media-prepare.test.ts tests/media-upload.test.ts tests/locale-content.test.ts`：14 pass、0 fail，73 个断言。媒体上传测试使用既有模拟命令，没有连接服务器。
- YAML/素材静态检查通过：双语日期、草稿、四个编号章节、四个媒体 ID 的顺序、图注、alt 及正文标记一致；英文约 1,422 词。该检查不代替 Astro 页面渲染。
- 新增 Markdown 边界测试；[既有隔离产物测试](../../tests/gallery-output.check.ts)增加临时公开文章 fixture，检查双语四图、图注、原图链接、标题锚点、canonical、真实草稿不出页/不进首页与 sitemap，以及未知媒体 ID 使草稿构建失败；本次完整验证已通过。
- 浏览器排版、暗色/窄屏仍待检查；公网媒体检查待父任务上传后完成，后续见 PR。

## 联动、交接与恢复

| 项目 | 状态 |
|---|---|
| 双语文章、日期、标题/摘要、草稿、四图与图注 | 已更新；保留毕业设计方案语义 |
| 文章渲染、媒体清单、相关测试、维护总览与审计 | 已更新；本次重新完成上述检查、测试与构建 |
| canonical/hreflang、RSS/sitemap、站内入口 | 沿用既有配对及草稿排除逻辑；双语构建与产物检查通过 |
| 服务器媒体上传、PR | 由父任务后续完成；撰写时待处理，后续见 PR。部署媒体检查覆盖整个清单，含草稿所用 ID，须先上传校验再发布清单版本 |
| 两域名校验、Actions/目标 SHA | 待发布时验收；本次本地验证不代表线上发布 |
| 域名、账号、README/About、CI 变量/secret、Nginx/helper、聊天/记忆/模型服务 | 不适用；没有修改身份资料或这些资源，未来研究计划仅记录于草稿 |

本次收尾仅在实际仓库的 `blog/embodied-agent` 分支提交，提交消息为 `Add embodied-agent essay draft with media-ID figure support`；不推送、不创建 PR、不上传媒体或发布。提交仅包含代码、双语 Markdown、媒体元数据和维护记录，排除 `media-local/` 及所有 PNG/AVIF/WebP/JPEG 文件。

父任务后续按 [直传流程](../../ops/README.md#direct-media-uploads)上传四个 ID 并创建 PR；撰写时待处理，后续见 PR。继续保留 `draft: true`，除非另行获准公开文章。

恢复代码与文案可撤销本次提交，或从基线恢复所列文件并移除新增文章/组件/工具/测试；保留后续合法修改。媒体上传在撰写时待处理，后续见 PR；本机 `media-local/` 是本次准备结果，不随 Git 转移，保留来源文件和该目录，必要时用相同四条准备命令重新生成并核对清单。无需恢复服务器配置或独立服务。
