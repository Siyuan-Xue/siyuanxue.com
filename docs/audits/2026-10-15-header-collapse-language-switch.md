# 顶栏折叠与跨域语言切换

日期：2026-10-15；基线 `main` / `bd3606d`，开始时工作区干净、单工作树。本次全部自行修改，未提交、推送或部署，未操作 nginx/server/ops。

## 行为与顺序

默认保留姓名与最右的左箭头；展开后操作行向左出现，箭头变为右箭头。桌面同行，≤767px 在姓名下方增加一行正常布局空间，内容随之下移。动画为 240ms（沿用文章的 cubic-bezier easing），窄屏先下移箭头再展开；reduced-motion 完全关闭过渡。移除旧的窄屏姓名缩小规则，保留 Lucide 无框样式与原主题 tokens。

| 页面 | 展开后从左到右（也是 DOM / Tab 顺序） |
|---|---|
| 有目录的文章 | 目录、首页、聊天、主题、语言、收起箭头 |
| 无目录文章 / 图集 / 普通页 | 首页、聊天、主题、语言、收起箭头 |
| 首页 | 聊天、主题、语言、收起箭头 |
| 聊天 | 新对话、首页、主题、语言、收起箭头 |

语言是用户指定的最右例外，紧邻箭头；其他操作保持此前相对顺序及「越小、越新越靠左」原则。桌面目录默认可见，其开关也收入操作行。

- 原生 button 更新 aria-expanded / aria-controls / 双语标签。键盘展开聚焦首项；Esc 收起并返回箭头；外部点击或焦点离开收起。手机目录优先响应第一下 Esc，再按一次收起操作行；关闭操作行也释放目录滚动锁。桌面目录关闭时，如果其按钮已折叠，则返回可见箭头。
- SSR 的折叠 CSS 用 visibility 排除焦点与辅助技术；控制器再设置 inert / aria-hidden，收起立即失活、淡出结束变为不可见。head 中 noscript 样式直接展开真实导航链接，隐藏依赖 JS 的按钮；不使用 details/checkbox，不存展开状态，历史缓存返回也收起。
- 顶栏在顶部、焦点、操作行展开或手机目录展开时保持可见；其他情况下保留原下滚隐藏/上滚显示，ResizeObserver 同步实际高度与目录避让。聊天常显，保留此前视口、输入、流式与存储逻辑；新对话收起操作行后仍聚焦输入框。
- `src/scripts/theme.js` 未修改；单个 theme-color、节点替换、系统/手动优先级、html/body/顶栏同色及 Safari 的 blur(0px) 保持。

## 语言目标

`langSwitchContent.ts` 在服务端读取两语言实际 discovery/content 路由，过滤 draft；`langSwitch.ts` 纯函数仅在双方同路径已发布时保留 slug，统一尾斜杠。缺译、未发布、草稿、404/未知路径回退另一首页；公开的 `layout-preview` 仍是 draft，因此按钮回首页，已有 canonical/hreflang/noindex 规则不变。既有文章/图集必须成对发布的校验没有放宽。

源站由 SITE_LOCALE 决定，目标使用 `locale.ts` 的 `https://siyuanxue.com`（en）/ `https://xuesiyuan.com`（zh）；www 仅为既有 apex 别名，无新 origin。localhost、4321/4322 preview 也输出另一正式主域名，不从访问 host 猜地址。真实 a 的可见文字为「中文 / English」，带目标 lang/hreflang 和说明动作的 aria-label。query/hash 全部丢弃，不跨域携带主题、草稿、聊天或其他状态。

为覆盖每个生成的 HTML，原 `/gallery/probfun/` 从 Astro 配置跳转改为共享布局页面，仍以 0 秒 refresh 跳至 `/gallery/imathbook/`，target canonical、noindex、sitemap 排除保持。没有更名路由或修改发现清单政策。

## 验证

Node **v22.23.3**（fnm，临时 XDG_STATE_HOME）、Bun **1.4.2**；最终代码的结果：

