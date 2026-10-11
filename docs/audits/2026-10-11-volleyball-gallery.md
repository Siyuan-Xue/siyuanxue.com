# 排球队图集与两个照片区域（2026-10-11）

## 内容与展示

用户要求为现有兴趣爱好「校排球队 · 院排球队」制作真实画廊，提供十张照片，并明确前四张为校队、后六张为院队。双语 JSON 位于 `src/content/galleries/volleyball/{en,zh}.json`，首页关联仍在 `src/data/site.ts`，稳定地址 `/gallery/volleyball/` 和原有首页位置保持不变；英文标题为「BUPT volleyball · university & college teams」。

介绍依据用户确认的经历：热爱排球，上大学后一周内加入两支球队，此后代表学校参加多次北京市比赛，并代表学院多次赢得校内比赛冠军。初次准备用「大学期间 / During university」表达宽泛经历；随后用户明确排球贯穿大学始终、不需时间信息，最终两语言删除 `period`，首页及画廊不显示时间段落或空括号，正文补充贯穿大学生活。没有从个别照片横幅推定全组年份，也未推测赛事名称、名次、冠军次数、领导身份或其他人物身份。没有提供资料链接，两语言 `links` 为空。两份 JSON 同时设为 `draft: false`、`preview: false`，正式内容进入 sitemap。

同一后续请求将《与光同行》首页条目的括号信息改为「北邮70周年校庆 / BUPT 70th anniversary」，双语 JSON 的 `period` 与 `site.ts` 的源背景同步更新。正文既有排练和演出事实、16 图及四个资料链接保持不变；该次文字调整与排球画廊一起由原 Actions 发布，不改写之前发布的历史验收记录。

照片顺序与用户输入一致，编号为 `volleyball/photo-01` 至 `photo-10`。新增可选 `imageSections`，校队从索引 0 开始、院队从索引 4 开始，用可见二级标题和语义分区呈现。每组分别沿用原 `photos` 布局：首图通栏、两张并列、未配对末图通栏，窄屏单列，全部保持原比例。共享图片标记提取到 `GalleryImageGrid.astro`；未设置分区的既有图集保持原布局。图注 ID 使用全页索引避免重复，只有整页第一张优先加载。灯箱仍读取整页的十张图片，跨分区连续切换。

## 素材、维护与恢复

忽略目录 `media-local/originals/volleyball/` 保留用户原图字节副本，`media-local/` 保存 AVIF/WebP 响应式文件及 JPEG 分享封面。`src/data/media.json` 仅追加十个 ID，旧记录保持完全相同；100 文件共 7,524,469 字节，本机 SHA-256 与大小检查通过。二进制不进入 Git 或 CI。

恢复内容时从 Git 还原双语 JSON、媒体清单、共享展示组件及样式，再通过原 Actions 发布或 rollback；媒体独立于静态 release，回滚不删除已上传资源。媒体缺失时从核验过的本机原图/派生文件或服务器媒体快照恢复，再执行公网摘要与响应头校验。此次无需安装 Nginx/helper 或独立服务。

## 本轮验证及发布状态

先添加分区 schema、双语边界/图片顺序及真实 Astro fixture 验证：实现前内容测试 15 pass / 2 fail，正式 fixture 在缺少两个分区时失败。实现后内容测试 17 pass / 0 fail（61 assertions），正式双语 fixture 1 pass / 0 fail（248 assertions），检查可见标题、语义关联、每组两图、唯一图注 ID、仅首图 eager 及既有无分区版式。类型检查 93 文件，零 errors/warnings/hints。

完整测试首轮的聊天 bridge 子套件因沙箱拒绝 `127.0.0.1` 监听失败；在允许临时本地监听的环境中重跑后，116 pass / 0 fail（491 assertions）。双语构建每语言 19 页，30 项产物检查通过（6314 assertions）；最终正式 fixture 再次通过（248 assertions）。

本机通过仅监听 `127.0.0.1` 的临时服务器读取 `dist` 和本地 `media-local/`，没有将照片外传。两语言桌面和 390px 窄屏均确认可见分区为四图/六图，全部十张载入；桌面通栏为 624px、并列为 302px，两个竖图分别以约 302 × 453px 保持原比例。窄屏全部为 358px，页面宽 390px，无横向溢出；两语言主题切换后标题与正文可读。中文灯箱从校队末图 Enter 打开为 4/10，ArrowRight 连续到院队首图 5/10，英文 Close/Zoom/Previous/Next 可见；Zoom 状态确认，Escape 关闭并返回校队末图入口焦点。视口及主题已恢复；本机完整预览图 `/tmp/volleyball-local-2026-10-11.png` 不进入 Git。这不是实体手机或生产域名验收。

