import { describe, expect, it } from 'vitest';
import { BLADE_SIGIL_LAYOUTS, buildBlade, generateBladeSigil } from './sigil-blade';

describe('buildBlade', () => {
  const spec = {
    x: 0,
    y: 0,
    heading: 0,
    length: 100,
    width: 10,
    baseTurn: -0.4,
    hookTurn: 1.5,
    bellyT: 0.3,
    rootFraction: 0,
    rootFlare: 0,
    edgeBias: 0.2,
  };

  it('converges to an exact needle tip', () => {
    const blade = buildBlade(spec);
    expect(blade.samples.at(-1)!.width).toBeCloseTo(0, 6);
    expect(blade.samples[0].width).toBeCloseTo(0, 6);
  });

  it('turns by baseTurn + hookTurn along the spine', () => {
    const blade = buildBlade(spec);
    expect(blade.samples.at(-1)!.heading).toBeCloseTo(spec.baseTurn + spec.hookTurn, 3);
  });

  it('peaks near the belly', () => {
    const blade = buildBlade(spec);
    const widest = blade.samples.reduce(
      (best, s, i) => (s.width > blade.samples[best].width ? i : best),
      0,
    );
    expect(widest / (blade.samples.length - 1)).toBeCloseTo(spec.bellyT, 1);
  });
});

describe('generateBladeSigil', () => {
  it('is deterministic per seed', () => {
    const a = generateBladeSigil({ seed: 7, width: 400, height: 220 });
    const b = generateBladeSigil({ seed: 7, width: 400, height: 220 });
    expect(a.d).toBe(b.d);
  });

  it('changes structure between seeds, not only coordinates', () => {
    const counts = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const s = generateBladeSigil({ seed, width: 400, height: 220 });
      counts.add(`${s.layout}:${s.blades.length}`);
    }
    expect(counts.size).toBeGreaterThan(5);
  });

  it.each(BLADE_SIGIL_LAYOUTS)('fits %s inside the box', (layout) => {
    const s = generateBladeSigil({ seed: 3, width: 400, height: 220, layout });
    const coords = [...s.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    expect(coords.length).toBeGreaterThan(50);
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(400.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(220.01);
    }
  });
});
