import {
  generateBladeSigil,
  type BladeSigilLayout,
} from '../../../../../ui/src/lib/sigil/sigil-blade';
import { buildTubeWindow } from '../../../../../ui/src/lib/sigil/sigil-tube-kit';
import { desktopLayout, keepOutBoxes, phoneLayout, type ReviewFrameLayout } from './review-layouts';
import type { IReviewGeometry, IReviewInk, IReviewSubject } from './review-types';

/** Aspect used for square motifs: crest and starburst. */
const SQUARE_SIZE = 240;
/** Width of the wingspan motif cell. */
const WINGSPAN_WIDTH = 320;
/** Height of the wingspan motif cell. */
const WINGSPAN_HEIGHT = 200;
/** Width of the runner motif cell. */
const RUNNER_WIDTH = 480;
/** Height of the runner motif cell. */
const RUNNER_HEIGHT = 140;

/** Desktop frame widths reviewed: a narrow laptop and a wide screen. */
const DESKTOP_WIDTHS = [760, 1100] as const;
/** Phone frame widths reviewed: small, common and large. */
const PHONE_WIDTHS = [320, 390, 480] as const;

/** Builds one blade motif subject for a forced layout. */
function bladeSubject(
  layout: BladeSigilLayout,
  width: number,
  height: number,
  references: readonly string[],
): IReviewSubject {
  return {
    id: `blade-${layout}`,
    kind: 'motif',
    label: `Blade sigil, ${layout}`,
    references,
    widths: [width],
    heightFor: () => height,
    geometry(seed): IReviewGeometry {
      const sigil = generateBladeSigil({ seed, width, height, layout });
      return { width, height, ink: [{ d: sigil.d }] };
    },
  };
}

/** Builds one tube frame subject from a canned layout function. */
function tubeSubject(
  id: string,
  label: string,
  references: readonly string[],
  widths: readonly number[],
  layoutFor: (width: number) => ReviewFrameLayout,
  dressedVariant: 'desktop' | 'phone',
): IReviewSubject {
  return {
    dressedVariant,
    id,
    kind: 'frame',
    label,
    references,
    widths,
    heightFor: (width) => layoutFor(width).height,
    geometry(seed, width): IReviewGeometry {
      const layout = layoutFor(width);
      const scene = buildTubeWindow({ ...layout, seed });
      const ink: IReviewInk[] = [
        ...[...scene.tubes, ...scene.fineTubes].map((t) => ({ d: t.d, strokeWidth: t.width })),
        ...scene.nodes.map((d) => ({ d })),
      ];
      return {
        width: layout.width,
        height: layout.height,
        headroom: scene.overhang,
        ink,
        keepOut: keepOutBoxes(layout),
      };
    },
  };
}

/** Every subject the harness can review, in command-line order. */
export const REVIEW_SUBJECTS: readonly IReviewSubject[] = [
  bladeSubject('crest', SQUARE_SIZE, SQUARE_SIZE, [
    'cycbersigil-concept (6).jpg',
    'cycbersigil-concept (7).jpg',
  ]),
  bladeSubject('wingspan', WINGSPAN_WIDTH, WINGSPAN_HEIGHT, [
    'cycbersigil-concept (6).jpg',
    'cycbersigil-concept (7).jpg',
  ]),
  bladeSubject('starburst', SQUARE_SIZE, SQUARE_SIZE, ['cycbersigil-concept (7).jpg']),
  bladeSubject('runner', RUNNER_WIDTH, RUNNER_HEIGHT, ['cycbersigil-concept (1).jpg']),
  tubeSubject(
    'tube-window-desktop',
    'Tube window, desktop',
    ['cyber (1).jpg'],
    DESKTOP_WIDTHS,
    desktopLayout,
    'desktop',
  ),
  tubeSubject(
    'tube-window-phone',
    'Tube window, phone',
    ['cyber (3).jpg'],
    PHONE_WIDTHS,
    phoneLayout,
    'phone',
  ),
];

/** Finds a subject by id, or `undefined`. */
export function findReviewSubject(id: string): IReviewSubject | undefined {
  return REVIEW_SUBJECTS.find((s) => s.id === id);
}
