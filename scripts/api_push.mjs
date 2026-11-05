// api_push.mjs — github.com:443 间歇不通时的直连备份推送通道（走 api.github.com，绝不用镜像）
// 用法: 在仓库目录运行  node scripts/api_push.mjs
// 原理: git blob/tree 对象按内容寻址，本地与 GitHub 同一算法——把本地对象原样上传后
//       重建的 commit sha 与本地完全一致，与正常 git push 殊途同归，历史不分叉。
//       token 运行时取自 `gh auth token`，不落盘。
import { execFileSync } from 'node:child_process';

const REPO = 'jlshdsdk/cn-net-notes';
const TOKEN = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const API = 'https://api.github.com';
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'cn-net-notes-api-push',
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
      if (res.status >= 500 || res.status === 403 && /rate limit|abuse/i.test(text)) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
    } catch (e) {
      if (e.cause || /fetch|network/i.test(String(e))) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${method} ${path} 重试耗尽`);
}

function gitStr(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\n$/, '');
}

// ---- 远端 main 当前位置 ----
async function getRef() {
  const r = await gh('GET', `/repos/${REPO}/git/ref/heads/main`, undefined, [200, 404, 409]);
  return r && r.object && r.object.sha ? r.object.sha : null;
}
let remoteHead = await getRef();
if (!remoteHead) {
  // 空仓库怪癖：Git Data API 拒绝在完全空仓库上建 blob（409）。
  // 先用 Contents API 放一个引导文件"点火"，随后 main 会被指到本地真实历史，引导提交成为孤儿。
  console.log('空仓库：先用 Contents API 点火…');
  await gh('PUT', `/repos/${REPO}/contents/.bootstrap`, {
    message: 'bootstrap: 初始化仓库以启用 Git Data API（随后会被本地历史取代）',
    content: Buffer.from('bootstrap\n').toString('base64'),
  }, [200, 201]);
  remoteHead = await getRef();
  if (!remoteHead) throw new Error('点火后仍取不到 main');
  console.log(`引导提交 ${remoteHead.slice(0, 7)}（将被本地历史取代）`);
}
console.log(remoteHead ? `远端 main = ${remoteHead.slice(0, 7)}` : '远端 main 不存在（空仓库）');

// ---- 已存在的 blob 集合（避免重复上传） ----
const known = new Set();
if (remoteHead) {
  const t = await gh('GET', `/repos/${REPO}/git/trees/${remoteHead}?recursive=1`, undefined, [200]);
  for (const e of t.tree ?? []) if (e.type === 'blob') known.add(e.sha);
  console.log(`远端已有 ${known.size} 个 blob`);
}

// ---- 远端头是否在本地历史中（点火提交只在远端存在，本地没有） ----
function isAncestor(a, b) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
function hasLocal(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', sha], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const remoteKnownLocally = !!remoteHead && hasLocal(remoteHead);
const bootstrapped = !!remoteHead && (!remoteKnownLocally || !isAncestor(remoteHead, 'HEAD'));

// ---- 待推送的本地提交（旧→新；远端头不在本地时推送全部） ----
const revs = gitStr(
  remoteKnownLocally ? ['rev-list', '--reverse', `${remoteHead}..HEAD`] : ['rev-list', '--reverse', 'HEAD']
).split('\n').filter(Boolean);
if (revs.length === 0) {
  console.log('没有需要推送的提交，结束');
  process.exit(0);
}
console.log(`待推送 ${revs.length} 个提交`);

const parentMap = new Map();
if (remoteHead) parentMap.set(remoteHead, remoteHead);

for (const c of revs) {
  // 1) 提交的树条目
  const lsRaw = execFileSync('git', ['ls-tree', '-r', '-z', c], { maxBuffer: 1 << 26 }).toString('utf8');
  const entries = [];
  for (const rec of lsRaw.split('\0').filter(Boolean)) {
    const m = rec.match(/^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/);
    if (!m) throw new Error(`ls-tree 记录无法解析: ${rec}`);
    entries.push({ mode: m[1], type: m[2], sha: m[3], path: m[4] });
  }
  // 2) 上传远端缺失的 blob
  for (const e of entries) {
    if (known.has(e.sha)) continue;
    const buf = execFileSync('git', ['cat-file', 'blob', e.sha], { maxBuffer: 1 << 26 });
    const b = await gh('POST', `/repos/${REPO}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' }, [201]);
    if (b.sha !== e.sha) throw new Error(`blob sha 不一致 ${e.path}: 远 ${b.sha} 本 ${e.sha}`);
    known.add(e.sha);
  }
  // 3) 重建 tree（sha 应与本地一致）
  const localTree = gitStr(['rev-parse', `${c}^{tree}`]);
  const t = await gh('POST', `/repos/${REPO}/git/trees`, {
    tree: entries.map(e => ({ path: e.path, mode: e.mode, type: 'blob', sha: e.sha })),
  }, [201]);
  if (t.sha !== localTree) throw new Error(`tree sha 不一致 ${c}: 远 ${t.sha} 本 ${localTree}`);
  // 4) 重建 commit（作者/提交者/日期原样，sha 应与本地一致）
  const rawMsg = execFileSync('git', ['log', '-1', '--format=%B', c], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const parents = gitStr(['show', '-s', '--format=%P', c]).split(/\s+/).filter(Boolean).map(p => parentMap.get(p));
  const cm = await gh('POST', `/repos/${REPO}/git/commits`, {
    message: rawMsg,
    tree: localTree,
    parents,
    author: {
      name: gitStr(['show', '-s', '--format=%an', c]),
      email: gitStr(['show', '-s', '--format=%ae', c]),
      date: gitStr(['show', '-s', '--format=%aI', c]),
    },
    committer: {
      name: gitStr(['show', '-s', '--format=%cn', c]),
      email: gitStr(['show', '-s', '--format=%ce', c]),
      date: gitStr(['show', '-s', '--format=%cI', c]),
    },
  }, [201]);
  if (cm.sha !== c) throw new Error(`commit sha 不一致: 远 ${cm.sha} 本 ${c}（历史会分叉，已中止）`);
  parentMap.set(c, cm.sha);
  console.log(`  ✓ ${c.slice(0, 7)} ${gitStr(['show', '-s', '--format=%s', c])}`);
}

// 5) 移动 main 引用（点火场景远端头与本地不同源，需要 force 指回；平时 fast-forward 即可）
const head = gitStr(['rev-parse', 'HEAD']);
await gh('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: head, force: bootstrapped }, [200]);
console.log(`\n完成：main -> ${head.slice(0, 7)}（与本地一致，无分叉）`);
