# HANDOVER.md — cn-net-notes 交接文档

> 本文档面向接手本项目的 AI 代理（harness）或人类开发者，目标是**只读这一份就能继续开发/排障/部署/补内容**。
> 配套：`PLAN.md`（计划）、`PROGRESS.md`（执行日志）。接手顺序：本文 → PROGRESS → content/README.md。

---

## 1. 项目是什么

「计算机网络笔记（王道考研）」网站：**网课 94 个分P一P一笔记**，每篇 = 老师课堂讲解叙述（B站AI字幕转写）+ 该P全部PPT截图（逐页提取）+ LaTeX 公式 + 三色重点标注。无代码区（计网无代码）。

| 项 | 值 |
|---|---|
| 线上地址 | https://jlshdsdk.github.io/cn-net-notes/ |
| GitHub 仓库 | https://github.com/jlshdsdk/cn-net-notes |
| 模板母本 | ds-code-notes（https://jlshdsdk.github.io/ds-code-notes/，架构同源） |
| 所有者 | GitHub 账号 jlshdsdk（站点账号 3667656609@qq.com = 管理员，与词汇站/ds站共用 Supabase 账号体系） |

## 2. 技术栈与关键版本

- **构建**：Vite 6 + TypeScript 5.8 strict（`npm run typecheck`；**必须在 D:\Users\王奕博\... 真实路径下跑**，C: 是联接点会报 vite fileName 错）
- **UI**：Preact 10 + @preact/signals + preact/compat lazy/Suspense
- **富文本**：TipTap 2（StarterKit 无 heading；扩展：DsTextStyle字号字体/Color/Highlight重点/图片blob节点）
- **公式**：KaTeX（NoteViewer 懒加载 chunk，`$...$`/`$$...$$`，auto-render 仅在正文含 `$` 时动态 import）
- **本地存储**：IndexedDB（idb 8，库名 `cn-notes--<scope>`）
- **云端**：Supabase JS v2（Auth + Postgres + Storage）
- **部署**：GitHub Pages，源=gh-pages 分支（`scripts/api_pages.mjs` 发布；workflow 文件待 `gh auth refresh -s workflow` 后恢复 Actions 自动部署）

## 3. 与词汇站/ds站共享的 Supabase 项目

- Project：`https://qvemohfojzawpnleyjsb.supabase.co`（三站共用账号体系）
- 本站专属表（`cn_` 前缀）：`cn_nodes / cn_notes / cn_tombstones` + Storage 桶 `cn-images`，由根目录 `supabase_setup_cn.sql` 建立（**已于 2026-11-05 在控制台执行并验证**）
- 管理员：`app_config.admin_email` 登记邮箱（3667656609@qq.com）

## 4. 云端数据模型

```
cn_nodes(id PK, user_id, parent_id→cn_nodes?, name, kind∈{dir,doc}, sort_order float, updated_at)
cn_notes(doc_id PK→cn_nodes 级联删, user_id, html, updated_at)
cn_tombstones(id PK, user_id, deleted_at)
storage bucket: cn-images（私有），路径 <user_id>/<doc_id>/<img_id>
```

- RLS 全表 `user_id = auth.uid()`；cn_notes 校验 doc_id 归属；图片桶按路径首段=uid 隔离
- **统一服务器时钟**：trigger 改写 updated_at，LWW 唯一时钟源（勿回退）

## 5. 前端架构（src/）

```
main.tsx    入口 + SW 注册（仅 PROD）
App.tsx     启动序：本地先渲染秒开 → 后台 initAuth()
state.ts    signals；localStorage 键 cn-ui-doc / cn-ui-expanded / cn-ui-mode
lib/db.ts   IndexedDB（nodes/notes/images/meta 四库）+ markDirty
lib/sync.ts 同步引擎（与 ds 站同款语义：脏集合1.5s防抖推送/增量拉取/墓碑/LWW/双向对账/游客合并）
lib/search.ts 全文搜索（标题+笔记）
components/DocPane    阅读/编辑双模式切换（noteMode signal）
components/NoteViewer 阅读态：KaTeX 渲染 + img[data-img-id] blob 解析（懒加载）
components/NoteEditor 编辑态：三色快选(#000/#7c3aed/#dc2626) + 🖍重点(Highlight=mark黄底) + ∑公式按钮 + 格式刷
components/Sidebar    三级目录树（拖拽/改名/增删，规则同 ds）
components/TopBar     搜索/☁️同步角标(点击=forceFullPull)/管理员👥/登录
styles.css  品牌色 --accent:#0f766e；mark=#ffe58f；正文微软雅黑16px/2倍行距
```

## 6. 内容管线（本项目灵魂，三源合一）

