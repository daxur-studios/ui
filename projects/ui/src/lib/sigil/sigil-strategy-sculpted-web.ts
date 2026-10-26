import {
  composeModularUiJoin,
  cubicPoint,
  hole,
  normalizeSigilParams,
  mirrorShapes,
  starEyeShapes,
  shapesToPath,
  solid,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilGeometry,
  type ISigilLabParams,
  type ISigilPoint,
  type ISigilSpine,
} from './sigil-math';
import type { ISigilStrategy } from './sigil-strategies';

/** Samples per cubic segment; keeps the authored silhouette smooth at lab scale. */
const CONTOUR_SAMPLES = 16;
/** Neutral knob setting used by the authored contours. */
const NEUTRAL = 0.5;
/** Vertical midpoint for controlled variation of the whole silhouette. */
const MIDLINE = 135;
/** Maximum vertical expansion contributed by curvature and spike length. */
const VERTICAL_GAIN = 0.16;
/** Maximum displacement of the inner openings from swell and crescent depth. */
const OPENING_GAIN = 0.12;
/** Maximum horizontal displacement from the asymmetry knob. */
const ASYMMETRY_GAIN = 8;

/** Cubic segments defined by their starting point and subsequent control/control/end triples. */
type Contour = {
  readonly start: ISigilPoint;
  readonly segments: readonly (readonly [ISigilPoint, ISigilPoint, ISigilPoint])[];
};

/** One connected outer contour, with the long left hook, lower sweep and terminal prongs. */
const OUTER: Contour = {
  start: { x: 20, y: 230 },
  segments: [
    [
      { x: 26, y: 172 },
      { x: 49, y: 162 },
      { x: 66, y: 143 },
    ],
    [
      { x: 76, y: 132 },
      { x: 67, y: 123 },
      { x: 57, y: 128 },
    ],
    [
      { x: 45, y: 131 },
      { x: 33, y: 146 },
      { x: 20, y: 139 },
    ],
    [
      { x: 42, y: 145 },
      { x: 52, y: 101 },
      { x: 76, y: 108 },
    ],
    [
      { x: 88, y: 112 },
      { x: 76, y: 127 },
      { x: 100, y: 113 },
    ],
    [
      { x: 115, y: 105 },
      { x: 122, y: 103 },
      { x: 128, y: 90 },
    ],
    [
      { x: 130, y: 100 },
      { x: 146, y: 86 },
      { x: 151, y: 72 },
    ],
    [
      { x: 177, y: 61 },
      { x: 211, y: 69 },
      { x: 239, y: 79 },
    ],
    [
      { x: 207, y: 74 },
      { x: 178, y: 72 },
      { x: 178, y: 84 },
    ],
    [
      { x: 179, y: 95 },
      { x: 201, y: 91 },
      { x: 213, y: 99 },
    ],
    [
      { x: 233, y: 108 },
      { x: 244, y: 101 },
      { x: 257, y: 96 },
    ],
    [
      { x: 250, y: 108 },
      { x: 253, y: 117 },
      { x: 268, y: 114 },
    ],
    [
      { x: 290, y: 111 },
      { x: 302, y: 105 },
      { x: 309, y: 92 },
    ],
    [
      { x: 320, y: 50 },
      { x: 351, y: 35 },
      { x: 383, y: 32 },
    ],
    [
      { x: 347, y: 40 },
      { x: 318, y: 80 },
      { x: 337, y: 94 },
    ],
    [
      { x: 355, y: 111 },
      { x: 407, y: 76 },
      { x: 460, y: 20 },
    ],
    [
      { x: 430, y: 76 },
      { x: 385, y: 112 },
      { x: 361, y: 121 },
    ],
    [
      { x: 344, y: 129 },
      { x: 352, y: 140 },
      { x: 363, y: 134 },
    ],
    [
      { x: 350, y: 149 },
      { x: 326, y: 126 },
      { x: 317, y: 147 },
    ],
    [
      { x: 309, y: 163 },
      { x: 329, y: 170 },
      { x: 342, y: 157 },
    ],
    [
      { x: 355, y: 169 },
      { x: 391, y: 177 },
      { x: 425, y: 158 },
    ],
    [
      { x: 396, y: 182 },
      { x: 365, y: 177 },
      { x: 349, y: 172 },
    ],
    [
      { x: 333, y: 169 },
      { x: 327, y: 181 },
      { x: 330, y: 191 },
    ],
    [
      { x: 333, y: 208 },
      { x: 351, y: 211 },
      { x: 368, y: 199 },
    ],
    [
      { x: 358, y: 220 },
      { x: 323, y: 226 },
      { x: 303, y: 206 },
    ],
    [
      { x: 322, y: 215 },
      { x: 325, y: 196 },
      { x: 317, y: 182 },
    ],
    [
      { x: 309, y: 173 },
      { x: 292, y: 181 },
      { x: 282, y: 163 },
    ],
    [
      { x: 297, y: 173 },
      { x: 312, y: 165 },
      { x: 310, y: 149 },
    ],
    [
      { x: 306, y: 132 },
      { x: 280, y: 128 },
      { x: 263, y: 140 },
    ],
    [
      { x: 247, y: 152 },
      { x: 250, y: 185 },
      { x: 214, y: 202 },
    ],
    [
      { x: 181, y: 217 },
      { x: 144, y: 216 },
      { x: 120, y: 204 },
    ],
    [
      { x: 157, y: 213 },
      { x: 197, y: 206 },
      { x: 220, y: 190 },
    ],
    [
      { x: 239, y: 176 },
      { x: 245, y: 148 },
      { x: 228, y: 137 },
    ],
    [
      { x: 209, y: 125 },
      { x: 188, y: 126 },
      { x: 173, y: 136 },
    ],
    [
      { x: 158, y: 146 },
      { x: 151, y: 150 },
      { x: 133, y: 141 },
    ],
    [
      { x: 151, y: 144 },
      { x: 153, y: 133 },
      { x: 141, y: 126 },
    ],
    [
      { x: 125, y: 116 },
      { x: 113, y: 125 },
      { x: 99, y: 136 },
    ],
    [
      { x: 91, y: 142 },
      { x: 99, y: 151 },
      { x: 107, y: 147 },
    ],
    [
      { x: 95, y: 160 },
      { x: 83, y: 151 },
      { x: 73, y: 160 },
    ],
    [
      { x: 48, y: 177 },
      { x: 32, y: 193 },
      { x: 20, y: 230 },
    ],
  ],
};

