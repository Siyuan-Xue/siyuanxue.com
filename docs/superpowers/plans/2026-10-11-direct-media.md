# Direct Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 图片视频直传服务器，网页继续双语 CI/CD，项目显示名统一为 Pixel Done。

**Architecture:** 内容通过媒体 ID 引用 Git 中的轻量清单。Sharp 在本地准备内容寻址的原图及缩略图，SSH/rsync 直传后校验安装到独立媒体目录，Nginx 在两站公开读取。

**Tech Stack:** Astro、TypeScript、Sharp、原生 SSH/rsync、Python 3、Nginx。

**Spec:** `docs/superpowers/specs/2026-10-11-direct-media.md`

## Global Constraints

- 名称为 `Pixel Done`；不修改 `/gallery/pixeldone/` 或仓库 URL。
- 图片视频不进入当前 Git 源码或 CI 静态产物；不重写历史。
- 不保存认证密码；严格 known_hosts；双语同一 release。
- 保留单击肖像、英文灯箱控件、无圆框图标与旧照片 410。

## Review Focus

- 未知媒体 ID、视频被当图片引用、非法路径必须拒绝。
- 哈希或大小不匹配不得安装，既有同名内容冲突不得覆盖。
- 中断后可重传；网站回滚不得删除媒体。
- 新鲜 CI checkout 无本地媒体仍可完整构建。
- 两域名返回相同媒体，视频 Range、缓存和旧拒绝路由保持正确。

### Task 1: 清单、准备与页面引用

**Files:** `src/utils/media.ts`、`src/data/media.json`、`src/components/MediaPicture.astro`、`scripts/prepare-media.mjs`、现有内容/组件和产物测试。

**Interfaces:** `imageMediaSchema` 解析 ID 为 `ImageMedia`；`prepareMedia(id, source, options)` 生成媒体记录与本地文件。

- [x] 添加并运行 ID/路径/准备流程失败测试。
- [x] 实现清单验证与本机准备；迁移所有现有栅格图，改用普通 HTML picture。
- [x] 同步 Pixel Done 两语言显示名，构建及行为/无媒体产物检查通过。

### Task 2: 直传、服务器路由与发布

**Files:** `ops/upload-media.sh`、`ops/install-media.py`、Nginx 模板、运维测试、维护指南和审计。

**Interfaces:** 安装器逐文件校验，追加安装到 `shared/media/`；上传器使用原生 SSH 提示和 rsync 暂存。

- [x] 添加并运行路径/摘要/冲突/幂等安装和 Nginx 媒体路由测试。
- [x] 上传真实媒体，单独备份与安装现有 Nginx 媒体路由，验证两站资源。
- [x] 完整验证并请求独立代码审阅，修复重要问题。
- [x] 通过 Actions 发布，验证两站 SHA、图片和灯箱；记录已更新、不适用、待处理。
