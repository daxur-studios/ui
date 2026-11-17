/**
 * Chrome tube kit for cybersigil UI frames (prototype, Spike 09f).
 *
 * Purpose: the UI references (`cyber (1)`, `cyber (3)`) are not spiky sigils. They are calm,
 * near-constant-width chrome tubes: an edge rail, an inner content rail, a medallion crown cradled
 * by the rail, whiplash ribs that merge tangentially into the rails, corner curls, dividers that
 * pinch into a small star node, and a dendritic connector that feeds card rows. This module builds
 * that vocabulary as plain centre-line paths.
 *
 * Value: geometry is driven by the page layout (measured rectangles), so the frame always fits the
 * content; the seed only varies ornament (rib count and sweep, corner curl, node shape, connector
 * split order). Rendering stacks strokes per layer (edge, body, reflection, highlight) across all
 * tubes at once, so tangent merges read as one continuous metal piece with a crisp spine.
 */

import { createSigilRng, type ISigilRng } from './sigil-rng';

/** An axis-aligned rectangle in frame space. */
export interface ITubeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One stroked tube: a centre-line path and its full width. */
export interface ITube {
  readonly d: string;
  readonly width: number;
}

/** A complete frame scene ready for layered rendering. */
export interface ITubeScene {
  /** Main rails and ornaments. */
  readonly tubes: readonly ITube[];
  /** Thinner frames around fields and cards. */
  readonly fineTubes: readonly ITube[];
  /** Translucent glass regions between rails (filled, `evenodd`). */
  readonly glass: readonly string[];
  /** Small solid chrome shapes: divider stars, teardrops. */
  readonly nodes: readonly string[];
  /** Medallion centre, for placing a glyph. */
  readonly medallion: { readonly cx: number; readonly cy: number; readonly r: number };
  /** How far the medallion ring rises above the frame's top edge, in px; `0` when it stays inside. */
  readonly overhang: number;
}

/** Layout the frame must fit, measured from the page. */
export interface ITubeLayout {
  readonly width: number;
  readonly height: number;
  /** Height of the header band; the content rail runs along its bottom. */
  readonly headerHeight: number;
  /** y positions where the content rail splits into stacked panels. */
  readonly dividers?: readonly number[];
  /** Fields (search, inputs) framed as pills. */
  readonly pills?: readonly ITubeRect[];
  /** Cards framed with a fine rounded tube. */
  readonly cards?: readonly ITubeRect[];
  /** Cards the dendritic connector feeds, by left-edge midpoint. */
  readonly connectorTargets?: readonly ITubeRect[];
  /** Base tube width; defaults scale with frame width. */
  readonly tubeWidth?: number;
  readonly seed: number;
}

/** Corner curl styles a seed can pick. */
export type TubeCornerStyle = 'curl' | 'double' | 'plain';
/** Divider node shapes a seed can pick. */
export type TubeNodeStyle = 'star4' | 'diamond' | 'star6';

/** Tube width per unit of frame width when none is given. */
const TUBE_WIDTH_PER_WIDTH = 0.0056;
/** Smallest automatic tube width. */
const MIN_TUBE_WIDTH = 4;
/** Largest automatic tube width. */
const MAX_TUBE_WIDTH = 6.4;
/** Fine tubes (cards, fields) relative to the main width. */
const FINE_TUBE_RATIO = 0.55;
/** Edge rail inset from the window edge, in tube widths. */
const EDGE_INSET_TUBES = 0.8;
/** Content rail inset from the window edge, in tube widths. */
const CONTENT_INSET_TUBES = 4.2;
/** Edge rail corner radius, in tube widths. */
const EDGE_RADIUS_TUBES = 7;
/** Content rail corner radius, in tube widths. */
const CONTENT_RADIUS_TUBES = 8;
/** Medallion radius as a fraction of header height. */
const MEDALLION_RADIUS_RATIO = 0.82;
/** Medallion centre y as a fraction of header height (it overflows the top edge). */
const MEDALLION_CENTRE_RATIO = 0.32;
/** Gap between medallion ring and the cradling rail, in tube widths. */
const CRADLE_GAP_TUBES = 1.6;
/** Largest medallion radius as a fraction of frame width, so narrow windows keep room for ribs. */
const MEDALLION_MAX_WIDTH_RATIO = 0.15;
/** Angle from straight down where the cradle leaves the offset circle. */
const CRADLE_ANGLE = 0.62;
/** Half-gap between stacked panels at a divider, in tube widths. */
const DIVIDER_HALF_GAP_TUBES = 2.6;
/** Divider node outer radius, in tube widths. */
const NODE_RADIUS_TUBES = 3;
/** Path coordinate precision. */
const PATH_DECIMALS = 2;

