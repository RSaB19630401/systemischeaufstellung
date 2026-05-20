/**
 * Generate a wobbly circle path that looks hand-drawn.
 */
export function sketchyCircle(cx: number, cy: number, r: number, seed = 0): string {
  const points = 36;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble =
      Math.sin(seed * 7 + i * 3.7) * r * 0.08 +
      Math.cos(seed * 11 + i * 2.3) * r * 0.05;
    const px = cx + Math.cos(angle) * (r + wobble);
    const py = cy + Math.sin(angle) * (r + wobble);
    d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }
  return d + ' Z';
}

/**
 * Generate a wobbly line path that looks hand-drawn.
 */
export function sketchyLine(
  x1: number, y1: number, x2: number, y2: number, seed = 0,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(4, Math.floor(len / 15));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const wobbleX = Math.sin(seed * 5 + i * 4.1) * 2;
    const wobbleY = Math.cos(seed * 3 + i * 3.3) * 2;
    const px = x1 + dx * t + (i < steps ? wobbleX : 0);
    const py = y1 + dy * t + (i < steps ? wobbleY : 0);
    d += ` L ${px} ${py}`;
  }
  return d;
}
