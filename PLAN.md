# PLAN.md — cn-net-notes 计算机网络笔记自学网站

> 2026-11-05 立项。模板：ds-code-notes（jlshdsdk.github.io/ds-code-notes/）。
> 本文件是执行计划 + 断点记录；配套 PROGRESS.md 记录执行日志。

## 目标

以 ds-code-notes 架构为模板，制作「计算机网络（王道考研 BV19E411D78Q）」笔记自学网站：

- 三级目录 + 富文本笔记（**无代码区**，计网没有代码）
- **黑/红/紫三色字体快选** + **重点标注**（加粗/高亮）
- **LaTeX 公式**：KaTeX 渲染 `$...$` 行内与 `$$...$$` 块级公式（含例题计算过程）
- **截图**：课程视频关键帧（BBDown+ffmpeg 提取）为主 + 自绘 SVG 示意图补充
- **云同步**：与 ds 站共用 Supabase 项目，`cn_` 前缀表，注册/登录/多设备同步
- **部署**：jlshdsdk.github.io/cn-net-notes/，push main 自动部署
- **性能**：首屏 gzip ≤ 200KB（模板预算），KaTeX/编辑器懒加载
- **交付前 debug 三遍**：①静态构建校验 ②本地浏览器冒烟 ③线上端到端+视觉验收

## 用户确认的决定（2026-11-05）

| 决定 | 值 |
|---|---|
| 仓库名 | `cn-net-notes`（jlshdsdk.github.io/cn-net-notes/） |
| 截图来源 | 混合：视频关键帧为主 + 自绘 SVG |
| 笔记深度 | 详尽版：定义+公式推导+例题计算+重点标注 |

## 全局约束（从模板继承，勿违背）

- Preact（禁 React/Monaco）；strict TS，`npm run typecheck` 必过
- local-first：先本地 IndexedDB 后云端；LWW 服务器时钟唯一基准（DB trigger）
- IndexedDB 库名 `cn-notes--<scope>`；表前缀 `cn_`；Storage 桶 `cn-images`
- Supabase 项目与 kaoyan-vocab5/ds-code-notes 共用（qvemohfojzawpnleyjsb.supabase.co）
- vite `base=/cn-net-notes/`；SW 策略不变（导航 network-first / 哈希资源 cache-first / 跨域不拦截）
- 产品决策：三色=黑#000000/紫#7c3aed/红#dc2626；重点=高亮黄背景+加粗；正文微软雅黑16px/2倍行距（同 ds）

## 任务清单

- [ ] T1 脚手架：模板复制+改名清理（package.json/index.html/vite base/标题/favicon）
- [ ] T2 代码A 去代码区：删 CodeEditor.tsx/compile.ts/cm.ts 及引用；DocPane 单页；state/search/types 清 CodeRow
- [ ] T3 代码B KaTeX：DocPane/NoteEditor 集成（懒加载 katex chunk；编辑态显示原始 $..$，非编辑态渲染）
- [ ] T4 代码C 三色+重点：保留三色快选，加 Highlight（黄色）重点按钮；站名/配色品牌化
- [ ] T5 云端：supabase_setup_cn.sql（cn_nodes/cn_notes/cn_tombstones+RLS+cn-images 桶，复用 profiles）；sync.ts/db.ts 改表名
- [ ] T6 素材：pagelist API 拿分P → BBDown 下载每章核心分P（480P）→ ffmpeg 关键帧 → 选图压缩≤1MB JPEG → assets；自绘 SVG（分层/封装/头部格式等）
- [ ] T7 内容：六章 ch01-ch06 详尽笔记 JSON（格式照模板 content/*.json；LaTeX、例题、红紫重点、图片引用）
- [ ] T8 seed：scripts/seed.mjs 适配（去 code 行）；typecheck+build 绿
- [ ] T9 部署：gh 建 jlshdsdk/cn-net-notes（public）、push、Actions 部署、Pages 上线（bat 直连纪律）
- [ ] T10 debug①：typecheck/build/JSON schema 校验脚本
- [ ] T11 debug②：本地 dev + 浏览器冒烟（注册/登录/同步/公式渲染/图片/三色/重点/搜索）
- [ ] T12 debug③：线上 URL 端到端 + 视觉验收（页面截图审查）
- [ ] T13 交付：HANDOVER.md + README + 线上链接报告

## 风险与注意

- Supabase 建表需用户在控制台执行 SQL（同 ds 流程）；无 service key 时准备好一键脚本请用户粘贴
- 视频截图版权：仅个人学习用途，选讲义图为主，控制数量
- KaTeX 体积：字体子集+懒加载，避免首屏超预算
- B站下载可能遇到风控：BBDown 失败则降级纯 SVG 方案
