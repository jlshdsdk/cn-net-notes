import { effect, signal } from '@preact/signals';
import { lazy, Suspense } from 'preact/compat';
import { currentDocId, nodes, uiPersistEnabled } from '../state';

const NoteEditor = lazy(() => import('./NoteEditor'));
const NoteViewer = lazy(() => import('./NoteViewer'));

const UI_MODE_KEY = 'cn-ui-mode';
/** 笔记页双模式：阅读（KaTeX 渲染公式）/ 编辑（TipTap 富文本）；存储值非法时回落阅读 */
const savedMode = localStorage.getItem(UI_MODE_KEY);
export const noteMode = signal<'read' | 'edit'>(savedMode === 'edit' ? 'edit' : 'read');
effect(() => {
  const m = noteMode.value;
  if (!uiPersistEnabled()) return;
  try {
    localStorage.setItem(UI_MODE_KEY, m);
  } catch { /* 存储不可用时忽略 */ }
});

export function DocPane() {
  const id = currentDocId.value;
  const node = id ? nodes.value.get(id) : undefined;
  if (!node) {
    return (
      <div class="welcome">
        <div class="welcome-card">
          <h2>计算机网络笔记</h2>
          <p>在左侧选择一个知识点打开笔记（阅读模式自动渲染 LaTeX 公式），或新建目录开始整理。</p>
        </div>
      </div>
    );
  }
  const mode = noteMode.value;
  return (
    <div class="doc-pane">
      <div class="doc-head">
        <span class="doc-title" title={node.name}>
          {node.name}
        </span>
        <div class="doc-tabs">
          <button
            class={mode === 'read' ? 'tab on' : 'tab'}
            onClick={() => (noteMode.value = 'read')}
            title="阅读模式：渲染 LaTeX 公式与图片"
          >
            阅读
          </button>
          <button
            class={mode === 'edit' ? 'tab on' : 'tab'}
            onClick={() => (noteMode.value = 'edit')}
            title="编辑模式：富文本编辑（公式以 $...$ 原文书写）"
          >
            编辑
          </button>
        </div>
      </div>
      <div class="doc-body">
        <Suspense fallback={<div class="pane-loading">内容加载中…</div>}>
          {mode === 'read' ? (
            <NoteViewer key={`v-${node.id}`} docId={node.id} />
          ) : (
            <NoteEditor key={`n-${node.id}`} docId={node.id} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
