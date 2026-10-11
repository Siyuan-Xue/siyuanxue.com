# 2026-10-11 首页中英文简介

## 用户确认与范围

用户经过中文文案 review 后确认以下文本，并明确要求「就这样，上线中英文」：

> 薛思远是北京邮电大学智能科学与技术专业的学生。他热衷于探索未知，追求极致与完美。他对产品与技术倾注热情，享受亲手做出一些东西的快乐，给生活带来惊喜。他最喜欢的一句话是
> Stay hungry, stay foolish.

首页简介使用第三人称，不再重复项目与兴趣模块中的经历。此次仅改 `src/data/site.ts` 的双语简介及对应分享/搜索摘要；沿用既有三段渲染，最后一句英文单独成段。首页及文章/图集复用的 Person 描述自动由同一源资料更新，姓名、别名、稳定人物 ID、canonical/hreflang 与现有公开项目支持的 knowsAbout 均保留。

英文正文：

> Siyuan Xue is a student of Intelligence Science and Technology at Beijing University of Posts and Telecommunications. He is passionate about exploring the unknown and pursuing excellence and perfection. He pours his passion into products and technology, finding joy in making things himself and bringing moments of surprise to everyday life.
>
> His favorite saying is
>
> Stay hungry, stay foolish.

## 变更前基线

- 源码：`main` / `origin/main` 为 `90f19fc0e0842d7a0d8aa3e2136db0ef0ea03299`；工作区干净，仅一个活动工作树。
- 两域名公开 `/__health` 均为 `57a0c8a9d744e9ed511594452737c75e09db65dc`。后续文档提交的 SHA 与实际静态版本分开记录。
- 既有本地 archive、未推送分支与备份均未清理。

## 联动清单

| 资源 | 本次状态 |
|---|---|
| `src/data/site.ts` 中英简介与摘要 | 已更新；中文用用户定稿，英文对应翻译 |
| `Bio.astro`、Person / ProfilePage / WebSite / BlogPosting | 已核对；共享源资料自动生效，不需改模板 |
| 网站 README | 已核对；姓名、学校、专业与项目方向仍由公开事实支持，无需改写工程仓库说明 |
| GitHub 账号 name / bio / blog | 已经公开 API 重新核对；姓名别名、BUPT 和两个域名一致，未编辑账号 |
| 独立个人主页 README 与两仓库 About | 已经公开 API 重新核对；现有介绍与网站事实兼容，未编辑独立仓库或 About |
| 图片、视频、媒体清单、Nginx/helper | 不适用；没有素材或服务器配置变更 |
| 聊天 bridge、Hermes、微信、记忆、模型 | 不适用；没有角色或经历事实变更，也未读取私人内容或修改服务 |
| 域名、DNS、CI 变量、secret、搜索平台账号 | 不适用；复用现有双语 Actions，保留平台验证与稳定路由 |
| 维护入口和恢复说明 | 已更新本记录及 `docs/MAINTENANCE.md` |

## 验证与发布

- `bun run check`：105 个 Astro 文件，0 errors / warnings / hints；TypeScript 检查成功。
- `bun run build`：两语言均构建成功，逐语言发现策略各核对 19 个 HTML 路由；产物测试 34 pass / 0 fail、6702 个断言。
- 额外核对两首页产物：中文首段逐字匹配用户定稿；两语言均为三段，英文原句独立成段；description / Open Graph / Twitter 摘要、Person 描述和稳定人物 ID 一致。
- Git 差异与远端已核对，本次只有源资料及维护记录修改。
- [生产 Actions 38150083083](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38150083083) 已成功发布提交 `b1a0a3919cc323f391afce6a6b873b6a9315bdd9`。最终 API 状态为 completed / success；共享验证、部署、IndexNow 通知三个 job 均 success，rollback skipped。共享验证按既有 `ops/verify.sh` 执行，部署含两站版本/语言/旧照片拒绝和全量媒体响应头检查。通知 job 成功与平台实际收录/曝光分开记录，本次没有重新验收搜索平台的收录或引用。
- 本次独立公网验收：`bash ops/verify-public.sh b1a0a3919cc323f391afce6a6b873b6a9315bdd9` 成功，两站目标完整 SHA、固定语言、旧照片 410 正确；额外直接请求确认两首页 HTTP 200、正文/三段/格言与源资料一致、三类分享摘要与 Person 描述一致，canonical 正确，中文百度验证标签保留，HTTP/www 均 301 到本域名 apex。
- Codex 内置浏览器生产页面：两语言均查看 1280×720 桌面和 390×844 窄屏实际排版；正文与格言完整，窄屏 `scrollWidth = clientWidth = 390`，无横向溢出。沿用当前浅色显示，没有改动主题设置、肖像行为或控件顺序；临时 viewport override 已 reset。此项为浏览器窄屏模拟，不宣称实体手机验收。

本次请求已完成。后续 `[skip ci]` 维护文档提交不改变上述静态 release；既有搜索平台收录观察、备份与独立服务待办仍保留在维护总览，不属于本次简介更新的未完成项。

## 恢复

正常恢复：通过 Git 还原本次 `src/data/site.ts` 文案后走原 Actions 双语发布。紧急恢复可使用生产工作流 `operation=rollback` 和已保留的成功版本完整 SHA；本次变更前公网版本为 `57a0c8a9d744e9ed511594452737c75e09db65dc`，执行前核对该 release 仍保留。无需重传媒体、重装服务或修改搜索平台验证配置。
