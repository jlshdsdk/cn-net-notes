# PROGRESS.md — cn-net-notes 执行日志

## 2026-11-05 晚（第一批次）

### ✅ 已完成
1. **脚手架**：从 ds-code-notes 模板克隆 → cn-net-notes，清理模板文件
2. **代码改造**（全部本地验证通过）：
   - 删：CodeEditor/compile/cm/highlight/SettingsPanel/settings/note_patch/verify_note
   - DocPane 双模式（阅读 cn-ui-mode / 编辑），新增 NoteViewer（KaTeX 懒加载 + 图片 blob 解析）
   - NoteEditor：+Highlight 重点高亮 +「∑ 公式」按钮，格式刷带 highlight，删 CppSnippet
   - sync.ts/db.ts/state/types/search/App/TopBar/Sidebar/styles 全面 cn 化；品牌色 #0f766e
   - vite base=/cn-net-notes/；sw.js 缓存名 cn-notes-shell-v1；storageKey cn-notes-auth
3. **typecheck + build 双绿**（在 D: 真实路径下运行！C:\Users\王奕博 是 D 盘联接点，从 C: 路径跑 vite build 会报 fileName 错误）
   - 首屏 gzip ≈84.5KB；NoteEditor 93KB / KaTeX(auto-render) 78KB 均懒加载
4. **云端**：supabase_setup_cn.sql（cn_nodes/cn_notes/cn_tombstones + cn-images 桶 + RLS）写好待用户在 Supabase 控制台执行；seed.mjs 重写（图片上传+引用校验）
5. **GitHub**：gh 建仓成功 https://github.com/jlshdsdk/cn-net-notes
6. **内容规范**：content/README.md（六章 HTML/LaTeX/颜色/图片规范）

### ⏳ 进行中（后台子代理）
- 素材代理：B站关键帧提取（_assets/cn_keyframes_final/manifest.json）
- 代码红队：对抗性审查全部改造点

### 🚧 当前阻塞
- **git push 间歇失败**：github.com:443 时通时断（api.github.com 正常）；已把 workflow 文件暂缓提交（gh token 缺 workflow scope）
- **凭据**：全局 gitconfig 有失效的 Desktop gh.exe URL 级助手；本仓库已用 local credential.https://github.com.helper 指到 `!gh auth git-credential`
- **计划**：网络恢复后推 main（当前无 workflow）→ dist 推 gh-pages 分支 → gh api 开 Pages（source=gh-pages）
- **待用户**（可选升级）：`gh auth refresh -h github.com -s workflow` 后恢复 .github/workflows/deploy.yml → 切 Actions 自动部署
- **待用户**：Supabase SQL Editor 执行 supabase_setup_cn.sql

### 📋 接下来
1. 六章内容子代理并行（imgId 清单已定，见各代理提示；图=关键帧或SVG兜底）
2. 素材 manifest 到手 → 图片对号入座到 content/images/chNN/chNN-fig-MM.jpg（缺的画 SVG）
3. 红队报告 → 修复
4. seed 需要用户账号 cred.json（与 ds 站同一账号体系）→ 灌内容
5. debug①静态 ②本地浏览器冒烟 ③线上端到端
6. HANDOVER.md + README 重写 + 交付报告
