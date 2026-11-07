(async () => {
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const fixture = document.createElement('div');
  fixture.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;';
  fixture.innerHTML = `
    <div class="note-viewer">
      <p><span id="read-purple" style="font-size:20px;color:#7c3aed">原有紫色</span></p>
      <p><span id="read-red" style="color:#dc2626">原有红色</span></p>
      <p><span id="read-purple-spacing" style="font-size:20px;color: rgb(124, 58, 237)">旧色不同空格</span></p>
      <p><span id="read-purple-important" style="color:#7c3aed !important">强优先级旧紫色</span></p>
      <p><span id="read-red-alpha" style="color:#dc262600">透明自定义颜色</span></p>
      <p><span id="read-red-overridden" style="color:#dc2626;color:#0066cc">后面的自定义颜色</span></p>
      <p><span id="read-red-custom-priority" class="hl-on" style="color:#dc2626">自定义高优先级白色</span></p>
      <p><span id="read-other" style="color:#0066cc">自定义颜色</span></p>
      <p><span id="read-background-only" style="background-color:#dc2626">背景颜色</span></p>
      <p><img id="read-image" class="ds-note-img" alt="课程截图" /></p>
    </div>
    <div class="ProseMirror">
      <p><span id="edit-purple" style="color: rgb(124, 58, 237)">原有紫色</span></p>
      <p><span id="edit-red" style="color: rgb(220, 38, 38)">原有红色</span></p>
    </div>`;
  const htmlBefore = fixture.innerHTML;
  const stylesBefore = [...fixture.querySelectorAll('[style]')].map((el) => el.getAttribute('style'));
  document.body.appendChild(fixture);

  try {
    const { applyLegacyNoteColors } = await import(`/cn-net-notes/src/lib/legacyNoteColors.ts?test=${Date.now()}`);
    applyLegacyNoteColors(fixture.querySelector('.note-viewer'));
    const color = (id) => getComputedStyle(fixture.querySelector(`#${id}`)).color;
    assert(color('read-purple') === 'rgb(102, 8, 116)', '阅读模式的原有紫色没有显示为清华紫');
    assert(color('read-red') === 'rgb(148, 7, 10)', '阅读模式的原有红色没有显示为北大红');
    assert(color('read-purple-spacing') === 'rgb(102, 8, 116)', '不同空格写法的旧紫色没有正确显示');
    assert(color('read-purple-important') === 'rgb(102, 8, 116)', '强优先级旧紫色没有正确显示');
    assert(color('read-red-alpha') === 'rgba(220, 38, 38, 0)', '不应覆盖透明的自定义颜色');
    assert(color('read-red-overridden') === 'rgb(0, 102, 204)', '不应覆盖后面声明的自定义颜色');
    assert(color('read-red-custom-priority') === 'rgb(255, 255, 255)', '不应覆盖高优先级的自定义颜色');
    assert(color('edit-purple') === 'rgb(102, 8, 116)', '编辑模式的原有紫色没有显示为清华紫');
    assert(color('edit-red') === 'rgb(148, 7, 10)', '编辑模式的原有红色没有显示为北大红');
    assert(color('read-other') === 'rgb(0, 102, 204)', '不应覆盖其他自定义字体颜色');
    assert(color('read-background-only') !== 'rgb(148, 7, 10)', '背景颜色不应被误判为字体颜色');
    const clone = fixture.cloneNode(true);
    clone.querySelectorAll('[style]').forEach((el, index) => {
      el.setAttribute('style', stylesBefore[index]);
    });
    assert(clone.innerHTML === htmlBefore, '显示配色不应修改笔记文字或行内样式');

    const imageStyle = getComputedStyle(fixture.querySelector('#read-image'));
    assert(imageStyle.opacity === '1' && imageStyle.filter === 'none', '课程图片不应被调暗或滤色');
    assert(getComputedStyle(document.body).backgroundImage.includes('url('), '页面缺少生成的背景图');
    assert(getComputedStyle(fixture.querySelector('.note-viewer')).fontFamily.includes('Noto Serif'), '正文未使用新的中文字体');

    if (failures.length) throw new Error(failures.join('\n'));
    return { passed: true, checks: 15 };
  } finally {
    fixture.remove();
  }
})()