/** Tapered openings inside the upper web, deliberately different in size and shape. */
const OPENINGS: readonly Contour[] = [
  {
    start: { x: 146, y: 111 },
    segments: [
      [
        { x: 154, y: 102 },
        { x: 158, y: 93 },
        { x: 163, y: 86 },
      ],
      [
        { x: 154, y: 104 },
        { x: 181, y: 104 },
        { x: 197, y: 113 },
      ],
      [
        { x: 176, y: 108 },
        { x: 169, y: 127 },
        { x: 159, y: 128 },
      ],
      [
        { x: 154, y: 122 },
        { x: 151, y: 115 },
        { x: 146, y: 111 },
      ],
    ],
  },
  {
    start: { x: 183, y: 83 },
    segments: [
      [
        { x: 196, y: 80 },
        { x: 218, y: 83 },
        { x: 230, y: 87 },
      ],
      [
        { x: 216, y: 88 },
        { x: 227, y: 99 },
        { x: 235, y: 102 },
      ],
      [
        { x: 212, y: 98 },
        { x: 190, y: 96 },
        { x: 183, y: 83 },
      ],
    ],
  },
];

/** Samples a closed contour after deforming its points with the lab controls. */
function sampleContour(contour: Contour, params: ISigilLabParams, opening: boolean): ISigilPoint[] {
  const vertical = 1 + (params.curvature + params.spikeLength - 1) * VERTICAL_GAIN;
  const openingScale = opening ? 1 + (params.crescentDepth - params.swell) * OPENING_GAIN : 1;
  const transform = (point: ISigilPoint): ISigilPoint => ({
    x: point.x + ((params.asymmetry - NEUTRAL) * ASYMMETRY_GAIN * (point.y - MIDLINE)) / MIDLINE,
    y: MIDLINE + (point.y - MIDLINE) * vertical * openingScale,
  });
  const points: ISigilPoint[] = [transform(contour.start)];
  let start = contour.start;
  for (const [p1, p2, p3] of contour.segments) {
    const spine: ISigilSpine = { p0: start, p1, p2, p3 };
    for (let index = 1; index <= CONTOUR_SAMPLES; index++) {
      points.push(transform(cubicPoint(spine, index / CONTOUR_SAMPLES)));
    }
    start = p3;
  }
  return points;
}

