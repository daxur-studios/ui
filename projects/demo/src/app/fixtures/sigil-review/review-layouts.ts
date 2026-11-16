import type { ITubeLayout, ITubeRect } from '../../../../../ui/src/lib/sigil/sigil-tube-kit';
import type { IReviewBox } from './review-types';

/** A frame layout without its seed; the subject adds the seed per cell. */
export type ReviewFrameLayout = Omit<ITubeLayout, 'seed'>;

/** Header band height of the desktop window, matching the chrome kit spike. */
const DESKTOP_HEADER = 74;
/** Header band height of the phone window, matching the chrome kit spike. */
const PHONE_HEADER = 104;
/** Widest the desktop content column grows before it centres. */
const DESKTOP_MAX_CONTENT = 820;
/** Left padding inside the desktop column, leaving room for the medallion ribs. */
const DESKTOP_LEFT_PAD = 180;
/** Right padding inside the desktop column. */
const DESKTOP_RIGHT_PAD = 24;
/** Side padding of the phone column. */
const PHONE_SIDE_PAD = 24;
/** Gap between the header band and the search pill. */
const PILL_TOP_GAP = 16;
/** Height of the search pill. */
const PILL_HEIGHT = 40;
/** Space taken by the page title between the pill and the first section heading. */
const TITLE_BLOCK = 76;
/** Space taken by one section heading above a row group. */
const SECTION_BLOCK = 48;
/** Height of one card row. */
const ROW_HEIGHT = 48;
/** Gap between stacked card rows. */
const ROW_GAP = 8;
/** Padding inside the phone's grouped card. */
const GROUP_PAD = 8;
/** Height of the divider slot between phone panels. */
const DIVIDER_HEIGHT = 28;
/** Space kept below the last row. */
const BOTTOM_PAD = 24;
/** Smallest frame height, so short content still shows the whole frame. */
const MIN_FRAME_HEIGHT = 640;
/** How far ornament must stay out of a card or pill, in CSS pixels. */
const KEEP_OUT_INSET = 6;
/** Rows in the phone's grouped card. */
const GROUP_ROWS = 3;
/** Rows below the divider in the phone layout. */
const PHONE_TAIL_ROWS = 3;

/** Rect helper. */
function rect(x: number, y: number, width: number, height: number): ITubeRect {
  return { x, y, width, height };
}

/**
 * Desktop window layout for a given frame width: a search pill and five card rows, the first three
 * feeding the connector. Pure; the numbers mirror the chrome kit spike's content.
 */
export function desktopLayout(width: number): ReviewFrameLayout {
  const column = Math.min(width, DESKTOP_MAX_CONTENT);
  const gutter = (width - column) / 2;
  const left = gutter + DESKTOP_LEFT_PAD;
  const rowWidth = gutter + column - DESKTOP_RIGHT_PAD - left;
  const pillTop = DESKTOP_HEADER + PILL_TOP_GAP;
  const pills = [rect(left, pillTop, rowWidth, PILL_HEIGHT)];

  const firstTop = pillTop + PILL_HEIGHT + TITLE_BLOCK + SECTION_BLOCK;
  const cards: ITubeRect[] = [rect(left, firstTop, rowWidth, ROW_HEIGHT)];
  let top = firstTop + ROW_HEIGHT + ROW_GAP + SECTION_BLOCK;
  for (let i = 0; i < 4; i++) {
    cards.push(rect(left, top, rowWidth, ROW_HEIGHT));
    top += ROW_HEIGHT + ROW_GAP;
  }
  return {
    width,
    height: Math.max(MIN_FRAME_HEIGHT, top + BOTTOM_PAD),
    headerHeight: DESKTOP_HEADER,
    pills,
    cards,
    connectorTargets: cards.slice(0, 3),
  };
}

/**
 * Phone window layout for a given frame width: a search pill, a grouped card of three rows, a
 * divider, then three more rows. Pure; mirrors the chrome kit spike's phone content.
 */
export function phoneLayout(width: number): ReviewFrameLayout {
  const left = PHONE_SIDE_PAD;
  const rowWidth = width - PHONE_SIDE_PAD * 2;
  const pillTop = PHONE_HEADER + PILL_TOP_GAP;
  const pills = [rect(left, pillTop, rowWidth, PILL_HEIGHT)];

  const groupTop = pillTop + PILL_HEIGHT + TITLE_BLOCK + SECTION_BLOCK;
  const innerHeight = GROUP_ROWS * ROW_HEIGHT + (GROUP_ROWS - 1) * ROW_GAP;
  const groupHeight = innerHeight + GROUP_PAD * 2;
  const cards: ITubeRect[] = [rect(left, groupTop, rowWidth, groupHeight)];
  for (let i = 0; i < GROUP_ROWS; i++) {
    cards.push(
      rect(
        left + GROUP_PAD,
        groupTop + GROUP_PAD + i * (ROW_HEIGHT + ROW_GAP),
        rowWidth - GROUP_PAD * 2,
        ROW_HEIGHT,
      ),
    );
  }
  const dividerTop = groupTop + groupHeight;
  let top = dividerTop + DIVIDER_HEIGHT;
  for (let i = 0; i < PHONE_TAIL_ROWS; i++) {
    cards.push(rect(left, top, rowWidth, ROW_HEIGHT));
    top += ROW_HEIGHT + ROW_GAP;
  }
  return {
    width,
    height: Math.max(MIN_FRAME_HEIGHT, top + BOTTOM_PAD),
    headerHeight: PHONE_HEADER,
    pills,
    cards,
    dividers: [dividerTop + DIVIDER_HEIGHT / 2],
  };
}

/** Boxes ornament must stay out of: every pill and card, shrunk by the keep-out inset. */
export function keepOutBoxes(layout: ReviewFrameLayout): IReviewBox[] {
  return [...(layout.pills ?? []), ...(layout.cards ?? [])].map((r) => ({
    x: r.x + KEEP_OUT_INSET,
    y: r.y + KEEP_OUT_INSET,
    width: Math.max(0, r.width - KEEP_OUT_INSET * 2),
    height: Math.max(0, r.height - KEEP_OUT_INSET * 2),
  }));
}
