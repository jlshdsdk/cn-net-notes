import { useEffect, useRef, useState } from 'preact/hooks';
import 'katex/dist/katex.min.css';
import { getDB } from '../lib/db';
import { resolveImageUrl } from '../lib/images';
import { applyLegacyNoteColors } from '../lib/legacyNoteColors';

/**
 * 阅读态笔记视图：本地 HTML 直渲 + KaTeX 公式（$...$ 行内 / $$...$$ 块级）
 * + img[data-img-id] → IndexedDB blob objectURL 解析。
 * 本组件由 DocPane 懒加载：KaTeX 与字体只在进入阅读态时才下载。
 */
export default function NoteViewer({ docId }: { docId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    (async () => {
      const row = await (await getDB()).get('notes', docId);
      if (!cancelled) setHtml(row?.html ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || html === null) return;
    applyLegacyNoteColors(el);
    let cancelled = false;
    void (async () => {
      // 图片：data-img-id → 本地 blob（缺失则显示等待云同步提示）
      for (const img of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-img-id]'))) {
        const id = img.getAttribute('data-img-id');
        const url = id ? await resolveImageUrl(id) : null;
        if (cancelled) return;
        if (url) img.src = url;
        else img.alt = '（图片缺失，等待云同步）';
      }
      // 公式：笔记含 $ 才动态加载 KaTeX（无公式笔记零额外开销）
      if ((el.textContent ?? '').includes('$')) {
        const { default: renderMathInElement } = await import('katex/dist/contrib/auto-render');
        if (cancelled || !hostRef.current) return;
        renderMathInElement(hostRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  if (html === null) return <div class="pane-loading">加载中…</div>;
  return (
    <div class="note-viewer" ref={hostRef}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p class="nv-empty">（空笔记，点右上「编辑」开始书写；公式用 $...$ 包裹）</p>
      )}
    </div>
  );
}
