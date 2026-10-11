# iMathBook 与 uMathHub 合并图集（2026-10-11）

## 内容、链接与范围

用户明确要求把原 ProbFun 与 iMathBook 条目合并、更名为「iMathBook · uMathHub」，提供七张真实截图及本人参与事实。双语内容位于 `src/content/galleries/imathbook/{en,zh}.json`，首页源资料 `src/data/site.ts` 删除重复的 ProbFun 入口，合并条目保持在项目首位；两语言正式图集均为 `draft: false`、`preview: false`。

介绍保留用户确认的产品激情与工程能力提升：2025 年 5 月加入 ProbFun（邮趣概率，uMathHub 的前身），同年 7 月独立分支、组建 iMathBook 项目团队并主导开发。两平台官方认证、投入北邮数学教学及累计服务超千人次均为用户提供的事实；没有将人次改为独立用户数，也未把 ProbFun 的参与者写成全部平台的创办者。可见背景为「2025 年 5 月起 / Since May 2025」，角色区分 ProbFun 参与和 iMathBook 团队组建/开发负责。

沿用 `/gallery/imathbook/`，通过现有分区能力在同页先展示 uMathHub 的实验、做题、知识点思维导图三图，再展示 iMathBook 的「活」教材、多模态编辑、常驻 AI 助教、个性化记忆与导学四图。自然比例和七图连续灯箱沿用既有布局，无新依赖。两平台资料链接 `https://imathbook.com` 和 `https://umathhub.com` 均保留。

删除原 `probfun` 双语占位 JSON，`astro.config.mjs` 注册 `/gallery/probfun/` 到 `/gallery/imathbook/` 的原生静态跳转。静态 HTML 为 200 页面中的即时 meta refresh，附可点击备用入口、指向本域合并页的 canonical 和 noindex；这是静态内容兼容，不声称已安装 HTTP 301。旧路径从 sitemap 排除；不修改 Nginx/helper，不产生重复的正式图集。

## 媒体与恢复

七张截图均按用户输入顺序、原始字节保存为忽略目录 `media-local/originals/imathbook/screenshot-01.png` 至 `screenshot-07.png`；媒体 ID 为 `imathbook/screenshot-01` 至 `screenshot-07`。前四张及第六、第七张为 2632 × 1582，第五张为 1560 × 846。既有 Sharp 流程生成 AVIF/WebP 响应式文件和 JPEG 分享封面，70 文件共 5,469,219 字节，本机逐文件 SHA-256/大小校验通过；二进制不进入 Git 或 CI，清单仅追加七个记录，与基线逐项比对，旧媒体记录完全一致。

本轮基线为 `5b2d35e`，沿用先前待发布的 `codex/volleyball-gallery`，没有并行写入或工作树切换。排球与校庆文字修改继续保留，合并后的两站静态内容由原 Actions 一起发布；不将已发布的《家》《寻找李白》《与光同行》历史验收冒充本轮新验收。

恢复内容时从 Git 还原双语 JSON、源资料、Astro 跳转/索引配置与媒体清单，再通过原 Actions 或 rollback；如恢复合并前状态，须同时恢复两个原入口和原 JSON，避免旧跳转与新页面冲突。媒体在静态 rollback 后保留，缺失时从核验过的本机文件或服务器快照恢复，再核验两域名摘要。无需安装网站之外的组件。

## 验证与实际上线状态

合并/旧址兼容的回归验证先在现有双语产物上执行，0 pass / 2 fail（每种语言首入口仍为旧 `/gallery/probfun/`）；随后实现合并和静态跳转，双语构建通过，每种语言 19 页，产物验证 32 pass / 0 fail（6300 assertions）。专用检查核对唯一首页入口、旧址即时跳转/备用链接/目标 canonical/noindex，以及旧址排除、新合并页进入 sitemap；通用页面验收只把已单独核验的原生重定向 HTML 从正常页面格式检查中排除。

类型检查 95 文件、零 errors/warnings/hints；完整测试 118 pass / 0 fail（495 assertions）；正式 Astro fixture 1 pass / 0 fail（252 assertions）。另以实际双语 HTML 核对 3/4 分区、七图顺序与图注、首页唯一首入口、两平台链接、旧址备用站内链接及 canonical/索引。

本机浏览器两语言旧地址均实际进入合并页；中文桌面及两语言 390px 窄屏确认标题、2025 年 5 月背景、角色与经历、两区七图，窄屏宽度 390px、图片宽 358px，无横向溢出；英文暗色主题可读。中文 Enter 打开 uMathHub 末图为 3/7，ArrowRight 到 iMathBook 首图 4/7，Zoom 状态生效，Escape 关闭并回到末图入口焦点。完整本机预览 `/tmp/imathbook-local-2026-10-11.png` 已展示供用户审阅，不入库、不代表生产上线。