```
B站 BV19E411D78Q（94P）
 ├─ pagelist：content/pagelist.json（官方分P标题+cid，权威）
 ├─ 截图：_assets/cn_keyframes_final/<chNN>/fig-pNN-MM.jpg
 │        + manifest_frag_chNN.json（每图 time+desc）
 │        产法：BBDown 480P视频 → ffmpeg 每25s抽帧（手写动画课件 scene 检测无效）
 │              → dHash 聚簇取簇尾(完成态) → 视觉审筛(Read→CDN→analyze_image，
 │              限流时降级本地 PaddleOCR——注意其输出是 GBK) → 压缩1600/q85
 └─ 字幕：_assets/cn_subs/pNN.json（老师课堂逐句转写，wbi 签名 + B站登录页内会话拉取；
          P46/P50/P52/P91 无AI字幕，笔记篇末有注明）

写作规范：content/README.md（一P一笔记 / 每P全图全嵌 / 叙述=字幕 / 颜色 / 例题模板 / JSON转义）
校验：    node scripts/check_content.mjs（结构/引用/配对/裸字符/图片外置兜底）
灌云：    node scripts/seed.mjs - apply content/chNN.json [--force]
          （认证优先 _assets/cn_access.json 的 access_token——从登录页面收割，1小时过期；
           图片在 _assets 外置目录，seed 自动定位；幂等 find-or-create）
```

**P号→章目录映射**：P1-12→ch01, 13-18→ch02, 19-44→ch03, 45-73→ch04, 74-86→ch05, 87-94→ch06

## 7. 用户确认的产品决策（勿擅自更改）

- **一P一笔记**（94篇）；P名=课程原名去"（咸鱼版）"；标题带P号+王道小节号
- **截图必须全部出自王道网课视频**（每张新PPT一图），禁自绘替代
- **笔记叙述对应老师课堂字幕**；口诀/比喻/例子以紫色"老师原话"体保留
- 黑/紫/红三色快选 + mark黄底重点 + 黑色加粗；例题=紫题干→$$过程$$→红答案
- 无代码区；阅读/编辑双模式；公式 KaTeX
- 开放注册；管理员面板复用 profiles

## 8. 开发/部署流程

```bash
# 注意：全部命令在 D:\Users\王奕博\.zcode\workspace\...\cn-net-notes 下执行
npm install && npm run dev        # http://localhost:5173/cn-net-notes/
npm run typecheck && npm run build
node scripts/check_content.mjs    # 内容校验
node ../_assets/api_push.mjs → 实为 scripts/api_push.mjs   # 推 main（github.com:443 堵时走 api.github.com）
node scripts/api_pages.mjs        # 构建产物发布 gh-pages（Pages 源=gh-pages 分支）
```

- **git push 直连间歇失败**（github.com:443）：用 `node scripts/api_push.mjs`（api.github.com 内容快照推送）
- **gh token 缺 workflow scope**：`.github/workflows/deploy.yml` 在 .gitignore 黑名单里；主人执行 `gh auth refresh -h github.com -s workflow` 后可移出黑名单恢复 Actions 自动部署
- 本仓库 git 凭据：repo-local `credential.https://github.com.helper = !gh auth git-credential`（全局有一个失效的旧助手条目）

## 9. 已知残留事项

1. 4 节无AI字幕（P46/P50/P52/P91），笔记按课件+教材写并篇末注明
2. IAB（内置浏览器）无 OS 焦点时截图通道不可用、真实点击可能被吞——测试用页面内 evaluate 派发
3. manifest desc 偶有误标（年份/内容），红队已抽查修正 6 处；后续新增内容建议保持"截图位置抽查"
4. 图片不入 git 仓库（外置 _assets），换机器需带走 _assets 或从 Supabase Storage 反向同步
5. 墓碑无 GC、搜索线性扫——个人数据量级够用（同 ds 站取舍）

## 10. 排障速查

| 症状 | 首查 |
|---|---|
| 别的设备登录后树为空 | 点右上角 ☁️（forceFullPull）；仍空查 *.supabase.co 可达性 |
| seed 报 access_token 过期 | 打开已登录的本地站页面，重割：读 localStorage cn-notes-auth → _assets/cn_access.json |
| seed 报图片不存在 | 核对 _assets/cn_keyframes_final/<chNN>/fig-pNN-MM.jpg 是否在；file 字段 images/ 前缀会自动映射 |
| vite build 报 fileName 绝对路径 | 你在 C: 联接点路径下跑的，切 D: 真实路径 |
| api_push 报 tree 404 | 检查是否把 .github/workflows 下文件提交进去了（token 无 workflow scope 会被拒） |
| 线上没更新 | gh-pages 是手动发布的：build 后跑 api_pages.mjs；SW 导航 network-first 刷新即可 |
