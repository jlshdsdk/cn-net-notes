# content/ — 王道计算机网络笔记内容（2026-11 批次）

每个 JSON 文件 = 一章。由子代理按本章规范并行产出，红队审查后经 `scripts/seed.mjs` 灌入云端。

```json
{
  "chapter": "第1章 计算机网络体系结构",
  "docs": [
    {
      "tree": ["第1章 计算机网络体系结构", "1.1 概念、功能与组成", "计算机网络的概念与组成"],
      "noteHtml": "<p>…</p>",
      "images": [ { "imgId": "ch01-fig-01", "file": "images/ch01/ch01-fig-01.jpg" } ]
    }
  ]
}
```

- `tree` 三级：`[章, 节, 知识点]`；`images` 可省略（纯文字文档）。
- `imgId` 全局唯一，命名 `chNN-fig-MM`；`file` 相对 content/ 目录。

## 笔记 HTML 规范（对齐站内编辑器能力，勿自创标签）

- 篇首标题：`<p><span style="font-size:20px;color:#7c3aed"><strong>标题（王道 x.x）</strong></span></p>`
- **红色考点/易错警告**：`<span style="color:#dc2626"><strong>…</strong></span>`
- **黑色正文重点**：`<strong>…</strong>`；紫色补充/助记：`<span style="color:#7c3aed">…</span>`
- **重点标注**：`<mark><strong>…</strong></mark>`（黄色高亮，全篇最核心结论用）
- 列表 `<ul><li>`；段落 `<p>`；禁止 h1-h6、table、script、style
- **公式**：行内 `$…$`、独立成段 `$$…$$`（KaTeX 语法）。公式内中文用 `\text{中文}`；
  JSON 里反斜杠写成 `\\`（如 `\\frac{a}{b}`、`2^{10}`、`\\times`、`\\log_2 N`、`\\le`、`\\text{bit/s}`）
- **例题模板**：`<p><span style="color:#7c3aed"><strong>【例题 x.x】</strong></span>题干…</p>`
  然后 `$$…$$` 完整计算过程，最后 `<p><span style="color:#dc2626"><strong>答案：…</strong></span></p>`
- **截图**：`<img data-img-id="chNN-fig-MM" class="ds-note-img" alt="图：说明">` 独立成行（外层不包 `<p>`），
  只引用 images 清单里存在的 imgId
- HTML 转义：正文里的 `<` `>` `&` 写实体；`→` 直接用字符
- 风格：考研向、王道教材小节号标注、必考点联动、易错点清单、对照记忆表格用 ul 呈现

## 每章结构（tree 第二级固定，第三级知识点自定但覆盖必须全）

- ch01 体系结构：概念/组成/功能 → 分类 → 性能指标 → 分层结构（OSI、TCP/IP、五层）
- ch02 物理层：通信基础概念 → 奈氏准则与香农定理 → 编码与调制 → 传输介质 → 物理层设备
- ch03 数据链路层：功能与组帧 → 差错控制（奇偶校验/CRC）→ 流量控制与可靠传输（滑动窗口/GBN/SR）
  → 介质访问控制（信道划分/ALOHA/CSMA/CD/CSMA/CA）→ 局域网与以太网 → VLAN → PPP → 链路层设备
- ch04 网络层：功能与设备 → IPv4 分组与首部 → IP 地址与 NAT → 子网划分与 CIDR → ARP/DHCP/ICMP
  → IPv6 → 路由算法与协议（RIP/OSPF/BGP）→ 路由表与转发
- ch05 传输层：功能与端口 → UDP → TCP 特点与首部 → 三次握手与四次挥手 → TCP 可靠传输
  → TCP 流量控制 → TCP 拥塞控制
- ch06 应用层：模型（C/S、P2P）→ DNS → FTP → 电子邮件（SMTP/POP3/IMAP/MIME）→ WWW 与 HTTP

## 验收

```
node scripts/seed.mjs <cred.json> apply content/ch01.json   # 引用一致性校验内置
```
