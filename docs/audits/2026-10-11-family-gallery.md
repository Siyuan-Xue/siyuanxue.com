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

`bun run check` 检查 90 文件，零 errors/warnings/hints。双语构建各 19 页，30 项产物检查全部通过（5838 assertions），正式图集 fixture 验证 1 pass（228 assertions）。本机媒体摘要/大小、旧清单保持和双语顺序检查通过。`ops/verify-media.py` 对两域名完成 180 次 GET，全部 90 文件的 SHA-256、大小、MIME 与 immutable 缓存通过。此前《寻找李白》等任务的验收不代替本轮检查。

独立只读审查范围为 `ab1b6f2…3df850b`。审查核对九张原图字节和输入顺序、旧清单保持、90 个派生资源、双语正文与生成元信息，最终结论为可合并，无未解决的 Critical、Important 或 Minor。审查发现第 5 张 alt 的左右方向表述不准确，已在两语言中改为「伸手说话 / with his arm extended」，并重新构建双语产物，19 页/语言及 30 项产物检查再次通过。

中文本机预览完成 1280px 桌面及 390px 窄屏排版检查：九图均已载入，桌面首图宽 624px、其余 302px，唯一竖图以 302 × 453px 保持原比例；窄屏全部宽 358px，无横向溢出。临时视口已 reset，本轮预览标签和服务已关闭，没有终止其他预览服务。此检查不是实体手机验收。

2026-10-11（北京时间），[Actions 38112284028](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38112284028) 已成功发布 `3df850bcf4effe2c62c8303924586d1ecc17953e`：共享验证、已验证产物传输、激活、两语言公网检查及媒体响应头检查均成功。另在本机运行 `ops/verify-public.sh`，两域名目标 SHA、固定语言、HTTP/www 跳转及旧照片拒绝通过；专门的生产 HTML 检查核对首页仅一个入口且顺序正确、正文/相对经历/角色、九图原图地址/alt/图注、canonical/hreflang/ImageGallery/分享封面和 sitemap，均符合本轮 JSON。两语言无 noindex，未增加不明资料链接。

生产浏览器在两域名完成明暗主题与 390px 窄屏检查；九图均载入，窄屏图片宽 358px，页面宽 390px，无横向溢出。中文 1280px 桌面照片宽度为首图 624px、其余 302px，竖图保持 302 × 453px。两站灯箱均用 Enter 打开首图，英文 Close/Zoom/Previous/Next 可见，ArrowRight 切至 2/9，Zoom 状态确认，Escape 关闭并将焦点归还原图入口。已恢复浅色主题及默认视口，英文临时标签关闭，中文正式图集标签作为交付保留；本机截图 `/tmp/family-production-2026-10-11.png` 为临时验收证据，不进入 Git。实体手机与搜索实际收录未作为本轮通过项。

后续仅补审计的 `[skip ci]` 文档提交不改变上述静态 release SHA；媒体直传与静态 Actions 发布分别完成，无服务器组件安装。

## 维护联动清单

- 已更新：双语内容、首页入口、九图清单与 alt/图注、本机素材及服务器恢复快照、图集指南和维护总览。
- 不适用：沿用 BaseHead 生成 canonical/hreflang/ImageGallery/分享封面；既有站点 README、GitHub 账号、独立主页 README 与仓库 About 的资料无需因单个兴趣条目改写，本轮已只读核对，未发现本剧旧名称或角色引用，无需修改。没有更改域名、账号权限、CI 变量/secret、Nginx/helper、聊天、Hermes、微信、记忆、模型或独立服务。
- 待处理：演出年月可后续按用户提供的信息补充，不阻塞当前相对经历表达。搜索收录、实体手机体验和媒体异地备份等原有待办保持原状态；本轮内容、审查与发布无未完成项。

开工时 `main` 与 `origin/main` 同为 `ab1b6f21a12fdd1c4c0f8fa516aba33be93cd5e6`，工作区干净，无其他工作树；本轮在 `codex/family-gallery` 分支准备内容。历史 archive、未推送提交及本地备份未清理。
