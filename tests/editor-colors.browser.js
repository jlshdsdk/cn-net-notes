(async () => {
  const editor = window.__cnEditor;
  if (!editor) throw new Error('请先在隔离测试笔记中打开编辑模式');

  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const swatch = (label) => document.querySelector(`button[title="字体颜色：${label}"]`);
  const before = editor.getHTML();
  const selection = { from: editor.state.selection.from, to: editor.state.selection.to };
  const positions = {};
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const color = node.marks.find((mark) => mark.type.name === 'textStyle')?.attrs.color;
    if (color && !positions[color]) positions[color] = pos + 1;
  });
  const selectAndWait = async (pos) => {
    editor.commands.setTextSelection(pos);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };

  try {
    assert(getComputedStyle(swatch('紫色')).backgroundColor === 'rgb(102, 8, 116)', '紫色色块没有使用清华紫');
    assert(getComputedStyle(swatch('红色')).backgroundColor === 'rgb(148, 7, 10)', '红色色块没有使用北大红');

    assert(positions['rgb(124, 58, 237)'], '测试笔记缺少旧紫色文字');
    assert(positions['rgb(220, 38, 38)'], '测试笔记缺少旧红色文字');
    if (positions['rgb(124, 58, 237)']) {
      await selectAndWait(positions['rgb(124, 58, 237)']);
      assert(swatch('紫色').classList.contains('on'), '选中旧紫色文字时没有高亮紫色色块');
    }
    if (positions['rgb(220, 38, 38)']) {
      await selectAndWait(positions['rgb(220, 38, 38)']);
      assert(swatch('红色').classList.contains('on'), '选中旧红色文字时没有高亮红色色块');
    }
    assert(editor.getHTML() === before, '改变光标位置不应改写笔记 HTML');

    if (failures.length) throw new Error(failures.join('\n'));
    return { passed: true, checks: 7 };
  } finally {
    editor.commands.setTextSelection(selection);
  }
})()
