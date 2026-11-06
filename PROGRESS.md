# PROGRESS.md — cn-net-notes 执行日志（2026-11-05 夜·熄灯前存档）

> **给明天开工的小黎**：主人说"开工"就按本文件继续。所有硬标准已锁定在 content/README.md
> 与记忆库，本文件记录"干到哪了 + 下一步怎么干"。工作目录：
> `C:\Users\王奕博\.zcode\workspace\draft-799e416d-7c42-4d23-bd61-af2e53dda66c\`（cn-net-notes 为仓库，_assets 为素材区）

## ✅ 已完成（勿重做）

1. **网站本体**：模板改造完成（双模式笔记页/KaTeX/三色/重点高亮/cn_云同步），typecheck+build 双绿
   - ⚠️ 构建必须在 **D:\Users\王奕博\...（真实路径）** 下跑（C: 是联接点，vite 会报 fileName 错）
2. **线上已通**：https://jlshdsdk.github.io/cn-net-notes/（gh-pages 分支发布）
   - github.com:443 间歇堵 → 用 `scripts/api_push.mjs`（推 main）与 `scripts/api_pages.mjs`（发 dist）走 api.github.com 直连
   - workflow 文件未入库（gh token 缺 workflow scope）；待主人 `gh auth refresh -h github.com -s workflow` 后恢复 deploy.yml 并可切回 Actions 部署（可选升级）
3. **红队代码审查 GO**，建议全部修复（seed 正则/死代码/cn-类名/模式守卫）
4. **Debug② 本地冒烟全过**（树/编辑/公式渲染/三色/高亮/持久化/搜索/登录弹窗；IAB 无焦点截图不可用→程序化断言）
5. **Supabase 云端就绪**：supabase_setup_cn.sql 已在控制台执行并验证（cn_nodes/cn_notes/cn_tombstones + 3策略 + cn-images 桶）
6. **主人账号已登录站点**：3667656609@qq.com（管理员）；登录会话存 `_assets/cn_session.json`（refresh_token，seed 已支持会话模式，不碰密码）
7. **老师字幕 90/94P**：`_assets/cn_subs/pNN.json`（wbi签名+B站页内会话拉取；B站登录在内置浏览器，账号"蔡健雅゛"）
   - 无AI字幕4节：P46/P50/P52/P91 → 按PPT+教材写并篇末注明（content/README.md 有模板）
8. **ch06 关键帧完成**：76张逐页截图 `_assets/cn_keyframes_final/ch06/fig-pNN-MM.jpg` + `manifest_frag_ch06.json`（含每页desc）
9. **内容规范定稿**：content/README.md = 一P一笔记(94篇) + 每P全部PPT截图 + 老师字幕叙事主线（三源合一）

## 📅 2026-11-06 晨·进度快照

- **内容定稿 ✅**：ch01（12篇/105图/5例题）、ch02（6篇/66图/10真题例题）、ch06（8篇/76图/字幕对齐修订版）——均 check_content PASS
- **在跑**：ch03 内容代理（26篇三源合一）；ch04 截图补缺（23P）；ch05 截图（13P）
- **待接棒**：ch04/ch05 截图到货 → 各派内容代理（三源合一，参照 ch02 的提示词模板）
- **内容代理经验（红队审查要用）**：manifest desc 有少量误标（年份/内容），代理已逐张视觉核实纠正——红队必须抽查"截图实际内容 vs 笔记上下文位置"
- ch02 代理踩坑记录：模板字符串会吃 LaTeX 反斜杠（\times 变 TAB），已用 String.raw 修复；后续代理若遇公式异常先查这个

## 📋 明天开工清单（顺序执行）

1. `node scripts/check_content.mjs` 盘点内容现状；dir 盘点 `_assets/cn_keyframes_final/manifest_frag_*.json` 与 `cn_subs/`
2. 缺的章：重派关键帧代理（每章一个，后台并行）
3. 每章截图齐 → 派内容代理（三源合一：pagelist.json + manifest_frag + cn_subs；ch06 若未完成则带字幕重派或修订）
4. 全部 chNN.json → check_content 全绿（fail=0）
5. 内容红队（对抗审查：94篇数量、每篇截图引用数==该P清单数、公式正确性、知识点408准确、截图/字幕/笔记三方对应）
6. 红队意见核实修复 → `node scripts/seed.mjs - apply content/ch01.json ... ch06.json`（会话模式自动用 _assets/cn_session.json）
7. D盘路径 `npm run build` → `node scripts/api_pages.mjs` 重新发布
8. Debug①静态终跑（typecheck/build/check_content）；Debug③线上端到端（打开线上站，登录拉云端94篇，公式/截图/三色视觉审查——IAB 截图通道若无焦点，用程序化断言+抽帧给 analyze_image 看）
9. HANDOVER.md + README.md 重写 + 最终交付报告（附：可选 workflow 授权升级说明）

## 🧷 零散事实（防忘）

- B站视频：BV19E411D78Q，94P，分P清单（含cid）`_assets/cn_pages.json`
- 站点凭据/路径：Supabase 项目 qvemohfojzawpnleyjsb（与词汇站/ds站共用）；anon key 在 src/lib/supabase.ts
- git：仓库本地 main（squash 单提交 ef31c8e 一系），远端走 api_push 同步；backup-main 存旧历史
- dev 服务器（若还活着）：http://localhost:5173/cn-net-notes/
- 主人硬标准三条（记忆库也有）：①一P一笔记 ②截图全出自课程视频每张新PPT ③笔记叙述对应老师课堂字幕；多派子代理并行、多对抗审查、别等主人一句句纠正
