// seed.mjs — cn-net-notes 云端内容种子工具（登录 → inspect/apply，支持截图上传）
// 用法:
//   node scripts/seed.mjs <cred.json> inspect [样例输出路径]
//   node scripts/seed.mjs <cred.json> apply content/ch01.json [ch02.json ...] [--force]
// cred.json: { "email": "...", "password": "..." }（仓库外保存，勿提交）
// apply 语义: 按目录名幂等 find-or-create；已存在的笔记默认【跳过不覆盖】（--force 才覆盖）；
//            截图随笔记一起上传到 cn-images 桶（upsert 幂等），文件路径相对 content/ 目录。
// content JSON 格式:
//   { "chapter": "第1章 …", "docs": [ { "tree": ["L1","L2","L3"], "noteHtml": "<p>…</p>",
//       "images": [ { "imgId": "ch01-fig-01", "file": "images/ch01/ch01-fig-01.jpg" } ] } ] }
// 校验: noteHtml 里每个 data-img-id 必须出现在 images 清单里，且文件存在，否则拒绝写入。
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';

/** 图片文件定位：images/xx 前缀优先找 content 下，找不到找外置关键帧目录（ds 站同款模式：图不入库） */
const IMG_ROOT = resolve('..', '_assets', 'cn_keyframes_final');
function findImage(baseDir, file) {
  const inContent = resolve(baseDir, file);
  if (existsSync(inContent)) return inContent;
  if (file.startsWith('images/')) {
    const ext = resolve(IMG_ROOT, file.slice('images/'.length));
    if (existsSync(ext)) return ext;
  }
  return null;
}

const SUPABASE_URL = 'https://qvemohfojzawpnleyjsb.supabase.co';
const ANON_KEY = 'sb_publishable_VFalDAdNoIgd19oxlZ8wlw_AM-rv7Uq'; // 公开 publishable key（与 ds 站共用项目）

const credPath = process.argv[2]; // 有会话文件（../_assets/cn_session.json）时此参数可为 "-" 占位
const cmd = process.argv[3];
const rest = process.argv.slice(4);
if (!cmd) {
  console.error('用法: node scripts/seed.mjs [-|cred.json] inspect|apply content/chNN.json [--force]\n认证优先读 ../_assets/cn_session.json（已登录会话），否则用 cred.json 邮箱密码');
  process.exit(2);
}
const force = rest.includes('--force');
const positional = rest.filter(a => a !== '--force');

// 认证优先级：①短期 access_token（_assets/cn_access.json，从登录页面收割，1小时有效无轮换竞态）
// ②refresh_token 会话（_assets/cn_session.json）③cred.json 邮箱密码
const ACCESS_PATH = resolve('..', '_assets', 'cn_access.json');
const SESSION_PATH = resolve('..', '_assets', 'cn_session.json');
let uid, authHeaders = {};

function jwtSub(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64')).sub; } catch { return undefined; }
}

let sb;
if (existsSync(ACCESS_PATH)) {
  const a = JSON.parse(readFileSync(ACCESS_PATH, 'utf8'));
  if (a.expires_at && a.expires_at * 1000 < Date.now() + 60000) {
    console.error('access_token 已过期，请从登录页面重新收割（_assets/cn_access.json）');
    process.exit(1);
  }
  uid = a.uid ?? jwtSub(a.access_token);
  authHeaders = { Authorization: `Bearer ${a.access_token}` };
  sb = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: authHeaders },
  });
  console.log(`已用 access_token 认证 uid=${uid}（${a.email ?? ''}，过期 ${new Date((a.expires_at ?? 0) * 1000).toLocaleTimeString()}）`);
} else {
  sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  if (existsSync(SESSION_PATH)) {
    const saved = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
    const { data, error } = await sb.auth.setSession({ refresh_token: saved.refresh_token });
    if (error || !data.session) { console.error('会话恢复失败: ' + (error?.message ?? '无会话')); process.exit(1); }
    uid = data.session.user.id;
    console.log(`已用保存的会话登录 ${saved.email ?? data.session.user.email}`);
  } else {
    if (!credPath) { console.error('缺少凭据：请提供 _assets/cn_access.json / cn_session.json 或 cred.json'); process.exit(2); }
    const cred = JSON.parse(readFileSync(credPath, 'utf8'));
    const { data, error } = await sb.auth.signInWithPassword({ email: cred.email, password: cred.password });
    if (error) { console.error('登录失败: ' + error.message); process.exit(1); }
    uid = data.session.user.id;
  }
}

const { data: nodes, error: e1 } = await sb.from('cn_nodes').select('*').eq('user_id', uid);
if (e1) { console.error('读 cn_nodes 失败: ' + e1.message + '（是否已执行 supabase_setup_cn.sql？）'); process.exit(1); }
const { data: notes, error: e2 } = await sb.from('cn_notes').select('doc_id,html').eq('user_id', uid);
if (e2) { console.error('读 cn_notes 失败: ' + e2.message); process.exit(1); }
console.log(`云端: ${nodes.length} 节点, ${notes.length} 笔记`);

const byId = new Map(nodes.map(n => [n.id, n]));
const childrenOf = new Map();
for (const n of nodes) {
  const k = n.parent_id ?? 'ROOT';
  if (!childrenOf.has(k)) childrenOf.set(k, []);
  childrenOf.get(k).push(n);
}
for (const list of childrenOf.values()) list.sort((a, b) => a.sort_order - b.sort_order);

