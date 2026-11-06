// check_cloud.mjs — 云端冒烟数据与节点总数快查
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'D:/Users/王奕博/.zcode/workspace/draft-799e416d-7c42-4d23-bd61-af2e53dda66c';
const a = JSON.parse(readFileSync(`${ROOT}/_assets/cn_access.json`, 'utf8'));
const sb = createClient('https://qvemohfojzawpnleyjsb.supabase.co',
  'sb_publishable_VFalDAdNoIgd19oxlZ8wlw_AM-rv7Uq',
  { global: { headers: { Authorization: `Bearer ${a.access_token}` } } });

const { data: nodes } = await sb.from('cn_nodes').select('id,name,kind,parent_id').eq('user_id', a.uid);
const docs = nodes.filter(n => n.kind === 'doc');
const smoke = nodes.filter(n => (n.name ?? '').includes('冒烟'));
const roots = nodes.filter(n => n.parent_id === null).map(n => n.name);
console.log(`云端: ${nodes.length} 节点（${docs.length} 文档 + ${nodes.length - docs.length} 目录）`);
console.log(`根目录: ${roots.join(' | ')}`);
console.log(`冒烟残留: ${smoke.length} 个 ${smoke.map(s => s.name).join(', ')}`);
