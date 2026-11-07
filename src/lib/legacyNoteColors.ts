/** 只改变阅读视图的展示颜色，不改写保存在数据库中的笔记 HTML。 */
export function applyLegacyNoteColors(container: HTMLElement): void {
  for (const el of container.querySelectorAll<HTMLElement>('[style]')) {
    const inlineColor = el.style.color.toLowerCase().replace(/\s+/g, '');
    const visibleColor = getComputedStyle(el).color.replace(/\s+/g, '');
    if ((inlineColor === '#7c3aed' || inlineColor === 'rgb(124,58,237)') && visibleColor === 'rgb(124,58,237)') {
      el.style.setProperty('color', 'var(--note-purple)', 'important');
    } else if ((inlineColor === '#dc2626' || inlineColor === 'rgb(220,38,38)') && visibleColor === 'rgb(220,38,38)') {
      el.style.setProperty('color', 'var(--note-red)', 'important');
    }
  }
}