/** Formats a number for path output. */
function f(n: number): string {
  return Number(n.toFixed(PATH_DECIMALS)).toString();
}

/** `x y` pair. */
function p(x: number, y: number): string {
  return `${f(x)} ${f(y)}`;
}

/** Rounded rectangle centre-line path. */
export function roundedRectPath(rect: ITubeRect, radius: number): string {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  const { x, y, width: w, height: h } = rect;
  return (
    `M${p(x + r, y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${p(x + w, y + r)}` +
    `V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${p(x + w - r, y + h)}` +
    `H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${p(x, y + h - r)}V${f(y + r)}` +
    `A${f(r)} ${f(r)} 0 0 1 ${p(x + r, y)}Z`
  );
}

/** Horizontal edge segment from `x0` to `x1` at `y`, optionally bowing toward a node at `cx`. */
function bowedEdge(
  x0: number,
  x1: number,
  y: number,
  bow: { cx: number; depth: number; half: number } | null,
): string {
  if (!bow || bow.cx - bow.half < Math.min(x0, x1) || bow.cx + bow.half > Math.max(x0, x1)) {
    return `H${f(x1)}`;
  }
  const dir = Math.sign(x1 - x0);
  const a = bow.cx - dir * bow.half;
  const b = bow.cx + dir * bow.half;
  const k = bow.half * 0.55;
  return (
    `H${f(a)}C${p(a + dir * k, y)} ${p(bow.cx - dir * k * 0.6, y + bow.depth)} ${p(bow.cx, y + bow.depth)}` +
    `C${p(bow.cx + dir * k * 0.6, y + bow.depth)} ${p(b - dir * k, y)} ${p(b, y)}H${f(x1)}`
  );
}

/** Options for one stacked panel of the content rail. */
interface IPanelSpec {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly radius: number;
  /** Top edge cradles the medallion. */
  readonly cradle: { cx: number; cy: number; ringR: number; gap: number } | null;
  readonly topBow: { cx: number; depth: number; half: number } | null;
  readonly bottomBow: { cx: number; depth: number; half: number } | null;
}

/**
 * Panel outline: a rounded rectangle whose top may dip around the medallion and whose top or
 * bottom may bow toward a divider node. Drawn clockwise from the top-left corner.
 */
function panelPath(s: IPanelSpec): string {
  const r = s.radius;
  let d = `M${p(s.left, s.top + r)}A${f(r)} ${f(r)} 0 0 1 ${p(s.left + r, s.top)}`;
  if (s.cradle) {
    const { cx, cy, ringR, gap } = s.cradle;
    const R = ringR + gap;
    const px = R * Math.sin(CRADLE_ANGLE);
    const py = cy + R * Math.cos(CRADLE_ANGLE);
    const dipHalf = R * 1.55;
    const k = (dipHalf - px) * 0.6;
    // Approach along the rail, sweep down onto the offset circle, ride it, sweep back up.
    d += `H${f(cx - dipHalf)}`;
    d += `C${p(cx - dipHalf + k, s.top)} ${p(cx - px - Math.cos(CRADLE_ANGLE) * k * 0.7, py - Math.sin(CRADLE_ANGLE) * k * 0.7)} ${p(cx - px, py)}`;
    d += `A${f(R)} ${f(R)} 0 0 0 ${p(cx + px, py)}`;
    d += `C${p(cx + px + Math.cos(CRADLE_ANGLE) * k * 0.7, py - Math.sin(CRADLE_ANGLE) * k * 0.7)} ${p(cx + dipHalf - k, s.top)} ${p(cx + dipHalf, s.top)}`;
    d += `H${f(s.right - r)}`;
  } else {
    d += bowedEdge(s.left + r, s.right - r, s.top, s.topBow);
  }
  d += `A${f(r)} ${f(r)} 0 0 1 ${p(s.right, s.top + r)}V${f(s.bottom - r)}`;
  d += `A${f(r)} ${f(r)} 0 0 1 ${p(s.right - r, s.bottom)}`;
  d += bowedEdge(s.right - r, s.left + r, s.bottom, s.bottomBow);
  d += `A${f(r)} ${f(r)} 0 0 1 ${p(s.left, s.bottom - r)}Z`;
  return d;
}

