import {
  composeFiligreeCrest,
  composeModularUiJoin,
  composeWingedStar,
  crescentBranchShapes,
  cubicPoint,
  cubicTangent,
  normalizeSigilParams,
  outlinePoints,
  shapesToPath,
  solid,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilGeometry,
  type ISigilLabParams,
  type ISigilSpine,
} from './sigil-math';
import type { ISigilStrategy } from './sigil-strategies';

/** Seed is optional so existing callers and strategies continue to work unchanged. */
export type SeededSigilParams = ISigilLabParams & { readonly seed?: number };

/** Bounded proportions keep seeded branches within the tendril's sweeping composition. */
const GROWTH = {
  startX: 24,
  endX: 451,
  centreY: 135,
  endRise: 31,
  controlFirstX: 148,
  controlSecondX: 312,
  bendBase: 34,
  bendGain: 42,
  seedBend: 30,
  seedEnd: 30,
  width: 15,
  widthGain: 14,
  widthPower: 0.7,
  loopWidth: 5,
  loopStart: 0.15,
  loopEnd: 0.57,
  lowerStart: 0.38,
  lowerEnd: 0.79,
  loopShift: 0.09,
  loopHeight: 52,
  loopHeightGain: 31,
  seedHeight: 27,
  branchStart: 0.18,
  branchSpan: 0.57,
  branchJitter: 0.045,
  branchLength: 38,
  branchGain: 39,
  branchVariation: 25,
  forward: 0.65,
  terminal: 0.78,
  terminalReach: 83,
  terminalSpread: 65,
  terminalWidth: 12,
} as const;

/** Stable indexed hash, so one parameter change never reshuffles later decisions. */
function variation(seed: number, index: number): number {
  let value = (seed | 0) ^ Math.imul(index + 1, 0x9e3779b9);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

/** A pointed vein reconnects to the main spine and preserves an open crescent. */
function loop(spine: ISigilSpine, start: number, end: number, height: number) {
  const from = cubicPoint(spine, start);
  const to = cubicPoint(spine, end);
  const arc: ISigilSpine = {
    p0: from,
    p1: { x: from.x + (to.x - from.x) * 0.18, y: from.y + height },
    p2: { x: from.x + (to.x - from.x) * 0.72, y: to.y + height },
    p3: to,
  };
  return solid(outlinePoints(arc, (t) => GROWTH.loopWidth * Math.sin(Math.PI * t)));
}

/** Generates a seeded spine, two open sweeps, and tapered crescent-joined branches. */
function composeSeededTendril(raw: SeededSigilParams): ISigilGeometry {
  const p = normalizeSigilParams(raw);
  const seed = Number.isFinite(raw.seed) ? Math.trunc(raw.seed!) : 0;
  const pick = (index: number) => variation(seed, index);
  const bend = GROWTH.bendBase + p.curvature * GROWTH.bendGain;
  const spine: ISigilSpine = {
    p0: { x: GROWTH.startX, y: GROWTH.centreY + GROWTH.endRise },
    p1: { x: GROWTH.controlFirstX, y: GROWTH.centreY - bend - pick(0) * GROWTH.seedBend },
    p2: { x: GROWTH.controlSecondX, y: GROWTH.centreY + bend + pick(1) * GROWTH.seedBend },
    p3: {
      x: GROWTH.endX,
      y: GROWTH.centreY - GROWTH.endRise + (pick(2) - 0.5) * GROWTH.seedEnd * (0.5 + p.asymmetry),
    },
  };
  const width = GROWTH.width + p.swell * GROWTH.widthGain;
  const shift = (pick(3) - 0.5) * GROWTH.loopShift;
  const loopHeight = GROWTH.loopHeight + p.curvature * GROWTH.loopHeightGain;
  const shapes = [
    solid(outlinePoints(spine, (t) => width * Math.pow(Math.sin(Math.PI * t), GROWTH.widthPower))),
    loop(
      spine,
      GROWTH.loopStart + shift,
      GROWTH.loopEnd + shift,
      -(loopHeight + pick(4) * GROWTH.seedHeight),
    ),
    loop(
      spine,
      GROWTH.lowerStart - shift,
      GROWTH.lowerEnd - shift,
      loopHeight + pick(5) * GROWTH.seedHeight,
    ),
  ];
  for (let i = 0; i < p.thornCount; i++) {
    const t =
      GROWTH.branchStart +
      (GROWTH.branchSpan * (i + 0.5)) / p.thornCount +
      (pick(10 + i) - 0.5) * GROWTH.branchJitter;
    const junction = cubicPoint(spine, t);
    const side = (i + (pick(20) < 0.5 ? 0 : 1)) % 2 === 0 ? -1 : 1;
    const length =
      GROWTH.branchLength +
      p.spikeLength * GROWTH.branchGain +
      pick(30 + i) * GROWTH.branchVariation;
    shapes.push(
      ...crescentBranchShapes({
        junction,
        direction: cubicTangent(spine, t),
        tip: {
          x: junction.x + length * GROWTH.forward,
          y: junction.y + side * length * (0.65 + pick(40 + i) * 0.35),
        },
        bend: side * (0.25 + p.curvature * 0.75),
        baseWidth: GROWTH.terminalWidth,
        parentWidth: width * Math.pow(Math.sin(Math.PI * t), GROWTH.widthPower),
        swell: p.swell,
        crescentDepth: p.crescentDepth,
      }),
    );
  }
  const root = cubicPoint(spine, GROWTH.terminal);
  for (const side of [-1, 1]) {
    shapes.push(
      ...crescentBranchShapes({
        junction: root,
        direction: cubicTangent(spine, GROWTH.terminal),
        tip: {
          x: root.x + GROWTH.terminalReach,
          y:
            root.y +
            side *
              (GROWTH.terminalSpread +
                p.spikeLength * GROWTH.branchGain +
                pick(side + 51) * GROWTH.seedHeight),
        },
        bend: side * p.curvature,
        baseWidth: GROWTH.terminalWidth,
        parentWidth: width,
        swell: p.swell,
        crescentDepth: p.crescentDepth,
      }),
    );
  }
  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/** A reproducible generative tendril alongside the baseline's remaining archetypes. */
export const SIGIL_SEEDED_GROWTH_STRATEGY: ISigilStrategy = {
  id: 'seeded-growth',
  label: 'Seeded Growth',
  star: composeWingedStar,
  crest: composeFiligreeCrest,
  tendril: composeSeededTendril,
  join: composeModularUiJoin,
};
