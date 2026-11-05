// api_pages.mjs — 把本地 dist/ 构建产物直连发布到 gh-pages 分支（走 api.github.com）
// 用法: 先 npm run build，再运行  node scripts/api_pages.mjs
// 配合 api_push.mjs：443 恢复后可改回 Actions 自动部署。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'jlshdsdk/cn-net-notes';
const TOKEN = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const API = 'https://api.github.com';
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'cn-net-notes-api-pages',
};

async function gh(method, path, body, okCodes) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API + path, {
        method,
        headers: H,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (okCodes.includes(res.status)) return json;
      if (res.status >= 500 || (res.status === 403 && /rate limit|abuse/i.test(text))) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
    } catch (e) {
      if (String(e.cause ?? e).match(/fetch|network|ECONN|ETIMEDOUT/i)) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${method} ${path} 重试耗尽`);
}

// ---- 收集 dist/ 全部文件（路径用 / 分隔） ----
const DIST = 'dist';
const files = [];
function walk(dir, prefix) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(p).isDirectory()) walk(p, rel);
    else files.push({ path: rel, buf: readFileSync(p) });
  }
}
walk(DIST, '');
files.push({ path: '.nojekyll', buf: Buffer.from('') }); // 跳过 Jekyll 处理
console.log(`dist/ 共 ${files.length} 个文件`);

// ---- 远端 gh-pages 现状 ----
const ref = await gh('GET', `/repos/${REPO}/git/ref/heads%2Fgh-pages`, undefined, [200, 404, 409]);
const remoteHead = ref && ref.object ? ref.object.sha : null;

// ---- 上传 blob（内容寻址，sha 对比远端已有可复用） ----
const known = new Set();
if (remoteHead) {
  const c = await gh('GET', `/repos/${REPO}/git/commits/${remoteHead}`, undefined, [200]);
  const treeSha = c.commit?.tree?.sha;
  if (treeSha) {
    const t = await gh('GET', `/repos/${REPO}/git/trees/${treeSha}?recursive=1`, undefined, [200]);
    for (const e of t.tree ?? []) if (e.type === 'blob') known.add(e.sha);
  }
}
const treeEntries = [];
let uploaded = 0;
for (const f of files) {
  // 本地直接算 git blob sha（与 GitHub 同算法），远端已有的内容跳过上传
  const header = Buffer.from(`blob ${f.buf.length}\0`);
  const sha = createHash('sha1').update(Buffer.concat([header, f.buf])).digest('hex');
  if (!known.has(sha)) {
    const b = await gh('POST', `/repos/${REPO}/git/blobs`, {
      content: f.buf.toString('base64'),
      encoding: 'base64',
    }, [201]);
    if (b.sha !== sha) throw new Error(`blob sha 不一致 ${f.path}: 远 ${b.sha} 本 ${sha}`);
    known.add(sha);
    uploaded++;
  }
  treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha });
}
console.log(`blob: 新传 ${uploaded} 个，复用 ${files.length - uploaded} 个`);

// ---- 建 tree + commit + ref ----
const t = await gh('POST', `/repos/${REPO}/git/trees`, { tree: treeEntries }, [201]);
const cm = await gh('POST', `/repos/${REPO}/git/commits`, {
  message: `deploy: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} 构建产物`,
  tree: t.sha,
  parents: remoteHead ? [remoteHead] : [],
}, [201]);

if (!remoteHead) {
  await gh('POST', `/repos/${REPO}/git/refs`, { ref: 'refs/heads/gh-pages', sha: cm.sha }, [201]);
} else {
  await gh('PATCH', `/repos/${REPO}/git/refs/heads%2Fgh-pages`, { sha: cm.sha, force: true }, [200]);
}
console.log(`完成：gh-pages -> ${cm.sha.slice(0, 7)}`);

// ---- 开通/确认 Pages（源 = gh-pages 分支） ----
const pages = await gh('GET', `/repos/${REPO}/pages`, undefined, [200, 404]);
if (pages && pages.html_url) {
  console.log(`Pages 已存在：${pages.html_url}（源：${pages.source?.branch ?? '?'}）`);
  if (pages.source?.branch !== 'gh-pages') {
    await gh('PUT', `/repos/${REPO}/pages`, { source: { branch: 'gh-pages', path: '/' } }, [204]);
    console.log('Pages 源已切换为 gh-pages');
  }
} else {
  await gh('POST', `/repos/${REPO}/pages`, { source: { branch: 'gh-pages', path: '/' } }, [201, 204]);
  console.log('Pages 已开通（源：gh-pages）');
}
console.log('线上地址：https://jlshdsdk.github.io/cn-net-notes/');