/** Point on a circle at screen angle `theta` (0 = right, positive = clockwise/down). */
function onCircle(cx: number, cy: number, r: number, theta: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
}

/**
 * Whiplash rib from the medallion ring to a rail, leaving the ring along its outward normal and
 * arriving tangent to the rail, so both ends read as merges rather than T-joints. Mirrored copy is
 * produced by the caller with `side = 1`.
 */
function ribPath(
  cx: number,
  cy: number,
  ringR: number,
  theta: number,
  endX: number,
  endY: number,
  pull: number,
  side: -1 | 1,
): string {
  const t = side === -1 ? theta : Math.PI - theta;
  const start = onCircle(cx, cy, ringR, t);
  const nx = Math.cos(t);
  const ny = Math.sin(t);
  const span = Math.abs(endX - start.x);
  // The control point never rises above the ring's top, so the rib stays under the crown.
  const c1 = { x: start.x + nx * span * pull, y: Math.max(cy - ringR, start.y + ny * span * pull) };
  const c2 = { x: endX - side * span * 0.45, y: endY };
  return `M${p(start.x, start.y)}C${p(c1.x, c1.y)} ${p(c2.x, c2.y)} ${p(endX, endY)}`;
}

/**
 * Corner curl: leaves the edge rail's side heading down and sweeps inward to merge tangentially
 * into the content rail's top, enclosing a glass pocket in the corner of the header band.
 */
function cornerCurl(edgeX: number, edgeY: number, topX: number, topY: number, sx: number): string {
  const ky = Math.abs(topY - edgeY) * 0.9;
  const kx = Math.abs(topX - edgeX) * 0.55;
  return `M${p(edgeX, edgeY)}C${p(edgeX, edgeY + ky)} ${p(topX - sx * kx, topY)} ${p(topX, topY)}`;
}

/** Star or diamond node polygon at `(cx, cy)`. */
function nodePath(style: TubeNodeStyle, cx: number, cy: number, r: number): string {
  const points = style === 'star6' ? 6 : 4;
  const inner = style === 'diamond' ? r * 0.62 : r * 0.3;
  const stretchX = style === 'diamond' ? 1.6 : 1.9;
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r : inner;
    const horizontal = Math.abs(Math.cos(a)) > 0.9 ? stretchX : 1;
    pts.push(p(cx + Math.cos(a) * rr * horizontal, cy + Math.sin(a) * rr));
  }
  return `M${pts.join('L')}Z`;
}

/** Double-pointed lens (teardrop pair) along x, used where dividers meet the side rails. */
function lensPath(cx: number, cy: number, halfLength: number, halfWidth: number): string {
  return (
    `M${p(cx - halfLength, cy)}Q${p(cx, cy - halfWidth * 2)} ${p(cx + halfLength, cy)}` +
    `Q${p(cx, cy + halfWidth * 2)} ${p(cx - halfLength, cy)}Z`
  );
}

/** S-curve between two points, leaving and arriving horizontally. */
function sCurve(x0: number, y0: number, x1: number, y1: number): string {
  const k = (x1 - x0) * 0.55;
  return `C${p(x0 + k, y0)} ${p(x1 - k, y1)} ${p(x1, y1)}`;
}

/**
 * Dendritic connector: a trunk whiplashes out of the side rail, then splits recursively. Each split
 * leaves tangent to its parent (horizontal), so every junction is a soft merge, and the seed picks
 * where each group divides, giving asymmetric multi-tier venation.
 */