首次把这七图并入排球批次上传时，被自动审批拒绝：审批认为此前目的地授权只覆盖排球十图、不覆盖新数学截图的公开上传。该批次没有执行，也未通过其他工具绕过；随后仅执行已授权排球批次，100 文件服务器摘要/大小校验通过，快照为 `/var/backups/siyuanxue-media/29f2eec12c2939da44857283f6a69c437d1aa48a8eadab3ecc32f937cf84f78b/`。随后用户明确回复「授权这 7 张截图上传并上线」，覆盖七张截图及缩略图、既有 `ubuntu@82.156.77.131` 共享媒体目录和两域名。获批后原生 SSH/rsync 安装并逐文件验证 70 文件，快照为 `/var/backups/siyuanxue-media/98bb7b8e0234d287bc46827b6df29f3399a9716048c58117cd0ed41dafe4c689/`；`ops/verify-media.py` 验证全部 70 文件在两域名的 SHA-256 与响应头，排球全部 100 文件两站公网校验也通过。用户完成认证的临时 SSH ControlMaster 已在上传完成后关闭。此时媒体准备完成，静态发布结果见下方后续验收，媒体可访问与页面发布分别核对。

合并前独立只读审查 `5b2d35e..b5ddbd30a77739ed88802f25225b14e476227732` 无 Critical/Important/Minor 问题，可合并；审查者另执行新增双语兼容检查 2 pass / 0 fail（20 assertions），核对实际 HTML 顺序/分区/图注/外链/加载顺序及唯一 ID、本机 70 文件和原始字节。远端 main 仍为 `e300a8195ebcd7526c1fd801398f70ffe97f4bcc`，工作区干净后快进合并、推送目标 `b5ddbd30a77739ed88802f25225b14e476227732`，由 [Actions 38118386893](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38118386893) 完成发布。英文桌面七图全部载入，通栏宽 624px、并列宽 302px，图片保持自然比例，临时视口和主题已恢复。

[Actions 38118386893](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38118386893) 的验证与部署 job 均成功、工作流 conclusion 为 success，目标为 `b5ddbd30a77739ed88802f25225b14e476227732`。`ops/verify-public.sh` 核对两域名 `/__health` 全量 SHA、固定中英文和旧照片 410；六个 HTTP/www 地址均 301 到对应本域 HTTPS。公开 HTML 专项核对两站唯一首入口、正文/角色/时间、七图顺序/图注、3/4 分区、两平台外链、canonical/hreflang/ImageGallery/分享封面及 sitemap；旧地址实际 200 HTML 包含即时 meta refresh、备用站内入口与 noindex，且没有进入 sitemap。排球 4/6 分区、十图、无时间/空括号和《与光同行》校庆背景同步通过公网 HTML 检查。

生产浏览器两语言旧址均实际导航到本域合并页，七图完整载入；桌面通栏/并列为 624px/302px，390px 窄屏为 358px 单列、无横向溢出，明暗可读。两语言 Enter 打开第三图、ArrowRight 从 3/7 到 4/7、Escape 关闭并回到原入口；中文截图 Zoom 的 `pswp--zoomed-in` 状态实际确认。中文完整生产截图为 `/tmp/imathbook-production-2026-10-11.png`，临时预览/验收文件不入库，视口和主题恢复。静态 release 与后续 `[skip ci]` 文档提交分开，文档提交不重新部署。

## 维护联动清单

- 已更新：双语内容、参与与主导角色、原图对应的 alt/图注、3/4 分区、首页唯一入口、旧址静态兼容和索引排除、媒体清单、图集指南、维护总览、本轮审计及匹配产物验证；本机七图与衍生文件校验、授权范围及快照、两站公网媒体、独立审查、Actions 和生产验收。
- 不适用：沿用既有封面/canonical/hreflang/ImageGallery 和连续灯箱，无新域名、账号、权限、CI 变量/secret、依赖、Nginx/helper、聊天、Hermes、微信、记忆服务、模型或数据库变更。GitHub 公开账号和两仓库 About 无需改变；独立主页 README 仍提供两个有效平台链接，本次没有改变身份资料，保留其独立项目列表；不将网站提交视作外部服务更新。
- 待处理：实体设备、搜索实际收录、媒体异地备份保留原有待办；本次授权、媒体直传及两站摘要、独立审查、Actions、目标 SHA/正文/旧址导航/生产浏览器验收已完成。