function pathOf(id) {
  const parts = [];
  let cur = byId.get(id);
  while (cur) { parts.unshift(cur.name); cur = cur.parent_id ? byId.get(cur.parent_id) : null; }
  return parts.join(' / ');
}

if (cmd === 'inspect') {
  for (const n of nodes) {
    const meta = n.kind === 'doc'
      ? `note=${(notes.find(x => x.doc_id === n.id)?.html ?? '').length}ch`
      : `${(childrenOf.get(n.id) ?? []).length} 子节点`;
    console.log(`${'  '.repeat(pathOf(n.id).split(' / ').length - 1)}[${n.kind}] ${n.name}  (${meta})  id=${n.id}`);
  }
  if (rest[0]) {
    const doc = nodes.find(n => n.kind === 'doc');
    if (doc) {
      const html = notes.find(x => x.doc_id === doc.id)?.html ?? '';
      writeFileSync(rest[0], `<!-- 路径: ${pathOf(doc.id)} -->\n\n<!-- === 笔记 HTML === -->\n${html}\n`, 'utf8');
      console.log(`\n格式样例(${pathOf(doc.id)})已写入 ${rest[0]}`);
    }
  }
  process.exit(0);
}

if (cmd === 'apply') {
  const notesByDoc = new Map(notes.map(x => [x.doc_id, x.html]));
  let createdDirs = 0, createdDocs = 0, updatedContent = 0, uploadedImgs = 0, skipped = 0;

  function ensureChild(parentId, name, kind) {
    const key = parentId ?? 'ROOT';
    const list = childrenOf.get(key) ?? [];
    const hit = list.find(n => n.name === name && n.kind === kind);
    if (hit) return { node: hit, created: false };
    const maxOrder = list.length ? Math.max(...list.map(n => n.sort_order)) : 0;
    const row = {
      id: randomUUID(), user_id: uid, parent_id: parentId,
      name, kind, sort_order: maxOrder + 1024,
    };
    return { row, created: true };
  }

  function remember(row) {
    byId.set(row.id, row);
    const key = row.parent_id ?? 'ROOT';
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(row);
  }

  for (const file of positional) {
    const baseDir = dirname(resolve(file));
    const data = JSON.parse(readFileSync(file, 'utf8'));
    for (const doc of data.docs) {
      const [l1, l2, ...l3rest] = doc.tree;
      const l3Name = l3rest.join(' / ');
      let parentId = null;
      for (const [name, kind] of [[l1, 'dir'], [l2, 'dir'], [l3Name, 'doc']]) {
        const r = ensureChild(parentId, name, kind);
        if (r.created) {
          const { error } = await sb.from('cn_nodes').insert(r.row);
          if (error) { console.error(`建节点 ${name} 失败: ${error.message}`); process.exit(1); }
          remember(r.row);
          if (kind === 'dir') createdDirs++; else createdDocs++;
          parentId = r.row.id;
        } else {
          parentId = r.node.id;
        }
      }
      const docId = parentId;
      const label = doc.tree.join(' / ');
      const oldHtml = notesByDoc.get(docId) ?? '';
      const needNote = !!doc.noteHtml && (force || !oldHtml);
      if (!needNote) skipped++;

      // 引用一致性校验：HTML 里的 imgId 必须有对应文件（防悬空图）
      // 正则容忍单双引号/大小写/等号空格变体（浏览器端同样能解析这些变体），先剔除注释防误报
      const refHtml = (doc.noteHtml ?? '').replace(/<!--[\s\S]*?-->/g, '');
      const imgRefs = [...refHtml.matchAll(/data-img-id\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
      const imgList = doc.images ?? [];
      const imgIds = new Set(imgList.map(im => im.imgId));
      for (const id of imgRefs) {
        if (!imgIds.has(id)) {
          console.error(`「${label}」noteHtml 引用了未提供的 imgId: ${id}（images 清单里没有）`);
          process.exit(1);
        }
      }
      for (const im of imgList) {
        if (!im.file || !findImage(baseDir, im.file)) {
          console.error(`「${label}」图片文件不存在: ${im.file}`);
          process.exit(1);
        }
      }

      if (needNote) {
        const { error } = await sb.from('cn_notes').upsert({ doc_id: docId, user_id: uid, html: doc.noteHtml });
        if (error) { console.error(`写笔记 ${label} 失败: ${error.message}`); process.exit(1); }
        updatedContent++;
      }
      // 截图上传（只在写笔记时进行，幂等 upsert）
      if (needNote && imgList.length) {
        for (const im of imgList) {
          const real = findImage(baseDir, im.file);
          const buf = readFileSync(real);
          const ext = basename(im.file).toLowerCase();
          const contentType = ext.endsWith('.png') ? 'image/png' : ext.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
          const { error: se } = await sb.storage.from('cn-images')
            .upload(`${uid}/${docId}/${im.imgId}`, buf, { upsert: true, contentType });
          if (se) { console.error(`传图 ${im.imgId} 失败: ${se.message}`); process.exit(1); }
          uploadedImgs++;
        }
      }
      console.log(`${needNote ? '写入' : '跳过'}「${label}」 note:${needNote ? '写' : '跳'} imgs:${needNote ? imgList.length : 0}`);
    }
  }
  console.log(`\n完成: 新建目录 ${createdDirs}, 新建文档 ${createdDocs}, 写入笔记 ${updatedContent}, 上传截图 ${uploadedImgs}, 跳过 ${skipped}`);
  process.exit(0);
}

console.error('未知命令: ' + cmd);
process.exit(2);
