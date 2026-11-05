// api_push.mjs — github.com:443 间歇不通时的直连备份推送通道（走 api.github.com，绝不用镜像）
// 用法: 在仓库目录运行  node scripts/api_push.mjs
// 语义: 内容快照推送——把本地 HEAD 的完整树同步到远端 main（远端每次多一个 sync 提交）。
//       不追求 commit sha 与本地一致（GitHub API 会规范化提交元数据）；
//       恢复正常网络后可用  git push --force-with-lease origin main  重新对齐本地历史。
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

function gitStr(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\n$/, '');
}
function gitBuf(args) {
  return execFileSync('git', args, { maxBuffer: 1 << 26 });
}

// ---- 远端 main 当前位置 ----
async function getRef() {
  const r = await gh('GET', `/repos/${REPO}/git/ref/heads/main`, undefined, [200, 404, 409]);
  return r && r.object && r.object.sha ? r.object.sha : null;
}
let remoteHead = await getRef();
if (!remoteHead) {
  // 空仓库怪癖：Git Data API 拒绝在完全空仓库上建 blob（409）。
  // 先用 Contents API 放一个引导文件"点火"，随后的 sync 提交会取代它。
  console.log('空仓库：先用 Contents API 点火…');
  await gh('PUT', `/repos/${REPO}/contents/.bootstrap`, {
    message: 'bootstrap: 初始化仓库以启用 Git Data API（随后会被 sync 提交取代）',
    content: Buffer.from('bootstrap\n').toString('base64'),
  }, [200, 201]);
  remoteHead = await getRef();
  if (!remoteHead) throw new Error('点火后仍取不到 main');
  console.log(`引导提交 ${remoteHead.slice(0, 7)}（将被取代）`);
}

// ---- 远端已有 blob 集合 + 远端树 sha（内容相同则免推） ----
const known = new Set();
let remoteTree = null;
{
  const c = await gh('GET', `/repos/${REPO}/git/commits/${remoteHead}`, undefined, [200]);
  remoteTree = c.commit?.tree?.sha ?? null;
  if (remoteTree) {
    const t = await gh('GET', `/repos/${REPO}/git/trees/${remoteTree}?recursive=1`, undefined, [200]);
    for (const e of t.tree ?? []) if (e.type === 'blob') known.add(e.sha);
  }
}

// ---- 本地 HEAD 的完整树 ----
const head = gitStr(['rev-parse', 'HEAD']);
const localTree = gitStr(['rev-parse', 'HEAD^{tree}']);
if (remoteTree === localTree) {
  console.log(`远端内容已与本地一致（tree ${localTree.slice(0, 7)}），无需推送`);
  process.exit(0);
}

const lsRaw = gitBuf(['ls-tree', '-r', '-z', 'HEAD']).toString('utf8');
const entries = [];
for (const rec of lsRaw.split('\0').filter(Boolean)) {
  const m = rec.match(/^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/);
  if (!m) throw new Error(`ls-tree 记录无法解析: ${rec}`);
  entries.push({ mode: m[1], type: m[2], sha: m[3], path: m[4] });
}

// ---- 上传远端缺失的 blob ----
let uploaded = 0;
for (const e of entries) {
  if (known.has(e.sha)) continue;
  const buf = gitBuf(['cat-file', 'blob', e.sha]);
  const b = await gh('POST', `/repos/${REPO}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' }, [201]);
  if (b.sha !== e.sha) throw new Error(`blob sha 不一致 ${e.path}: 远 ${b.sha} 本 ${e.sha}`);
  known.add(e.sha);
  uploaded++;
}
console.log(`blob: 新传 ${uploaded}，复用 ${entries.length - uploaded}`);

// ---- 建树与提交（内容快照） ----
const t = await gh('POST', `/repos/${REPO}/git/trees`, {
  tree: entries.map(e => ({ path: e.path, mode: e.mode, type: 'blob', sha: e.sha })),
}, [201]);
if (t.sha !== localTree) throw new Error(`tree sha 不一致: 远 ${t.sha} 本 ${localTree}`);

const subject = gitStr(['show', '-s', '--format=%s', 'HEAD']);
const cm = await gh('POST', `/repos/${REPO}/git/commits`, {
  message: `sync: ${subject} [${head.slice(0, 7)}]`,
  tree: localTree,
  parents: [remoteHead],
}, [201]);

await gh('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: cm.sha, force: false }, [200]);
console.log(`完成：main -> ${cm.sha.slice(0, 7)}（sync 提交，内容 = 本地 ${head.slice(0, 7)}）`);
