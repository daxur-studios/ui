import { describe, expect, it } from 'vitest';
import { desktopLayout, keepOutBoxes, leafRects, phoneLayout } from './review-layouts';

const WIDTHS = [320, 390, 480, 760, 1100] as const;

describe('canned review layouts', () => {
  for (const [name, build] of [
    ['desktop', desktopLayout],
    ['phone', phoneLayout],
  ] as const) {
    it(`${name}: every box sits inside the frame and below the header`, () => {
      for (const width of WIDTHS) {
        const layout = build(width);
        expect(layout.width).toBe(width);
        for (const r of [...(layout.pills ?? []), ...(layout.cards ?? [])]) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.width).toBeLessThanOrEqual(width);
          expect(r.y).toBeGreaterThanOrEqual(layout.headerHeight);
          expect(r.y + r.height).toBeLessThanOrEqual(layout.height);
          expect(r.width).toBeGreaterThan(0);
        }
      }
    });

    it(`${name}: is a pure function of width`, () => {
      expect(build(390)).toEqual(build(390));
    });
  }

  it('desktop: connector targets are cards, and rows do not overlap', () => {
    const layout = desktopLayout(1100);
    expect(layout.connectorTargets).toHaveLength(3);
    for (const target of layout.connectorTargets ?? []) {
      expect(layout.cards).toContainEqual(target);
    }
    const cards = layout.cards ?? [];
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i].y).toBeGreaterThanOrEqual(cards[i - 1].y + cards[i - 1].height);
    }
  });

  it('desktop: the column stops growing and centres on wide frames', () => {
    const wide = desktopLayout(1400);
    const mid = desktopLayout(1100);
    expect(wide.cards?.[0].width).toBe(mid.cards?.[0].width);
    expect(wide.cards?.[0].x).toBeGreaterThan(mid.cards?.[0].x ?? 0);
  });

  it('phone: one divider sits between the group and the tail rows', () => {
    const layout = phoneLayout(390);
    expect(layout.dividers).toHaveLength(1);
    const divider = layout.dividers?.[0] ?? 0;
    const cards = layout.cards ?? [];
    const group = cards[0];
    expect(divider).toBeGreaterThan(group.y + group.height);
    expect(divider).toBeLessThan(cards[4].y);
    expect(layout.connectorTargets).toBeUndefined();
  });

  it('leafRects drops a card that contains other cards', () => {
    const layout = phoneLayout(390);
    const all = [...(layout.pills ?? []), ...(layout.cards ?? [])];
    const leaves = leafRects(all);
    expect(leaves).toHaveLength(all.length - 1);
    expect(leaves).not.toContainEqual(layout.cards?.[0]);
    expect(leafRects(desktopLayout(1100).cards ?? [])).toHaveLength(5);
  });

  it('keep-out boxes are the leaf cards and pills shrunk inward', () => {
    const layout = phoneLayout(390);
    const boxes = keepOutBoxes(layout);
    expect(boxes).toHaveLength((layout.pills?.length ?? 0) + (layout.cards?.length ?? 0) - 1);
    const pill = layout.pills?.[0];
    expect(boxes[0].x).toBeGreaterThan(pill?.x ?? 0);
    expect(boxes[0].width).toBeLessThan(pill?.width ?? 0);
  });
});
