# B-Spline Policy 移除重复表格（2026-10-11）

## 需求与修改

用户指出真机实验图片已经包含数据表，不需要正文再重复一遍。基线为 `681f50f2c706cdf9e50b3e1dec06d8422e7f6e9a`，此前线上静态 release 为 `5f6df9621535d03c50eb01d029eb47226e0e8b70`。

- 中英文内容同时移除 `comparison.columns` / `comparison.rows`，仅保留简短结果说明。
- 共享模板移除 HTML 表格和不再使用的表格样式，内容模型收窄为 `comparison.title` / `comparison.description`。
- 真机原图、图注、标题与放大灯箱保留，模拟视频、资料链接、公司名「极智深诣 / SEEN-E」、索引和首页入口沿用已有内容。无需媒体重传。
- 更新现有产物检查，验证两语言不再生成 HTML 表格，结果说明仍存在。

## 验证与发布

先在原有产物上运行更新的针对性检查，两语言均因重复表格存在而失败。修改后本轮 `bun run check` 检查 85 文件，0 errors / warnings / hints；图集内容单元测试 12 pass / 41 assertions；双语构建各 17 页，产物检查 28 pass / 3572 assertions，包含重复表格消失、结果说明及原媒体/元信息仍存在的验证。临时真实双语图集构建 `bun run test:gallery`：1 pass / 228 assertions。`git diff --check` 和更新文档的相对链接检查通过。

[Actions 38103994833](https://github.com/Siyuan-Xue/siyuanxue.com/actions/runs/38103994833) 已成功发布 `0f1b0ac407d8b57b14a67059406528390e9e8bae`。`ops/verify-public.sh` 确认两域名目标 SHA、固定语言与旧照片 410；两站新图集 HTML 检查确认 0 个表格、1 张真机原图及简短说明，三视频/预览帧、首页关联、资料链接、canonical/hreflang/sitemap 和 VideoObject 对应正确。中文生产浏览器确认表格不再重复、图片正常加载、三视频 readyState=4 且无错误，并再次验证图片 Enter 打开、Zoom 放大、Escape 关闭及焦点返回。当前修改不涉及视频播放逻辑，未把上一轮播放至结尾的证据当作本轮新测试。

页面证明截图在本机临时 `/tmp/b-spline-table-cleanup-2026-10-11.png`，不作为备份。后续 `[skip ci]` 文档补记不改变上述静态 release SHA。

## 维护清单与恢复

- 已更新：双语正文、内容模型、模板、样式、对应检查、图集指南和维护总览。
- 不适用：媒体上传、账号/身份资料、secret、域名、Nginx、helper 或其他独立服务变更。
- 待处理：本轮请求已完成。媒体异地备份等既有待办沿用维护总览。

恢复时还原上述源码和两语言 JSON，通过现有 Actions 发布；亦可回滚到仍保留的成功双语 release。不删除原媒体、历史提交或旧备份。
