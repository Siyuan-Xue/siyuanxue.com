# 《家》图集（2026-10-11）

## 内容与维护范围

用户要求新增兴趣爱好「话剧《家》· 饰 高觉新」并提供九张真实照片。双语内容位于 `src/content/galleries/family/{en,zh}.json`，首页在 `src/data/site.ts` 关联，顺序位于《寻找李白》之后、排球队之前；英文标题为「Family · as Gao Juexin」，稳定地址 `/gallery/family/`。

介绍依据用户说明：第一次登上话剧舞台即饰演男主角高觉新，话剧带来奇妙体验并丰富大学生活；《家》是曹禺改编的、讲述封建家庭悲剧的话剧，角色为高家的长子长孙。未提供演出年月或资料链接，时间以「首次登上话剧舞台 / My theatre debut」表达，没有猜测日期、地点、奖项或其他演员身份；两份 `links` 为空。

九图按用户输入顺序展示，编号为 `family/photo-01` 至 `photo-09`，首图为红色婚服舞台照，后续呈现舞台片段及末尾两张合影。保留原比例、逐图 alt/图注与现有灯箱，没有修改 schema、组件、CSS 或交互。两语言均为 `appearances`、`order: 2`、`draft: false`、`preview: false`，作为真实正式内容公开并进入 sitemap。既有产物测试的首页固定入口名单仅追加 `family`，未新增镜像实现测试或删弱验证。

## 媒体与恢复

忽略目录 `media-local/originals/family/` 保存原图字节副本，`media-local/` 保存 AVIF/WebP 响应式文件及 JPEG 分享封面。只在 `src/data/media.json` 追加九个媒体 ID，旧记录完全相同；本机全部 90 文件的 SHA-256、大小和双语引用顺序已核对，共 5,252,410 字节。没有将二进制提交到 Git 或 CI。

原生 SSH/rsync 经严格主机校验直传，服务器 90 文件摘要/大小核验通过。恢复快照为 `/var/backups/siyuanxue-media/06aa57f5a1a3cc92aa9ac1712bc1bd9e3882af3ab239551a58690c1e995c3ffa/`，与媒体同盘，不代替异地灾备；旧媒体未覆盖或删除。密码只在原生终端登录使用，不写脚本、文档或 Git。

恢复内容从 Git 还原双语 JSON、首页关联与清单，走原 Actions 发布或 rollback；媒体缺失从本机或核验过的快照恢复并运行 `ops/verify-media.py`。静态网站回滚不删除共享媒体，无需安装 Nginx/helper 或独立服务。

## 本轮验证与发布

`bun run check` 检查 90 文件，零 errors/warnings/hints。双语构建各 19 页，30 项产物检查全部通过（5838 assertions），正式图集 fixture 验证 1 pass（228 assertions）。本机媒体摘要/大小、旧清单保持和双语顺序检查通过。`ops/verify-media.py` 对两域名完成 180 次 GET，全部 90 文件的 SHA-256、大小、MIME 与 immutable 缓存通过。独立审查及生产发布结果待补；此前《寻找李白》等任务的验收不代替本轮检查。

## 维护联动清单

- 已更新：双语内容、首页入口、九图清单与 alt/图注、本机素材及服务器恢复快照、图集指南和维护总览。
- 不适用：沿用 BaseHead 生成 canonical/hreflang/ImageGallery/分享封面；既有站点 README、GitHub 账号、独立主页 README 与仓库 About 的资料无需因单个兴趣条目改写，本轮已只读核对，未发现本剧旧名称或角色引用，无需修改。没有更改域名、账号权限、CI 变量/secret、Nginx/helper、聊天、Hermes、微信、记忆、模型或独立服务。
- 待处理：本轮审查、Actions 及双域名生产验收；演出年月可后续补充。搜索收录、实体手机体验和媒体异地备份等原有待办保持原状态。

开工时 `main` 与 `origin/main` 同为 `ab1b6f21a12fdd1c4c0f8fa516aba33be93cd5e6`，工作区干净，无其他工作树；本轮在 `codex/family-gallery` 分支准备内容。历史 archive、未推送提交及本地备份未清理。
