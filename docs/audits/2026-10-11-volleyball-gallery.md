# 排球队图集与两个照片区域（2026-10-11）

## 内容与展示

用户要求为现有兴趣爱好「校排球队 · 院排球队」制作真实画廊，提供十张照片，并明确前四张为校队、后六张为院队。双语 JSON 位于 `src/content/galleries/volleyball/{en,zh}.json`，首页关联仍在 `src/data/site.ts`，稳定地址 `/gallery/volleyball/` 和原有首页位置保持不变；英文标题为「BUPT volleyball · university & college teams」。

介绍依据用户确认的经历：热爱排球，上大学后一周内加入两支球队，此后代表学校参加多次北京市比赛，并代表学院多次赢得校内比赛冠军。未提供整段经历的年月，使用「大学期间 / During university」，不从个别照片横幅推定全组年份；没有推测赛事名称、名次、冠军次数、领导身份或其他人物身份。没有提供资料链接，两语言 `links` 为空。两份 JSON 同时设为 `draft: false`、`preview: false`，正式内容进入 sitemap。

照片顺序与用户输入一致，编号为 `volleyball/photo-01` 至 `photo-10`。新增可选 `imageSections`，校队从索引 0 开始、院队从索引 4 开始，用可见二级标题和语义分区呈现。每组分别沿用原 `photos` 布局：首图通栏、两张并列、未配对末图通栏，窄屏单列，全部保持原比例。共享图片标记提取到 `GalleryImageGrid.astro`；未设置分区的既有图集保持原布局。图注 ID 使用全页索引避免重复，只有整页第一张优先加载。灯箱仍读取整页的十张图片，跨分区连续切换。

## 素材、维护与恢复

忽略目录 `media-local/originals/volleyball/` 保留用户原图字节副本，`media-local/` 保存 AVIF/WebP 响应式文件及 JPEG 分享封面。`src/data/media.json` 仅追加十个 ID，旧记录保持完全相同；100 文件共 7,524,469 字节，本机 SHA-256 与大小检查通过。二进制不进入 Git 或 CI。

恢复内容时从 Git 还原双语 JSON、媒体清单、共享展示组件及样式，再通过原 Actions 发布或 rollback；媒体独立于静态 release，回滚不删除已上传资源。媒体缺失时从核验过的本机原图/派生文件或服务器媒体快照恢复，再执行公网摘要与响应头校验。此次无需安装 Nginx/helper 或独立服务。

## 本轮验证及发布状态

先添加分区 schema、双语边界/图片顺序及真实 Astro fixture 验证：实现前内容测试 15 pass / 2 fail，正式 fixture 在缺少两个分区时失败。实现后内容测试 17 pass / 0 fail（61 assertions），正式双语 fixture 1 pass / 0 fail（248 assertions），检查可见标题、语义关联、每组两图、唯一图注 ID、仅首图 eager 及既有无分区版式。类型检查 93 文件，零 errors/warnings/hints。

完整测试首轮的聊天 bridge 子套件因沙箱拒绝 `127.0.0.1` 监听失败；在允许临时本地监听的环境中重跑后，116 pass / 0 fail（491 assertions）。双语构建每语言 19 页，30 项产物检查通过（6314 assertions）；最终正式 fixture 再次通过（248 assertions）。

本机通过仅监听 `127.0.0.1` 的临时服务器读取 `dist` 和本地 `media-local/`，没有将照片外传。两语言桌面和 390px 窄屏均确认可见分区为四图/六图，全部十张载入；桌面通栏为 624px、并列为 302px，两个竖图分别以约 302 × 453px 保持原比例。窄屏全部为 358px，页面宽 390px，无横向溢出；两语言主题切换后标题与正文可读。中文灯箱从校队末图 Enter 打开为 4/10，ArrowRight 连续到院队首图 5/10，英文 Close/Zoom/Previous/Next 可见；Zoom 状态确认，Escape 关闭并返回校队末图入口焦点。视口及主题已恢复；本机完整预览图 `/tmp/volleyball-local-2026-10-11.png` 不进入 Git。这不是实体手机或生产域名验收。

媒体上传尚未执行：自动审批认为向 `82.156.77.131` 外传这些个人照片缺少明确目的地授权，已向用户列明 `ubuntu@82.156.77.131`、共享媒体目录与十图/缩略图范围请求批准。批准前只完成本地准备、验证与审查；静态新版也不先行发布，避免页面引用未上传媒体。本节待实际上传、Actions 和公网验收后补充结果。

## 维护联动清单

- 已更新：双语正文/角色/alt/图注、两个区域、图片清单、源资料英文标题、共享验证与展示、图集指南、维护总览和本轮审计；本机素材及派生文件已核验。
- 不适用：沿用既有 BaseHead 的 canonical/hreflang/ImageGallery/分享封面，无新域名、账号、权限、CI 变量/secret、依赖、服务、聊天、Hermes、微信、记忆或模型变更。只读核对站点 README、GitHub 账号、独立主页 README 和两仓库 About：主页已概述排球兴趣，未发现旧队名或需随此图集改写的身份资料，无需修改。
- 待处理：媒体目的地批准、直传与恢复快照、公网媒体、合并前审查、Actions 静态发布及两域名目标 SHA/正文/分区/元信息/生产浏览器验收。实体手机、搜索实际收录与媒体异地备份沿用原有待办，不属于本次通过项。

开工时 `main` 与 `origin/main` 同为 `e300a8195ebcd7526c1fd801398f70ffe97f4bcc`，工作区干净，仅一个工作树。本轮分支为 `codex/volleyball-gallery`；未清理历史 archive、未推送提交或本地备份。
