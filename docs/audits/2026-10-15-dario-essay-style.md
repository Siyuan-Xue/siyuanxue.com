# 文章排版对齐 Dario — 2026-10-15

基线：`main` / `4b1bd74`，开工时工作区干净、仅一个工作树。按用户要求本人完成修改；仅本地验证，不提交、不推送、不发布。

## 参考、差异与修改

重新读取 [Machines of Loving Grace](https://www.darioamodei.com/essay/machines-of-loving-grace)、其 [Webflow CSS](https://cdn.prod.website-files.com/67e201a6a390d00a0ca1cbf3/css/dario-amodei.shared.63492175b.min.css)、页面内嵌规则及用户给定的桌面/手机/深色截图，并用 headless Chrome 复查参考页计算样式。原本站英文桌面列宽 624px、x≈193，标题 40.96/47px，副标题 25px 正体且带下边距，strong 700；目录通过颜色淡化且列过窄，图注间距/颜色及列表、引用、链接细节不一致。

- `src/layouts/Prose.astro` 给 essay/post 添加 `prose-page` 作用域并加载 `src/styles/article.css`；显示日期只保留年月，`datetime`、公开日期元信息、正文与路由不变。
- 文章专用样式对齐标题、正文、目录、间距和响应式规则；顶栏姓名与正文同列。h2/h3 用 `scroll-margin` 加既有根滚动留白实现 130px 锚点距离，避免参考页 130px padding/负 margin 改变现有目录控制器的测量位置。
- `src/components/EssayContent.astro` 移除旧 figure/figcaption 覆盖并同步 `sizes` 到新列宽；图片来源、原图、缩略图、媒体清单及正文不变。Astro 原生 Markdown 脚注由 `data-footnote-ref` 选择器样式化；正文未添加脚注或 tooltip。
- 新增 `tests/article-style.test.ts`，更新 `tests/site-output.check.ts`，覆盖中英样式级联、手机尺寸、真实 Markdown 脚注、双语构建样式及日期语义、非文章页作用域隔离。

## 字体与实测

继续使用已安装的 `@fontsource-variable/newsreader` **5.3.0 / SIL OFL**，没有下载、复制或新增专有字体。检查实际 WOFF2 的 `fvar`：默认 `wght` 文件只有字重轴，`standard` 文件有 `wght` 200–800、`opsz` 6–72。`article-fonts.css` 为后者的正体/斜体及既有三个字符集指定独立 CSS family，文章固定 `font-optical-sizing: none; font-variation-settings: 'opsz' 24`，大标题也不自动切换光学尺寸；首页等页面继续使用原字体文件。中文保留 Noto Serif SC 优先的衬线回退链，副标题和引用为正体，避免合成 CJK 斜体。

以下为构建后 `/essay/embodied-agent/` 的 Chrome 计算值，中英文各测 1024×700、390×700，分别浅色和深色；参考缺少的正文元素按其 CSS 核对，不虚构参考页现场测量。

| 项目 | Dario 参考 | 本次结果 |
|---|---|---|
| 正文 / 段落下边距 | 20px / 32px，20px | 相同，两语言两尺寸 |
| 桌面列宽 / 左边界 | 580px / 222px | 580px / 222px；顶栏姓名同 x |
| 手机列宽 / 左边界 | 350.5px / 19.75px（约 20px） | 350px / 20px，按用户指定固定边距 |
| 标题 | 桌面 62px / 68.2px / 700；手机 48px / 52.8px | 相同，balance；上下 margin 桌面 37.2/6.2px、手机 28.8/4.8px |
| 副标题 | 22px / 35.2px / 400，italic，margin 0 | 英文相同；中文正体 |
| 日期 | 18px / 28.8px，上下 margin 36/18px | 相同；英文 October 2026、中文 2026年10月 |
| h2 / h3 / strong | 32/38.4px / 600；24/28.8px / 600；strong 600 | 相同；当前中文文章没有 strong，中文字重另由测试 fixture 验证 |
| 桌面目录 | 标题 24/28.8px；链接 20/32px；inactive .5 / active 1 | 相同；x=25、可用宽≈154.8px，h3 无额外缩进 |
| figure / figcaption | figure 上下 64px；图注桌面 18px、≤991px 14.4px，上距 1em、50% 色混合 | 相同；原“图注应更小”的描述经 CSS 核对仅在窄屏成立 |
| 配色 | 浅色字 #1f1e1d / 底 #f0eee6；深色反转 | 相同；日期浅色 #5e5d59、深色 #b0aea5 |

列表桌面缩进 2em，≤767px 的 ol/ul 为 1.5em/1.25em，li 下距 6px（末项为 0）；引用 1px 左线、上下 2em、左内距 1.25em、行高 1.5，英文斜体。正文链接下划线粗 .08em / 偏移 .1em。原生脚注为 12px / 500、圆角 4px、padding 3px 3px 1px，浅/深背景分别黑 8% / 白 15%。

## 验证、保留差异与联动

Node **v22.23.3**、Bun **1.4.2**：`bun run check` 101 files、0 errors/warnings/hints；`bun run test` **193 pass / 0 fail**；`bun run build` 双语成功；`bun run test:output` **40 pass / 7080 assertions**；`bun run test:gallery` **1 pass / 346 assertions**。使用 fnm 与临时 `XDG_STATE_HOME`；依赖、锁文件和运行时配置不变。

Chrome 八组文章验证通过：计算样式、无横向溢出、姓名/按钮无重叠、主题切换同步唯一 theme-color、顶栏下滚隐藏/焦点显示、手机目录 inert/滚动锁、Escape 焦点返回和锚点跳转。这是计算样式与交互验收，**不代表 Dario 像素级一致，也不是实体 Safari 验收**。Safari 的零半径 backdrop-filter 与主题脚本未改动。

补充检查中英各 15 个宽度（320–1440px，含 479/480、767/768、991/992、1023/1024 边界），无横向溢出、姓名/按钮或目录/正文重叠。四张插图经 preview 代理加载，实际宽度均为 580px；首次检查遇到代理 TLS 中断，公网和本地代理 HEAD 均恢复 200 后重试，两语言均加载通过。短文页同样为 580px/62px；首页、Pixel Done 图集和聊天保持原字体、672px 外容器、零半径滤镜及既定顶栏显隐模式。未改服务器或代理配置。

保留差异：Newsreader Variable 与参考静态 24pt cut 的字体版本/栅格化可能不同；中文有独立字形及正体选择；现有首页/聊天/主题 Lucide 无框按钮及顺序保留，不换参考胶囊开关；目录控制器仍在 1024px 切换（参考 992px），手机链接仍保留 44px 点击区及 .5/1 活跃透明度；≤380px 英文姓名缩小以容纳四个按钮。参考负 margin 锚点机制改用上述滚动距离机制。

截图保存在用户指定目录 `/workspace/blog-src/`：`after-en-1024.png`、`after-en-390.png`、`after-zh-1024.png`；另保留中文手机及各组合 `-dark.png`。临时计算值在 `/tmp/dario-after-values.json`；这些本机文件不进入 Git。

- **已更新：**文章模板/样式/响应式图片提示、单元与产物合同、维护总览及本审计；检查双语固定语言、年月显示与完整日期元信息、canonical/hreflang/RSS/sitemap、主题与导航。
- **不适用：**正文、媒体文件/清单、首页内容、身份/域名/GitHub 资料、依赖/CI/secret、Nginx/server/ops、聊天 bridge/Hermes/微信/模型/记忆/备份均未修改。
- **待处理：**无本次发布任务；用户明确禁止提交/推送，故未运行 Actions 或公网目标 SHA 验收。实体 Safari 仍沿用此前待验收状态，不将 Chrome 结果替代它。
- **恢复：**仅撤销本次 `Prose.astro`、`EssayContent.astro`、新增文章 CSS 与相关测试差异；无需恢复媒体或服务器。将来若授权上线，仍走现有双语 Actions。