独立只读审查范围为 `e300a81…33f1f1a`，核对内容事实、十张原图字节、旧清单保持、100 文件摘要/大小、分区 schema、双语生成页面、唯一图注 ID、首图优先加载及跨区域灯箱实现。审查额外运行内容与灯箱测试，25 pass / 0 fail（91 assertions）；最终结论为代码可合并，无 Critical、Important 或 Minor，前提是媒体先完成上传和公网核验。审查没有改变分支或工作区；生产媒体、服务器快照、Actions 与实体设备等未作为审查通过项。主任务另已只读核对公开 GitHub 资料，审查未重复这项外部核对。

后续可选时间与校庆文字修正先补回归验证，内容测试实现前为 17 pass / 2 fail，实现后为 19 pass / 0 fail（65 assertions）。再次执行类型检查 93 文件、零 errors/warnings/hints；完整测试 118 pass / 0 fail（495 assertions）；双语构建每语言 19 页、30 项产物检查通过（6314 assertions）；正式 Astro fixture 1 pass / 0 fail（252 assertions），核对省略时间时画廊没有空段落、首页没有空括号，既有带时间预览仍显示背景。最终本机浏览器确认两语言首页《与光同行》括号为校庆信息、排球入口没有时间，排球两语言画廊无时间段落、4/6 分区不变；中文十图全部载入，最终预览图已更新。

后续独立只读审查 `1316d99…ad8b456` 未发现 Critical、Important 或 Minor；独立内容测试 19 pass / 0 fail（65 assertions），两语言构建产物中的无时间/无空括号、校庆背景、正文保留与 4/6 分区检查通过，`git diff --check` 通过。主任务再以临时本机 HTTP 验证两站首页、十图原址/alt/图注/唯一 ID/加载策略、两个分区、校庆正文保留、分享封面、canonical/hreflang/ImageGallery 及 sitemap，全部通过。三份变动文档的相对链接目标均存在。媒体登录认证、Actions 和公网验收仍未执行，不包含在本机验证和审查结论内。

初次媒体上传因自动审批认为目的地授权不足而未执行，之后用户明确「授权 上线」，覆盖所列 `ubuntu@82.156.77.131`、共享媒体目录与十图/缩略图范围。用户完成原生 SSH 认证后，100 文件已通过 rsync 直传及服务器逐文件 SHA-256/大小验证，快照为 `/var/backups/siyuanxue-media/29f2eec12c2939da44857283f6a69c437d1aa48a8eadab3ecc32f937cf84f78b/`（同盘恢复副本）；`ops/verify-media.py` 校验全部 100 文件在两域名的内容摘要与响应头。媒体准备完成，静态修改将与随后授权的 [数学平台合并](2026-10-11-imathbook-umathhub-gallery.md) 一起经原 Actions 发布；页面上线状态见下方后续验收。

[Actions 38118386893](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38118386893) 的验证和部署均成功，将排球图集、可选时间与校庆背景、数学平台合并一起发布为 `b5ddbd30a77739ed88802f25225b14e476227732`。两站 `/__health` 均为完整目标 SHA、语言固定、旧照片 410；HTTP/www 六处跳转均 301 到对应本域 HTTPS。两站公开 HTML 专项核对正文、本人角色、十图/图注/全局 caption ID、校队四图和院队六图、无时间段落/首页空括号、首页顺序、校庆文字、canonical/hreflang/ImageGallery/封面和 sitemap，全部通过。

生产两语言十图全部载入，桌面通栏/并列为 624px/302px，390px 窄屏为 358px 单列，无横向溢出；明暗主题正文与标题可读。中文 Enter 从校队末图 4/10 打开、ArrowRight 到院队首图 5/10，英文 Close/Zoom/Previous/Next 可见；Zoom 放大状态实际确认，Escape 关闭并返回原入口焦点。中文完整生产截图 `/tmp/volleyball-production-2026-10-11.png` 已保存，因响应式图片切换后截图仍可能尚未绘制，逐屏滚动并目视核对最终十图均已绘制。临时浏览器视口和主题恢复。后续 `[skip ci]` 文档提交不改变此静态版本。

## 维护联动清单

- 已更新：双语正文/角色/alt/图注、两个区域、图片清单、源资料英文标题、共享验证与展示、图集指南、维护总览和本轮审计；本机素材及派生文件已核验。
- 不适用：沿用既有 BaseHead 的 canonical/hreflang/ImageGallery/分享封面，无新域名、账号、权限、CI 变量/secret、依赖、服务、聊天、Hermes、微信、记忆或模型变更。只读核对站点 README、GitHub 账号、独立主页 README 和两仓库 About：主页已概述排球兴趣，未发现旧队名或需随此图集改写的身份资料，无需修改。
- 待处理：实体手机、搜索实际收录与媒体异地备份沿用原有待办，不属于本次通过项。初版、后续文字及数学合并审查、匹配验证、授权媒体直传/快照/公网摘要、Actions 和两站目标 SHA/内容/生产浏览器验收均通过。

开工时 `main` 与 `origin/main` 同为 `e300a8195ebcd7526c1fd801398f70ffe97f4bcc`，工作区干净，仅一个工作树。本轮分支为 `codex/volleyball-gallery`；未清理历史 archive、未推送提交或本地备份。