| 命令 | 结果 |
|---|---|
| `bun run check` | 110 files，0 errors / warnings / hints；tsc 通过 |
| `bun run test` | 233 pass，0 fail，1243 assertions |
| `bun run build` | 双语成功，附带产物检查通过 |
| `bun run test:output` | 42 pass，0 fail，7720 assertions |
| `bun run test:gallery` | 1 pass，0 fail，346 assertions |

新增映射与操作栏行为测试，更新聊天/滚动/产物测试。两站每个 HTML（含聊天、404、草稿样例和旧址跳转）逐页核对语言 href、目标 origin、另一站实际路由存在、尾斜杠、无参数、语言/ARIA 属性及初始折叠状态；现有 canonical/hreflang/sitemap/草稿隔离与 Safari 主题合同通过。产物 VM 仅执行 head 主题脚本，避免误运行被 Astro 内联的交互模块；React 的 hrefLang 按 HTML 不区分大小写规则检查。

本机 headless Chrome 对 preview en:4321 / zh:4322 完成 **64 张截图**：文章 `/essay/embodied-agent/`、首页、`/chat/`、`/gallery/pixeldone/` × 两语言 × 1024/390px × 折叠/展开 × 明/暗，均高 700px；深色用保存的 color-mode，系统媒体查询保持浅色。无横向溢出、姓名/标题覆盖或 JS pageerror；手机普通按钮/箭头 **44×44px**，语言 **56×44px / 62.8125×44px**。已实际查看代表性的中英文文章、首页、聊天截图。

补查两语言无 JS 导航、逐动画帧姓名避让、Tab/Esc/焦点返回、手机目录 inert/滚动锁/锚点、桌面折叠目录焦点返回、滚动显示锁、reduced-motion，以及 320/360/479/480/600/767/768/991/992/1023/1024/1280px。聊天 390×390 视口下输入框完整可见，展开保留草稿，新对话清空并聚焦；没有发送生产模型请求。

截图均在 `/workspace/blog-src/`，逐文件清单为 `hdr-after-files.txt`：文章 `hdr-after-{en,zh}-{1024,390}-{collapsed,expanded}-{light,dark}.png`；首页/聊天/图集分别在 `hdr-after-` 后加 `home-` / `chat-` / `gallery-`。临时测量依据为 `/tmp/header-visual-results.json` 与 `/tmp/header-edge-results.json`；截图和测量不入 Git，不作为长期备份。

## 联动、待办与恢复

- **已更新：**`Header.astro`、新增 `HeaderActions.astro` / `LanguageSwitch.astro` / `chat/ChatHeaderActions.tsx`、`ChatApp.tsx` / `chat.astro`、`site.ts`；新增 `langSwitch.ts` / `langSwitchContent.ts` / `headerActions.ts`、原 header/toc 控制器；新增 `header-actions.css`、base/article/toc 样式；`BaseHead.astro` / `gallery/probfun.astro` / `astro.config.mjs`；新增两组单元测试及原聊天/滚动/产物测试；AGENTS、维护总览和本审计。联动检查包括两固定语言、发现元信息、导航/无 JS、主题、目录及聊天前端。
- **不适用：**身份/GitHub 资料、正文/媒体/灯箱、域名注册/DNS/TLS、依赖/锁文件/CI/secret、Nginx/helper、聊天 bridge/Hermes/微信/模型/记忆/存储/备份；这些资源未改动，没有服务安装或媒体上传。
- **待处理 / 未验证：**实体 macOS Safari / iOS（尤其原生工具栏 tint 与真实软键盘）、Android 真机、部署后的真实跨域点击、Actions/两域名目标 SHA。Chrome 小视口不是实体手机；本次明确不发布，保留既有 Safari/键盘待办。
- **Miles 可选，均未启用：**按浏览器语言自动跳转（须另定尊重手动选择与爬虫策略）、只传 light/dark 的 theme hint（当前各域名使用自己的保存偏好或系统）、记忆展开状态（当前每页默认收起）。没有 cookies 或自动语言重定向。
- **恢复：**按本次 diff 还原上述组件/控制器/样式/测试与配置；撤掉 `gallery/probfun.astro` 时同时恢复原 Astro redirects 项。保留此前 Safari 与文章字体改动、历史审计和备份。无需数据迁移或服务回滚；未来授权发布仍走原双语 Actions，并验收实际 SHA 与跨域导航。