/** Produces a single sculpted silhouette with deliberately placed negative spaces. */
function composeSculptedTendril(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  return {
    d: shapesToPath([
      solid(sampleContour(OUTER, params, false)),
      ...TENDRIL_THORNS.slice(0, params.thornCount).map((item) =>
        solid(sampleContour(item, params, false)),
      ),
      ...OPENINGS.map((contour) => hole(sampleContour(contour, params, true))),
    ]),
    width: SIGIL_VIEW_WIDTH,
    height: SIGIL_VIEW_HEIGHT,
  };
}

/** Small, progressively added spurs rooted in the upper and lower edges of the web. */
const TENDRIL_THORNS: readonly Contour[] = [
  contour({ x: 111, y: 113 }, [
    [119, 110, 121, 99, 119, 94],
    [126, 101, 126, 109, 125, 113],
    [121, 116, 116, 116, 111, 113],
  ]),
  contour({ x: 201, y: 98 }, [
    [206, 99, 215, 94, 219, 90],
    [217, 98, 214, 101, 211, 103],
    [207, 102, 204, 100, 201, 98],
  ]),
  contour({ x: 284, y: 112 }, [
    [290, 111, 296, 103, 296, 98],
    [302, 103, 300, 110, 298, 114],
    [293, 116, 288, 115, 284, 112],
  ]),
  contour({ x: 76, y: 145 }, [
    [72, 148, 68, 149, 61, 148],
    [67, 154, 72, 155, 78, 153],
    [80, 150, 79, 148, 76, 145],
  ]),
  contour({ x: 208, y: 196 }, [
    [202, 200, 197, 207, 196, 213],
    [204, 208, 210, 205, 215, 200],
    [213, 198, 210, 197, 208, 196],
  ]),
  contour({ x: 333, y: 170 }, [
    [341, 172, 348, 184, 348, 188],
    [350, 181, 348, 175, 346, 172],
    [342, 169, 338, 168, 333, 170],
  ]),
];

/** Centre of the shared canvas and the crest's bilateral axis. */
const CENTRE_X = SIGIL_VIEW_WIDTH / 2;
/** Centre of the eye in the winged star composition. */
const STAR_CENTRE = { x: 240, y: 112 };
/** Radius of the star's needle-like eye. */
const STAR_RADIUS = 43;

/** A single authored contour from compact cubic control points. */
function contour(
  start: ISigilPoint,
  segments: readonly (readonly [number, number, number, number, number, number])[],
): Contour {
  return {
    start,
    segments: segments.map(([x1, y1, x2, y2, x3, y3]) => [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y3 },
    ]),
  };
}

/** Left crest web: an outer horn, inward-curving branches and a long lower fang. */
const CREST_WING = contour({ x: 240, y: 159 }, [
  [220, 154, 214, 139, 198, 136],
  [179, 135, 178, 124, 177, 109],
  [171, 87, 154, 75, 128, 71],
  [153, 81, 168, 98, 165, 118],
  [159, 132, 145, 117, 142, 105],
  [139, 129, 128, 133, 117, 125],
  [100, 112, 91, 91, 79, 78],
  [63, 62, 41, 72, 15, 53],
  [38, 77, 59, 72, 69, 84],
  [83, 101, 84, 123, 97, 139],
  [75, 132, 58, 110, 46, 91],
  [61, 128, 80, 156, 105, 163],
  [115, 165, 117, 175, 104, 192],
  [119, 181, 123, 171, 130, 164],
  [146, 170, 160, 184, 173, 193],
  [163, 178, 146, 165, 134, 157],
  [141, 148, 157, 148, 167, 153],
  [180, 159, 178, 172, 175, 188],
  [181, 173, 190, 165, 198, 171],
  [211, 180, 206, 198, 201, 220],
  [213, 200, 216, 177, 226, 169],
  [231, 166, 235, 165, 240, 169],
  [240, 166, 240, 162, 240, 159],
]);

/** Narrow centre, crown and pendant anchor the crest's open wings. */
const CREST_AXIS = contour({ x: 240, y: 22 }, [
  [245, 38, 246, 44, 243, 52],
  [248, 66, 249, 78, 245, 91],
  [252, 106, 249, 119, 245, 130],
  [249, 141, 250, 153, 246, 163],
  [251, 177, 248, 196, 245, 211],
  [247, 226, 250, 238, 240, 256],
  [230, 238, 233, 226, 235, 211],
  [232, 196, 229, 177, 234, 163],
  [230, 153, 231, 141, 235, 130],
  [231, 119, 228, 106, 235, 91],
  [231, 78, 232, 66, 237, 52],
  [234, 44, 235, 38, 240, 22],
]);

