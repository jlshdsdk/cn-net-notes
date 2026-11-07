(() => {
  if (innerWidth < 1700) throw new Error('请先将浏览器视口设置为大屏桌面宽度');
  const editor = document.querySelector('.ProseMirror');
  const host = document.querySelector('.nt-host');
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('button[aria-controls="note-navigation"]');
  if (!editor || !host || !sidebar || !toggle) throw new Error('请先在隔离测试笔记中打开编辑模式');
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const style = getComputedStyle(editor);
  const contentWidth = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const editorBox = editor.getBoundingClientRect();
  const hostBox = host.getBoundingClientRect();
  assert(contentWidth <= 1281, '超宽屏编辑区的正文不应超过阅读区宽度');
  assert(Math.abs((editorBox.left + editorBox.right) - (hostBox.left * 2 + host.clientWidth)) < 2, '超宽屏编辑区应居中');
  assert(getComputedStyle(sidebar).display !== 'none', '桌面端应始终显示目录');
  assert(getComputedStyle(toggle).display === 'none', '桌面端不应显示手机目录按钮');
  const image = editor.querySelector('img');
  assert(image?.complete && image.naturalWidth > 0, '真实课程截图应正常加载');
  assert(image && getComputedStyle(image).filter === 'none' && getComputedStyle(image).opacity === '1', '课程截图不应被调暗或滤色');
  if (failures.length) throw new Error(failures.join('\n'));
  return { passed: true, checks: 6 };
})()
