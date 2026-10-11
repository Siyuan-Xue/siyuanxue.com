# 《寻找李白》图集（2026-10-11）

## 内容与范围

用户要求在兴趣爱好新增「话剧《寻找李白》· 饰 田波」，并提供九张真实照片。两份 JSON 位于 `src/content/galleries/finding-li-bai/{en,zh}.json`，首页在 `src/data/site.ts` 显式关联，排列在《与光同行》之后、排球队之前；稳定路径为 `/gallery/finding-li-bai/`。英文标题为「Finding Li Bai · as Tian Bo」。

实际角色为饰演田波，正文依据用户说明，介绍第二次话剧演出、在剧团中收获真挚友谊及演出结束后的强烈不舍。尚未提供年月，已询问；暂以「第二次参演话剧 / My second theatre production」表达相对经历，没有猜测演出日期、地点、奖项或其他演员身份。用户没有提供资料链接，两份 `links` 均为空。

沿用已确认的照片图集设计，未改变组件、CSS、灯箱或内容 schema。九张照片的媒体编号对应用户输入顺序，页面顺序为 01、02、03、04、05、08、09、06、07；首图是横向舞台全景，两张竖照并排，末尾为朋友与剧组合影，图片保持原比例。两语言均为 `appearances`、`order: 1`、`draft: false`、`preview: false`，作为正式真实内容进入首页及 sitemap；元信息由既有模板生成。

## 媒体直传与恢复

本机原图副本位于忽略目录 `media-local/originals/finding-li-bai/`，原图字节未改变。Sharp `photos` profile 生成 AVIF/WebP 响应式图片及 JPEG 分享封面；`src/data/media.json` 只追加九个 `finding-li-bai/photo-01` 至 `photo-09` ID，共 90 个原图与派生文件、4,174,633 字节。二进制不进入 Git 或 CI 静态包。

原生 SSH/rsync 直传到既有共享媒体目录，保持严格主机校验，服务器逐文件 SHA-256 与大小验证通过。恢复快照为 `/var/backups/siyuanxue-media/97a9a7ea25d55e1bbbfdb9eeb721f23f4c9ef13732bdc508db3d5b922906417c/`，与线上媒体同盘，不代替异地备份；旧媒体未覆盖或删除。密码只用于既有原生终端登录，不写入脚本、文档或 Git。

恢复时从 Git 还原双语 JSON、首页关联和清单，走现有 Actions 或 rollback；媒体缺失再从本机副本或核验过的快照恢复并运行 `ops/verify-media.py`。网站回滚不会删除已上传媒体。

## 本轮验证与发布

本轮 `ops/verify-media.py` 使用选定清单，完成两域名 180 次 GET，90 个文件的 SHA-256、大小、MIME 和 immutable 缓存通过。`bun run check` 检查 88 文件，零 errors/warnings/hints；双语构建各 18 页，30 项产物检查全部通过（5132 assertions），临时正式双语图集构建 1 pass（228 assertions）。产物检查的固定入口名单追加 `finding-li-bai`，已有的首页排序、九图的原图/缩略图/alt/图注、正式索引元信息与 sitemap 检查均覆盖新页，没有删弱测试。与基线比对只追加九个媒体 ID，旧记录全部相同；本机 90 文件的摘要/大小和双语顺序再次核对通过。独立审查及本轮 Actions / 生产验收结果见下文。此前《与光同行》或聊天任务的验证不代替本轮验收。

首次将类型检查与构建并行运行时，两者共写 Astro 内容缓存，类型检查在缓存临时文件 rename 时遇到 ENOENT；构建本身完成，但产物测试报告入口名单缺新 slug。核对错误与固定名单后，只追加新入口，并顺序运行检查和构建，上述检查均通过；未修改依赖、缓存实现或内容验证规则。

独立只读审查 `489dc94…78ca9a9` 未发现 Critical / Important 问题，核对了九张原图与双语说明、首页顺序、正式索引产物及 90 个本机文件的摘要/大小/真实尺寸与格式。唯一 Minor 是维护总览及待办仍泛称等待本轮检查，已改为等待 Actions 和生产验收。

本机中文静态预览完成 1280px 桌面与 390px 窄屏验收，九图均已载入；桌面首图宽 624px、其余 302px，窄屏全部宽 358px 单列，无横向溢出。Enter 打开 1/9、ArrowRight 到 2/9、Zoom 放大、Escape 关闭及焦点返回均通过，可见灯箱控件为英文。临时视口已 reset、标签及本轮预览服务已关闭；没有终止同端口范围的其他预览服务。此结果不是实体手机验收。

GitHub Actions [38111409933](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38111409933) 于 2026-10-11 12:27（北京时间）成功完成共享验证、静态包传输、激活、双站公网检查与收尾，发布 SHA 为 `c01926ba94958eed34f4cd9b1446b0bace1a344a`。本机 `ops/verify-public.sh` 核对两域名目标 SHA、固定语言、HTTP/www 跳转及旧照片 410 通过；选定媒体清单的全部字节检查在上传后已完成，CI 发布后再验资源可达性。

本轮线上 HTML 验证脚本 `media-local/verify-finding-li-bai-public.mjs`（本机忽略目录）从两域名读取页面：首页新入口仅出现一次，顺序位于《与光同行》与排球队之间；标题、介绍、角色、相对经历、九图原图 href/alt/图注均与对应语言 JSON 一致。两份页面为正式可索引内容，canonical/hreflang、九项 ImageGallery、首图分享封面及 sitemap 均核对通过；没有虚构资料链接。

两域名生产浏览器分别验收：1280px 桌面九图加载正常，首图宽 624px、其余 302px；390px 窄屏九图均为 358px 单列，页面无横向溢出。明暗切换、Enter 打开 1/9、ArrowRight 到 2/9、Zoom 实际放大、Escape 关闭和焦点返回全部通过，灯箱可见控件均为英文。视口恢复默认，英文临时标签关闭，中文发布页保留供查看。线上截图保存在 `/tmp/finding-li-bai-production-2026-10-11.png` 并在交付回复展示，不进入 Git。本轮没有实体手机验收。

发布验收后的维护记录以单独 `[skip ci]` 文档提交保存，线上产物继续对应上述发布 SHA；无需再次部署同一内容。

## 维护联动

- 已更新：双语图集、首页入口与标题、九图的 alt/图注、媒体清单、本机副本及服务器恢复快照、图集指南与维护总览。
- 不适用：BaseHead 使用已有内容生成 canonical/hreflang/ImageGallery/分享封面；站点 README、GitHub 账号 name/bio/blog、独立主页 README 与两仓库 About 已只读核对，没有本剧条目或旧角色名，无需因本次内容添加改写；既有人设与身份没有变化。未修改域名、账号权限、CI 变量/secret、Nginx/helper、聊天、Hermes、微信、记忆、模型或独立服务。
- 待处理：演出年月可补充，当前相对经历为用户已确认事实，不阻塞发布；搜索收录、实体手机体验及媒体异地备份等原有维护待办保持原状态。本次要求的内容、媒体上传及双站发布已完成。

开发基线为另一聊天任务已推送的 `0203f76e1db9e7e69ef1f863a2b7fd6bb2b515ad`，在 `codex/finding-li-bai-gallery` 分支准备内容；与其独立工作树协调 main 推送后，重放在其最终文档提交 `489dc940c149fb67c3e1c7a179190eb3b00ff1e9` 上，内容提交为 `78ca9a95924f9cc91751f72a7e75d48769e6f27a`，随后补本机/审查记录并 fast-forward main。对方欢迎句、样式及审计均保留。历史 archive、未推送提交及本地备份均未清理。
