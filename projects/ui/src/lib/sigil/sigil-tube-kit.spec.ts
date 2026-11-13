import { describe, expect, it } from 'vitest';
import { buildTubeWindow, roundedRectPath, type ITubeLayout } from './sigil-tube-kit';

const layout: ITubeLayout = {
  width: 1000,
  height: 640,
  headerHeight: 74,
  dividers: [400],
  pills: [{ x: 300, y: 90, width: 500, height: 40 }],
  cards: [
    { x: 300, y: 200, width: 500, height: 48 },
    { x: 300, y: 260, width: 500, height: 48 },
    { x: 300, y: 320, width: 500, height: 48 },
  ],
  connectorTargets: [
    { x: 300, y: 200, width: 500, height: 48 },
    { x: 300, y: 260, width: 500, height: 48 },
    { x: 300, y: 320, width: 500, height: 48 },
  ],
  seed: 4,
};

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('buildTubeWindow', () => {
  it('is deterministic for a seed and layout', () => {
    expect(buildTubeWindow(layout)).toEqual(buildTubeWindow(layout));
  });

  it('frames every field and card with a fine tube', () => {
    expect(buildTubeWindow(layout).fineTubes).toHaveLength(4);
  });

  it('adds a node and two side lenses per divider', () => {
    expect(buildTubeWindow(layout).nodes).toHaveLength(3);
  });

  it('feeds every connector target', () => {
    const scene = buildTubeWindow(layout);
    const ends = scene.tubes
      .map((t) => numbers(t.d).slice(-2))
      .filter(([x, y]) => x === 300 && [224, 284, 344].includes(y));
    expect(ends).toHaveLength(3);
  });

  it('keeps every coordinate finite and roughly inside the frame', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const scene = buildTubeWindow({ ...layout, seed });
      for (const t of [...scene.tubes, ...scene.fineTubes]) {
        for (const n of numbers(t.d)) {
          expect(Number.isFinite(n)).toBe(true);
          expect(n).toBeGreaterThan(-200);
          expect(n).toBeLessThan(1200);
        }
      }
    }
  });

  it('varies ornament across seeds but not the rails', () => {
    const a = buildTubeWindow({ ...layout, seed: 1 });
    const b = buildTubeWindow({ ...layout, seed: 2 });
    expect(a.tubes[0]).toEqual(b.tubes[0]);
    expect(a.tubes.map((t) => t.d).join()).not.toBe(b.tubes.map((t) => t.d).join());
  });

  it('caps the medallion on narrow windows', () => {
    const scene = buildTubeWindow({ ...layout, width: 390, headerHeight: 104 });
    expect(scene.medallion.r).toBeLessThanOrEqual(390 * 0.15);
  });
});

describe('roundedRectPath', () => {
  it('clamps the radius to half the shortest side', () => {
    expect(roundedRectPath({ x: 0, y: 0, width: 100, height: 20 }, 50)).toContain('A10 10');
  });
});