function connectorPaths(
  rng: ISigilRng,
  sideX: number,
  targets: readonly ITubeRect[],
  tw: number,
): string[] {
  if (targets.length === 0) return [];
  const sorted = [...targets].sort((a, b) => a.y - b.y);
  const ends = sorted.map((t) => ({ x: t.x, y: t.y + t.height / 2 }));
  const minTargetX = Math.min(...ends.map((e) => e.x));
  const reach = minTargetX - sideX;
  const meanY = ends.reduce((s, e) => s + e.y, 0) / ends.length;
  const trunkY = meanY + rng.range(-0.25, 0.25) * (ends.at(-1)!.y - ends[0].y);
  const paths: string[] = [];
  // Trunk leaves the rail with a whiplash from above, like `cyber (1)`.
  const lift = tw * rng.range(5, 9);
  const jx = sideX + reach * rng.range(0.38, 0.5);
  paths.push(
    `M${p(sideX, trunkY - lift)}C${p(sideX, trunkY - lift * 0.2)} ${p(sideX + lift * 0.6, trunkY)} ${p(sideX + lift * 1.4, trunkY)}H${f(jx)}`,
  );

  const split = (x: number, y: number, group: { x: number; y: number }[]): void => {
    if (group.length === 1) {
      paths.push(`M${p(x, y)}${sCurve(x, y, group[0].x, group[0].y)}`);
      return;
    }
    const cut = rng.int(1, group.length - 1);
    for (const sub of [group.slice(0, cut), group.slice(cut)]) {
      if (sub.length === 1) {
        paths.push(`M${p(x, y)}${sCurve(x, y, sub[0].x, sub[0].y)}`);
        continue;
      }
      const subY = sub.reduce((s, e) => s + e.y, 0) / sub.length;
      const subX = x + (minTargetX - x) * rng.range(0.35, 0.55);
      paths.push(`M${p(x, y)}${sCurve(x, y, subX, subY)}`);
      split(subX, subY, sub);
    }
  };
  split(jx, trunkY, ends);
  return paths;
}

/**
 * Builds the full window chrome for a measured layout. Same seed and layout give the same frame;
 * a new layout re-fits every rail while keeping the seed's ornament choices.
 */
