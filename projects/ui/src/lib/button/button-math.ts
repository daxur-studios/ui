/** Precision for calculated SVG coordinates. */
const PRECISION = 2;

/**
 * Computes polygon points for a chamfered rectangular frame of given width and height.
 * Chamfers the top-right and bottom-left corners.
 */
export function buildChamferPoints(width: number, height: number, chamfer: number): string {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const c = Math.min(chamfer, w / 2, h / 2);

  const p1 = `0,${c.toFixed(PRECISION)}`;
  const p2 = `${c.toFixed(PRECISION)},0`;
  const p3 = `${(w - c).toFixed(PRECISION)},0`;
  const p4 = `${w.toFixed(PRECISION)},${c.toFixed(PRECISION)}`;
  const p5 = `${w.toFixed(PRECISION)},${(h - c).toFixed(PRECISION)}`;
  const p6 = `${(w - c).toFixed(PRECISION)},${h.toFixed(PRECISION)}`;
  const p7 = `${c.toFixed(PRECISION)},${h.toFixed(PRECISION)}`;
  const p8 = `0,${(h - c).toFixed(PRECISION)}`;

  return `${p1} ${p2} ${p3} ${p4} ${p5} ${p6} ${p7} ${p8}`;
}

/**
 * Computes the SVG path string for four corner reticle brackets with cinching offset.
 */
export function buildBracketPaths(
  width: number,
  height: number,
  armLength: number,
  inset: number,
): { tl: string; tr: string; bl: string; br: string } {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const a = Math.min(armLength, w / 2, h / 2);
  const i = Math.max(0, inset);

  // Top-left
  const tl = `M ${i + a} ${i} L ${i} ${i} L ${i} ${i + a}`;
  // Top-right
  const tr = `M ${w - i - a} ${i} L ${w - i} ${i} L ${w - i} ${i + a}`;
  // Bottom-left
  const bl = `M ${i + a} ${h - i} L ${i} ${h - i} L ${i} ${h - i - a}`;
  // Bottom-right
  const br = `M ${w - i - a} ${h - i} L ${w - i} ${h - i} L ${w - i} ${h - i - a}`;

  return { tl, tr, bl, br };
}
