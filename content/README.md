# content/ — 王道计网网课逐节笔记（2026-11 重构版：一P一笔记）

**核心原则（主人钦定）：网课每一节（每个分P，共94P）对应一篇笔记；每篇配图必须出自该P课程视频截图。**

- `pagelist.json`：94P 权威清单（B站官方接口拉取，勿改动）
- 每章一个 `chNN.json`，由子代理并行产出，红队审查后经 `scripts/seed.mjs` 灌入云端

```json
{
  "chapter": "第1章 计算机网络体系结构",
  "docs": [
    {
      "tree": ["第1章 计算机网络体系结构", "1.2 分层结构", "1.2.2 计算机网络分层结构（下）"],
      "noteHtml": "<p>…</p>",
      "images": [ { "imgId": "fig-p10-1", "file": "images/ch01/fig-p10-1.jpg" } ]
    }
  ]
}
```

- `tree` 三级：`[章名, 课程节名, P名]`；**P名 = pagelist 里的 part 去掉"（咸鱼版）"后缀**
- **每篇嵌入本P的全部截图（每张新PPT一图）**：`<img data-img-id="fig-p{NN}-{MM}" class="ds-note-img" alt="图：说明">`
  独立成行、按课程讲解顺序出现（NN=P号两位数；MM=两位序号 01 起）。图注依据该章 manifest_frag 的 desc 放到笔记对应知识点处。
  文件路径 `images/chNN/fig-pNN-MM.jpg`（实体在 _assets/cn_keyframes_final，seed 支持外置目录）；
  P1-12→ch01、13-18→ch02、19-44→ch03、45-73→ch04、74-86→ch05、87-94→ch06
- imgId 由 P号+序号 保证全局唯一；**正文引用数必须 == 该 doc images 声明数 == 该P截图总数**

## 课堂话语对应（主人钦定 2026-11-05）

- **每P笔记的叙述内容必须对应老师课堂讲解**：老师字幕转写在 `_assets/cn_subs/pNN.json`
  （`lines[]` 带 from/to 时间戳 + text 原话，来源B站AI字幕）。写作时以该P字幕为主线：
  老师讲了什么顺序、怎么口述解释、强调了什么、举了什么例子、讲了什么易错提醒，笔记就按这个脉络写。
- 截图时间戳（manifest 的 time）与字幕 from/to 可对齐：图片放的位置 = 老师讲到该页时的讲解处。
- 口语转写中的错别字/同音字按上下文纠正；语气词去除；保留老师的比喻、口诀、强调句（可用紫色补充体呈现"老师原话"）。
- 无字幕的P（P46、P50、P52、P91）：按PPT截图+王道教材知识点写，并在篇末注 `<p><span style="color:#6a737d">（本节B站未生成AI字幕，笔记依据课件与教材整理）</span></p>`。

## 笔记 HTML 规范

- 篇首标题：`<p><span style="font-size:20px;color:#7c3aed"><strong>P26 3.4_3 后退N帧协议（GBN）（王道 3.4）</strong></span></p>`
  （P号 + 课程原名 + 教材小节号双标注）
- **红色考点/易错**：`<span style="color:#dc2626"><strong>…</strong></span>`；紫色补充：`<span style="color:#7c3aed">…</span>`
- 黑色正文重点：`<strong>`；**全篇最核心结论**：`<mark><strong>…</strong></mark>`
- 列表 `<ul><li>`、段落 `<p>`；禁 h1-h6/table/script/style；正文 `<` `>` `&` 用实体
- 公式：行内 `$…$`、独立 `$$…$$`（KaTeX）；JSON 里反斜杠写 `\\`；公式内中文包 `\text{}`
- 例题模板：紫【例题】→ `$$` 完整计算 → 红色答案行；计算型P（性能指标/CRC/利用率/分片/子网/RIP/cwnd/DNS时延）必须有完整例题
- 中文语境引号一律全角""，避免 JSON 断裂
- 篇幅：每P 300~1200 字符 HTML；开篇/概念P可短，大题P写透；**不跨P合并内容**

## 验收

```
node scripts/check_content.mjs   # 全部 chNN.json：结构/引用/配对/裸字符校验
```
