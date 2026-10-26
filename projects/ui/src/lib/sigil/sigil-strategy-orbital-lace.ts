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
  thornShapes,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilGeometry,
  type ISigilLabParams,
  type ISigilSpine,
} from './sigil-math';
import type { ISigilStrategy } from './sigil-strategies';

/** Proportions of the long spine and its open upper and lower lobes, in canvas units. */
const LACE = {
  spine: {
    p0: { x: 30, y: 185 },
    p1: { x: 150, y: 45 },
    p2: { x: 300, y: 175 },
    p3: { x: 450, y: 90 },
  },
  width: 19,
  curveGain: 32,
  upperStart: 0.24,
  upperEnd: 0.49,
  upperLift: 65,
  lowerStart: 0.38,
  lowerEnd: 0.72,
  lowerDrop: 85,
  loopWidth: 8,
  terminalT: 0.77,
  terminalUpper: { x: 445, y: 20 },
  terminalLower: { x: 430, y: 218 },
  terminalWidth: 15,
  spikeGain: 0.18,
  loopPower: 0.7,
} as const;

/** Makes a pointed arch that rejoins the main vein and leaves a clear opening. */
function lobe(spine: ISigilSpine, start: number, end: number, lift: number, width: number) {
  const from = cubicPoint(spine, start);
  const to = cubicPoint(spine, end);
  const arch: ISigilSpine = {
    p0: from,
    p1: { x: from.x, y: from.y + lift },
    p2: { x: to.x, y: to.y + lift },
    p3: to,
  };
  return solid(outlinePoints(arch, (t) => width * Math.pow(Math.sin(Math.PI * t), LACE.loopPower)));
}

/** Creates a flowing, perforated tendril with a pair of terminal claws. */
function composeLaceTendril(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const spine: ISigilSpine = {
    ...LACE.spine,
    p1: { ...LACE.spine.p1, y: LACE.spine.p1.y - params.curvature * LACE.curveGain },
    p2: { ...LACE.spine.p2, y: LACE.spine.p2.y + params.curvature * LACE.curveGain },
  };
  const junction = cubicPoint(spine, LACE.terminalT);
  const direction = cubicTangent(spine, LACE.terminalT);
  const length = 1 + params.spikeLength * LACE.spikeGain;
  const branch = (tip: { readonly x: number; readonly y: number }, bend: number) =>
    crescentBranchShapes({
      junction,
      direction,
      tip: {
        x: junction.x + (tip.x - junction.x) * length,
        y: junction.y + (tip.y - junction.y) * length,
      },
      bend,
      baseWidth: LACE.terminalWidth,
      parentWidth: LACE.width,
      swell: params.swell,
      crescentDepth: params.crescentDepth,
    });
  const shapes = [
    solid(
      outlinePoints(
        spine,
        (t) =>
          LACE.width *
          Math.pow(Math.sin(Math.PI * t), LACE.loopPower) *
          (1 + params.swell * Math.sin(Math.PI * t)),
      ),
    ),
    lobe(spine, LACE.upperStart, LACE.upperEnd, -LACE.upperLift * length, LACE.loopWidth),
    lobe(spine, LACE.lowerStart, LACE.lowerEnd, LACE.lowerDrop * length, LACE.loopWidth),
    ...thornShapes(spine, params, 0, LACE.width),
    ...branch(LACE.terminalUpper, -params.curvature),
    ...branch(LACE.terminalLower, params.curvature),
  ];
  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/** A perforated tendril study alongside the shipped star, crest and join. */
export const SIGIL_ORBITAL_LACE_STRATEGY: ISigilStrategy = {
  id: 'orbital-lace',
  label: 'Orbital Lace',
  star: composeWingedStar,
  crest: composeFiligreeCrest,
  tendril: composeLaceTendril,
  join: composeModularUiJoin,
};