export function buildTubeWindow(layout: ITubeLayout): ITubeScene {
  const rng = createSigilRng(layout.seed);
  const ornament = rng.fork('ornament');
  const tw =
    layout.tubeWidth ??
    Math.min(MAX_TUBE_WIDTH, Math.max(MIN_TUBE_WIDTH, layout.width * TUBE_WIDTH_PER_WIDTH));
  const W = layout.width;
  const H = layout.height;
  const e = tw * EDGE_INSET_TUBES;
  const inset = tw * CONTENT_INSET_TUBES;
  const edgeR = tw * EDGE_RADIUS_TUBES;
  const contentR = tw * CONTENT_RADIUS_TUBES;
  const header = layout.headerHeight;
  const cx = W / 2;
  const ringR = Math.min(
    W * MEDALLION_MAX_WIDTH_RATIO,
    header * MEDALLION_RADIUS_RATIO * ornament.range(0.9, 1.08),
  );
  const cy = header * MEDALLION_CENTRE_RATIO;
  const gap = tw * CRADLE_GAP_TUBES;

  const cornerStyle = ornament.pick<TubeCornerStyle>(['curl', 'double', 'plain', 'curl']);
  const nodeStyle = ornament.pick<TubeNodeStyle>(['star4', 'diamond', 'star6']);
  const ribCount = ornament.int(1, 3);

  const tubes: ITube[] = [];
  const nodes: string[] = [];
  const glass: string[] = [];
  const edgeRect = { x: e, y: e, width: W - 2 * e, height: H - 2 * e };
  tubes.push({ d: roundedRectPath(edgeRect, edgeR), width: tw });

  // Content rail, split into panels at each divider.
  const dividers = [...(layout.dividers ?? [])].sort((a, b) => a - b);
  const halfGap = tw * DIVIDER_HALF_GAP_TUBES;
  const nodeR = tw * NODE_RADIUS_TUBES;
  const bow = (depth: number) => ({ cx, depth, half: nodeR * 4.2 });
  const tops = [header, ...dividers.map((d) => d + halfGap)];
  const bottoms = [...dividers.map((d) => d - halfGap), H - inset];
  const panelPaths: string[] = [];
  for (let i = 0; i < tops.length; i++) {
    const d = panelPath({
      left: inset,
      right: W - inset,
      top: tops[i],
      bottom: bottoms[i],
      radius: Math.min(contentR, (bottoms[i] - tops[i]) / 2),
      cradle: i === 0 ? { cx, cy, ringR, gap } : null,
      topBow: i > 0 ? bow(-(halfGap - nodeR * 0.55)) : null,
      bottomBow: i < tops.length - 1 ? bow(halfGap - nodeR * 0.55) : null,
    });
    panelPaths.push(d);
    tubes.push({ d, width: tw });
  }
  for (const dy of dividers) {
    nodes.push(nodePath(nodeStyle, cx, dy, nodeR));
    // Lenses bridge the panel gap to the edge rail on both sides.
    const lensHalf = (inset - e) * 0.5 + tw;
    nodes.push(lensPath((inset + e) / 2, dy, lensHalf, tw * 0.9));
    nodes.push(lensPath(W - (inset + e) / 2, dy, lensHalf, tw * 0.9));
  }

  // Medallion ring and whiplash ribs.
  const ringWidth = tw * 1.4;
  tubes.push({
    d: `M${p(cx - ringR, cy)}A${f(ringR)} ${f(ringR)} 0 1 0 ${p(cx + ringR, cy)}A${f(ringR)} ${f(ringR)} 0 1 0 ${p(cx - ringR, cy)}Z`,
    width: ringWidth,
  });
  const ribThetas = [Math.PI + 0.2, Math.PI + 0.55, Math.PI + 0.95];
  for (let i = 0; i < ribCount; i++) {
    const theta = ribThetas[i] + ornament.range(-0.08, 0.08);
    // Alternate landing: first rib merges into the content rail, later ones into the edge rail.
    const landsOnContent = i === 0;
    // Reach is measured outward from the ring, so ribs always sweep sideways, never inward.
    const room = Math.max(ringR * 0.5, cx - ringR - inset - contentR);
    const span =
      ringR + room * (landsOnContent ? ornament.range(0.35, 0.55) : ornament.range(0.6, 0.9));
    const endY = landsOnContent ? header : e;
    const pull = ornament.range(0.25, 0.5);
    for (const side of [-1, 1] as const) {
      tubes.push({
        d: ribPath(cx, cy, ringR, theta, cx + side * span, endY, pull, side),
        width: tw * (landsOnContent ? 0.9 : 0.75),
      });
    }
  }

  // Corner curls in the top band.
  if (cornerStyle !== 'plain') {
    const curls = cornerStyle === 'double' ? [0.25, 0.6] : [ornament.range(0.25, 0.45)];
    const room = Math.max(0, cx - ringR * 1.7 - inset - contentR);
    for (const reach of curls) {
      const edgeY = e + edgeR * 0.6;
      const topX = inset + contentR + room * reach;
      tubes.push({ d: cornerCurl(e, edgeY, topX, header, 1), width: tw * 0.8 });
      tubes.push({ d: cornerCurl(W - e, edgeY, W - topX, header, -1), width: tw * 0.8 });
    }
  }

  // Glass band: everything between the edge rail and the panels.
  glass.push(roundedRectPath(edgeRect, edgeR) + panelPaths.join(''));

  const fineTubes: ITube[] = [];
  const fine = tw * FINE_TUBE_RATIO;
  for (const pill of layout.pills ?? [])
    fineTubes.push({ d: roundedRectPath(pill, pill.height / 2), width: fine * 1.2 });
  for (const card of layout.cards ?? [])
    fineTubes.push({ d: roundedRectPath(card, Math.min(10, card.height / 4)), width: fine });

  for (const d of connectorPaths(rng.fork('connector'), inset, layout.connectorTargets ?? [], tw)) {
    tubes.push({ d, width: tw * 0.85 });
  }

  const overhang = Math.max(0, ringR + ringWidth / 2 - cy);
  return { tubes, fineTubes, glass, nodes, medallion: { cx, cy, r: ringR }, overhang };
}
