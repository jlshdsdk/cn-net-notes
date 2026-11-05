// check_content.mjs — 内容 JSON 静态校验（Debug ① 用）
// 用法: node scripts/check_content.mjs [content/ch01.json ...]  （默认检查 content/ch*.json）
// 检查: JSON 可解析 / tree 三级 / img 引用⊆清单 / 禁用标签 / $ 配对 / 章内重复路径 / 图片文件存在
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

// 图片外置目录兜底（与 seed.mjs 同规则：images/ 前缀找不到时查 _assets/cn_keyframes_final）
const IMG_ROOT = resolve('..', '_assets', 'cn_keyframes_final');
function imgExists(contentFile, rel) {
  if (!rel) return false;
  const base = dirname(resolve(contentFile));
  if (existsSync(resolve(base, rel))) return true;
  if (rel.startsWith('images/')) return existsSync(resolve(IMG_ROOT, rel.slice('images/'.length)));
  return false;
}

const args = process.argv.slice(2);
const dir = 'content';
const files = args.length
  ? args
  : readdirSync(dir).filter(f => /^ch\d+\.json$/.test(f)).sort().map(f => join(dir, f));

let fail = 0, warn = 0;
const bad = (msg) => { console.log('  FAIL ' + msg); fail++; };
const caution = (msg) => { console.log('  WARN ' + msg); warn++; };

for (const file of files) {
  console.log(`\n== ${file} ==`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    bad('JSON 解析失败: ' + e.message);
    continue;
  }
  if (!Array.isArray(data.docs) || data.docs.length === 0) bad('docs 为空');
  const seenPath = new Map();
  let htmlChars = 0, figRefs = 0;
  for (const [i, doc] of (data.docs ?? []).entries()) {
    const label = `doc[${i}] ${doc.tree ? doc.tree.join('/') : '(无tree)'}`;
    if (!Array.isArray(doc.tree) || doc.tree.length !== 3 || doc.tree.some(s => !s || !s.trim())) {
      bad(label + ' tree 不是三级非空');
      continue;
    }
    const key = doc.tree.join('/');
    if (seenPath.has(key)) bad(`重复文档路径: ${key}`);
    seenPath.set(key, true);

    const html = doc.noteHtml ?? '';
    if (!html) { bad(label + ' noteHtml 为空'); continue; }
    htmlChars += html.length;

    // 图片引用一致性（与 seed.mjs 同款宽容正则）
    const refHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    const refs = [...refHtml.matchAll(/data-img-id\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
    figRefs += refs.length;
    const ids = new Set((doc.images ?? []).map(im => im.imgId));
    for (const r of refs) if (!ids.has(r)) bad(`${label}: 引用了清单外的 imgId ${r}`);
    for (const im of doc.images ?? []) {
      if (!im.file || !imgExists(file, im.file)) caution(`${label}: 图片文件暂缺 ${im.file ?? '(无file)'}（关键帧管线产出前为预期状态）`);
      if (refs.includes(im.imgId) === false) caution(`${label}: images 声明了 ${im.imgId} 但正文未引用`);
    }
    // imgId 全局唯一性（跨 doc）在 seed 侧由存储路径保证，此处只查同章重复声明
    const dupImgs = (doc.images ?? []).map(i => i.imgId).filter((v, k, a) => a.indexOf(v) !== k);
    if (dupImgs.length) bad(`${label}: imgId 重复声明 ${dupImgs}`);

    // 禁用标签
    if (/<(h[1-6]|table|script|style)[\s>]/i.test(html)) bad(label + ' 含禁用标签(h1-6/table/script/style)');
    // 裸 < 检查（<后不是合法标签开头则可能是未转义文本）
    if (/<[^a-zA-Z/!]/.test(refHtml)) bad(label + ' 疑似裸 < 未转义');
    // $ 配对（忽略 \$）
    const dollars = (refHtml.match(/(?<!\\)\$\$/g) ?? []).length; // $$ 必须成对出现偶数次
    if (dollars % 2 !== 0) bad(label + ' $$ 数量为奇数（块级公式未闭合）');
    const singles = (refHtml.replace(/(?<!\\)\$\$/g, '').match(/(?<!\\)\$/g) ?? []).length;
    if (singles % 2 !== 0) bad(label + ' 行内 $ 数量为奇数（公式未闭合）');
  }
  console.log(`  docs=${data.docs?.length ?? 0}  html总字符=${htmlChars}  图片引用=${figRefs}`);
}
console.log(`\n结果: ${fail === 0 ? 'PASS' : 'FAIL'}（fail=${fail}, warn=${warn}；warn 中"图片文件暂缺"在素材未灌前属预期）`);
process.exit(fail === 0 ? 0 : 1);