/** Left sweep of the star, including the lower hanging hook. */
const STAR_LEFT = contour({ x: 222, y: 111 }, [
  [189, 109, 147, 111, 117, 102],
  [76, 90, 48, 64, 37, 20],
  [39, 71, 75, 101, 112, 112],
  [126, 116, 125, 128, 113, 132],
  [94, 139, 74, 128, 57, 111],
  [72, 139, 97, 148, 119, 141],
  [132, 136, 145, 130, 153, 138],
  [165, 149, 149, 166, 134, 166],
  [99, 169, 68, 156, 34, 127],
  [57, 160, 87, 176, 116, 177],
  [126, 181, 115, 190, 102, 190],
  [115, 194, 127, 188, 133, 180],
  [147, 182, 161, 169, 168, 158],
  [180, 143, 191, 146, 190, 160],
  [189, 174, 176, 179, 177, 191],
  [178, 206, 187, 212, 196, 212],
  [183, 204, 189, 189, 200, 188],
  [215, 188, 226, 202, 239, 198],
  [221, 199, 211, 176, 195, 178],
  [191, 167, 198, 151, 205, 146],
  [210, 138, 213, 137, 219, 139],
  [214, 128, 216, 117, 222, 111],
]);

/** The star's right wing is intentionally different from the left sweep. */
const STAR_RIGHT = contour({ x: 255, y: 112 }, [
  [282, 108, 307, 108, 329, 95],
  [347, 84, 353, 66, 376, 56],
  [399, 43, 428, 49, 464, 32],
  [445, 52, 416, 52, 395, 61],
  [380, 69, 376, 83, 388, 87],
  [405, 94, 426, 78, 438, 64],
  [428, 89, 410, 107, 390, 101],
  [378, 97, 370, 92, 366, 103],
  [361, 114, 371, 121, 383, 117],
  [370, 129, 352, 118, 343, 126],
  [331, 136, 344, 145, 357, 140],
  [348, 150, 331, 147, 326, 157],
  [322, 168, 335, 170, 345, 164],
  [330, 181, 307, 176, 301, 165],
  [292, 154, 304, 140, 316, 134],
  [300, 140, 289, 143, 280, 136],
  [269, 128, 264, 125, 255, 121],
  [255, 118, 255, 115, 255, 112],
]);

/** Bottom arc ties the star's two sides into the broad, irregular reference silhouette. */
const STAR_LOWER = contour({ x: 189, y: 211 }, [
  [198, 234, 220, 231, 234, 219],
  [248, 205, 255, 215, 268, 218],
  [291, 224, 316, 208, 334, 193],
  [323, 210, 303, 226, 280, 229],
  [267, 230, 265, 239, 270, 246],
  [260, 241, 258, 234, 245, 235],
  [230, 235, 215, 247, 200, 242],
  [186, 238, 181, 226, 189, 211],
]);

/** Build the bilateral crest from an authored framework and central pendant. */
function composeSculptedCrest(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams({ ...raw, asymmetry: NEUTRAL });
  const wing = solid(sampleContour(CREST_WING, params, false));
  return {
    d: shapesToPath([
      wing,
      ...mirrorShapes([wing], CENTRE_X),
      solid(sampleContour(CREST_AXIS, params, false)),
    ]),
    width: SIGIL_VIEW_WIDTH,
    height: SIGIL_VIEW_HEIGHT,
  };
}

/** Build an asymmetric star with distinct upper wings and a lower arc. */
function composeSculptedStar(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const shapes = [STAR_LEFT, STAR_RIGHT, STAR_LOWER].map((item) =>
    solid(sampleContour(item, params, false)),
  );
  return {
    d: shapesToPath([...shapes, ...starEyeShapes(STAR_CENTRE, STAR_RADIUS)]),
    width: SIGIL_VIEW_WIDTH,
    height: SIGIL_VIEW_HEIGHT,
  };
}

/** Art-directed full-canvas silhouettes with the baseline modular join. */
export const SIGIL_SCULPTED_WEB_STRATEGY: ISigilStrategy = {
  id: 'sculpted-web',
  label: 'Sculpted Web',
  star: composeSculptedStar,
  crest: composeSculptedCrest,
  tendril: composeSculptedTendril,
  join: composeModularUiJoin,
};
