// cleanup_smoke.mjs — 删除云端冒烟测试数据（第1章 冒烟测试 目录树），走墓碑保证多设备同步删除
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'D:/Users/王奕博/.zcode/workspace/draft-799e416d-7c42-4d23-bd61-af2e53dda66c';
const a = JSON.parse(readFileSync(`${ROOT}/_assets/cn_access.json`, 'utf8'));
const sb = createClient('https://qvemohfojzawpnleyjsb.supabase.co',
  'sb_publishable_VFalDAdNoIgd19oxlZ8wlw_AM-rv7Uq',
  { global: { headers: { Authorization: `Bearer ${a.access_token}` } } });

const { data: nodes } = await sb.from('cn_nodes').select('id,name,parent_id,kind').eq('user_id', a.uid);
const byId = new Map(nodes.map(n => [n.id, n]));
const collect = (id) => { const out = [id]; for (const n of nodes) if (n.parent_id === id) out.push(...collect(n.id)); return out; };
const smokeRoot = nodes.find(n => n.name === '第1章 冒烟测试' && n.parent_id === null);
if (!smokeRoot) { console.log('无冒烟测试数据'); process.exit(0); }
const ids = collect(smokeRoot.id);
console.log(`待删 ${ids.length} 节点: ${ids.map(i => byId.get(i).name).join(' / ')}`);

// 图片清理（尽力）
const bucket = sb.storage.from('cn-images');
for (const id of ids) {
  const { data: files } = await bucket.list(`${a.uid}/${id}`, { limit: 1000 }).catch(() => ({ data: [] }));
  if (files && files.length) await bucket.remove(files.map(f => `${a.uid}/${id}/${f.name}`)).catch(() => {});
}
const { error: de } = await sb.from('cn_nodes').delete().in('id', ids);
if (de) { console.error('删除失败: ' + de.message); process.exit(1); }
const { error: te } = await sb.from('cn_tombstones').upsert(ids.map(id => ({ id, user_id: a.uid })));
if (te) { console.error('墓碑写入失败: ' + te.message); process.exit(1); }
console.log('已删除并写入墓碑（各设备下次拉取同步消失）');
