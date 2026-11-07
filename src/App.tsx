import { useEffect, useState } from 'preact/hooks';
import { Sidebar, initExpanded } from './components/Sidebar';
import { DocPane } from './components/DocPane';
import { TopBar } from './components/TopBar';
import { ConfirmHost, Toast } from './components/Modal';
import { currentDocId, enableUiPersist, restoreUiState, setNodeMap, showToast } from './state';
import { loadNodes } from './lib/db';
import { initAuth, syncStatus } from './lib/sync';

export function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // 先用本地数据渲染（不等云端），避免每次进入白屏等待
      try {
        setNodeMap(await loadNodes());
        restoreUiState();
        initExpanded(currentDocId.value);
        enableUiPersist();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setReady(true);
        return;
      }
      setReady(true);
      // 云端接管放后台：失败不影响本地使用
      try {
        await initAuth();
      } catch (e) {
        showToast('云端连接失败，当前仅本地模式');
        syncStatus.value = 'offline';
      }
      setNodeMap(await loadNodes());
      restoreUiState();
      initExpanded(currentDocId.value);
    })();
  }, []);

  if (err) return <div class="boot">初始化失败：{err}</div>;
  if (!ready) return <div class="boot">加载中…</div>;

  return (
    <div class="app">
      <TopBar
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setMobileSidebarOpen(open => !open)}
        onSelectDoc={() => setMobileSidebarOpen(false)}
      />
      <div class={`main${mobileSidebarOpen ? ' mobile-nav-open' : ''}`}>
        <button
          class="mobile-nav-backdrop"
          aria-label="关闭目录"
          onClick={() => setMobileSidebarOpen(false)}
        />
        <Sidebar onSelectDoc={() => setMobileSidebarOpen(false)} />
        <DocPane />
      </div>
      <ConfirmHost />
      <Toast />
    </div>
  );
}
