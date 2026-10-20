// Priority: hovered topic, selected topic, then nearby labels. All share one
// screen-space collision pass, including the hover tooltip and category names.
export function placeLabels(candidates, width, height) {
  const margin = 12, gap = 8, placed = [];
  for (const item of [...candidates].sort((a, b) => a.priority - b.priority || a.depth - b.depth)) {
    const w = Math.min(item.width, width - margin * 2), h = item.height;
    if (w <= 0 || h > height - margin * 2) continue;
    const positions = [[item.x - w / 2, item.y + item.offset]];
    if (item.priority < 2) positions.push(
      [item.x - w / 2, item.y - h - item.offset],
      [item.x + 20, item.y - h / 2],
      [item.x - w - 20, item.y - h / 2]
    );
    for (const [x, y] of positions) {
      const left = Math.max(margin, Math.min(width - margin - w, x));
      const top = Math.max(margin, Math.min(height - margin - h, y));
      const rect = { left, top, right: left + w, bottom: top + h };
      if (placed.some(p => rect.left < p.right + gap && rect.right + gap > p.left && rect.top < p.bottom + gap && rect.bottom + gap > p.top)) continue;
      placed.push({ ...item, ...rect });
      break;
    }
  }
  return placed;
}
