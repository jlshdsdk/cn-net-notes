# 计算机网络笔记（cn-net-notes）

王道考研计算机网络（BV19E411D78Q，94节网课）自学笔记网站：**一节网课 = 一篇笔记**，每篇内嵌该节课全部 PPT 截图与老师课堂讲解要点，LaTeX 公式排版 + 三色重点标注 + 云同步多设备。

**线上地址**：https://jlshdsdk.github.io/cn-net-notes/

> 🔧 **接手开发/排障/补内容**：完整架构、内容管线、部署流程与已知坑见 [HANDOVER.md](./HANDOVER.md)。

## 功能

- **逐节笔记（94篇）**：目录三级 = 章 → 节 → 网课分P；每篇标题带 P 号与王道小节号
- **课程原版截图**：每节课的每一张新 PPT/板书页一图（全站 730+ 张，全部截自王道网课视频，按讲课顺序嵌入）
- **课堂讲解对应**：笔记叙述以老师字幕转写为主线，口诀、比喻、例子、易错提醒以紫色"老师原话"体保留
- **LaTeX 公式**：行内 `$...$` / 块级 `$$...$$`（KaTeX 阅读态渲染，按需加载）
- **三色 + 重点**：黑/紫(#7c3aed)/红(#dc2626) 字体快选；🖍 黄底重点高亮；黑色加粗；红色考点/易错
- **例题**：CRC 模2除法、滑动窗口、子网划分、RIP 更新、拥塞控制 cwnd 逐轮、时延计算等，附大量 408 真题（年份经字幕与课件交叉核实）
- **账号云同步**：邮箱注册登录（与词汇站/数据结构站同一账号体系），数据 RLS 硬隔离；local-first 本地秒开、后台静默同步
- **性能**：首屏 gzip ≈85KB，KaTeX/编辑器按需懒加载

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173/cn-net-notes/
npm run typecheck && npm run build
node scripts/check_content.mjs    # 内容 JSON 校验
```

## 云同步（Supabase）

与 [kaoyan-vocab5](https://github.com/jlshdsdk/kaoyan-vocab5) / ds-code-notes 共用 Supabase 项目（账号互通）。

1. 首次开通：Supabase SQL Editor 执行 `supabase_setup_cn.sql`（cn_ 表 + RLS + cn-images 桶，已执行）
2. 注册登录即可同步；`app_config.admin_email` 邮箱自动成为管理员
3. 批量灌内容：`node scripts/seed.mjs - apply content/chNN.json`（认证读 `_assets/cn_access.json`）

## 内容管线（三源合一）

```
B站94P ─ pagelist.json（分P表）
       ├ manifest_frag_chNN.json + fig-pNN-MM.jpg（逐页PPT截图）
       └ cn_subs/pNN.json（老师课堂字幕）
              ↓ 内容代理按 content/README.md 规范写作
       content/chNN.json ─ check_content 校验 ─ seed 灌云
```

## 部署

- `scripts/api_push.mjs`：推 main（github.com:443 间歇不通时走 api.github.com 直连）
- `scripts/api_pages.mjs`：构建产物发布 gh-pages 分支（Pages 源 = gh-pages）
- 恢复 Actions 自动部署（可选）：`gh auth refresh -h github.com -s workflow` 后把 `.github/workflows/deploy.yml` 移出 .gitignore 并提交

## 架构备忘

- **技术栈**：Vite + TypeScript + Preact/signals；TipTap 2（+Highlight）；KaTeX；idb；@supabase/supabase-js
- **本地**：IndexedDB `cn-notes--<scope>`；UI 状态 localStorage（cn-ui-*）
- **同步**：脏集合 1.5s 防抖推送、增量拉取、墓碑删除、服务器时钟 LWW、双向对账、游客库合并（同 ds-code-notes 语义）
- **无代码区**：计网无代码，DocPane 为 阅读（KaTeX）/ 编辑（富文本）双模式
