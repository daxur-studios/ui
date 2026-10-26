import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGIL_LAB_PARAMS } from './sigil-math';
import {
  SIGIL_SEEDED_GROWTH_STRATEGY,
  type SeededSigilParams,
} from './sigil-strategy-seeded-growth';

/** Renders through the registry interface while retaining the optional seed. */
function render(params: SeededSigilParams): string {
  return SIGIL_SEEDED_GROWTH_STRATEGY.tendril(params).d;
}

describe('seeded growth tendril', () => {
  it('repeats a seed exactly and gives different seeds different geometry', () => {
    const params = { ...DEFAULT_SIGIL_LAB_PARAMS, seed: 42 };
    expect(render(params)).toBe(render(params));
    expect(render(params)).not.toBe(render({ ...params, seed: 43 }));
  });

  it('responds independently to each geometry control', () => {
    const base = { ...DEFAULT_SIGIL_LAB_PARAMS, seed: 42 };
    for (const key of [
      'curvature',
      'swell',
      'crescentDepth',
      'asymmetry',
      'spikeLength',
    ] as const) {
      expect(render({ ...base, [key]: 0 }), key).not.toBe(render({ ...base, [key]: 1 }));
    }
    expect(render({ ...base, thornCount: 1 })).not.toBe(render({ ...base, thornCount: 6 }));
  });

  it('stays finite for a sample of seeds and knob extremes', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const extreme of [0, 1]) {
        const path = render({
          curvature: extreme,
          swell: extreme,
          thornCount: 6,
          crescentDepth: extreme,
          asymmetry: extreme,
          spikeLength: extreme,
          seed,
        });
        expect(path).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});
