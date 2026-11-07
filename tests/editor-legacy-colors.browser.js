(async () => {
  const editor = window.__cnEditor;
  if (!editor || location.hostname !== '127.0.0.1') throw new Error('请在隔离测试笔记中打开编辑模式');
  const original = editor.getHTML();
  const selection = { from: editor.state.selection.from, to: editor.state.selection.to };
  const fixture = '<p><span style="font-size:20px;color: rgb(124, 58, 237)">旧紫</span></p>' +
    '<p><span style="color:#dc2626">旧红</span></p>' +
    '<p><span style="color:#dc262600">透明色</span></p>' +
    '<p><span style="color:#dc2626;color:#0066cc">自定义蓝</span></p>';
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const waitForRender = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const colorOf = (text) => {
    const elements = [...document.querySelectorAll('.ProseMirror span')].filter((el) => el.textContent === text);
    return elements.length ? getComputedStyle(elements.at(-1)).color : '';
  };
  try {
    editor.commands.setContent(fixture, false);
    await waitForRender();
    const htmlBeforeSelection = editor.getHTML();
    assert(colorOf('旧紫') === 'rgb(102, 8, 116)', '编辑器没有正确显示旧紫色');
    assert(colorOf('旧红') === 'rgb(148, 7, 10)', '编辑器没有正确显示旧红色');
    assert(colorOf('透明色') === 'rgba(220, 38, 38, 0)', '编辑器不应覆盖透明的自定义颜色');
    assert(colorOf('自定义蓝') === 'rgb(0, 102, 204)', '编辑器不应覆盖后面声明的自定义颜色');
    editor.commands.setTextSelection(2);
    await waitForRender();
    assert(editor.getHTML() === htmlBeforeSelection, '旧色显示与光标变化不应改写笔记 HTML');
    if (failures.length) throw new Error(failures.join('\n'));
    return { passed: true, checks: 5 };
  } finally {
    editor.commands.setContent(original, false);
    editor.commands.setTextSelection(selection);
  }
})()
