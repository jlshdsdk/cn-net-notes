(async () => {
  if (innerWidth > 760) throw new Error('请先将浏览器视口设置为手机宽度');
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const waitForRender = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const viewer = document.querySelector('.note-viewer');
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('button[aria-controls="note-navigation"]');
  if (!viewer || !sidebar) throw new Error('请先在隔离测试笔记中打开阅读模式');
  const before = viewer.innerHTML;

  assert(viewer.getBoundingClientRect().width >= innerWidth - 48, '手机阅读区应占据大部分屏幕宽度');
  assert(getComputedStyle(sidebar).display === 'none', '手机目录默认应收起');
  assert(toggle, '手机页面缺少目录展开按钮');
  if (toggle) {
    assert(toggle.getAttribute('aria-expanded') === 'false', '收起的目录状态没有正确标记');
    toggle.click();
    await waitForRender();
    assert(getComputedStyle(sidebar).display !== 'none', '点击目录按钮后未显示目录');
    assert(toggle.getAttribute('aria-expanded') === 'true', '展开的目录状态没有正确标记');
    const selected = sidebar.querySelector('.tree-row.current');
    assert(selected, '目录中缺少当前笔记');
    if (selected) {
      const actions = selected.querySelector('.row-actions');
      assert(actions && getComputedStyle(actions).display !== 'none', '手机目录的笔记操作按钮应始终可见');
      selected.querySelector('button[title="重命名"]')?.click();
      await waitForRender();
      const renameInput = sidebar.querySelector('.name-input');
      assert(renameInput && getComputedStyle(sidebar).display !== 'none', '点击重命名应保持目录打开');
      renameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitForRender();
    }
    selected?.click();
    await waitForRender();
    assert(getComputedStyle(sidebar).display === 'none', '选择笔记后目录应自动收起');
    assert(toggle.getAttribute('aria-expanded') === 'false', '选择笔记后目录状态应恢复为收起');
    toggle.click();
    await waitForRender();
    const search = document.querySelector('.search-box');
    search.value = '开篇';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 600));
    const hit = document.querySelector('.search-hit');
    assert(hit, '测试搜索应找到笔记');
    hit?.click();
    await waitForRender();
    assert(getComputedStyle(sidebar).display === 'none', '通过搜索打开笔记后目录应自动收起');
  }
  assert(viewer.innerHTML === before, '打开目录和选择笔记不应改写笔记内容');
  if (failures.length) throw new Error(failures.join('\n'));
  return { passed: true, checks: 14 };
})()
