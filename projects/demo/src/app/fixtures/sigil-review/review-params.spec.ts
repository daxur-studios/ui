import { describe, expect, it } from 'vitest';
import { MAX_SEEDS, parseSeeds, parseWidths } from './review-params';

describe('parseSeeds', () => {
  it('parses ranges, lists and mixes', () => {
    expect(parseSeeds('1-4')).toEqual([1, 2, 3, 4]);
    expect(parseSeeds('3,7,19')).toEqual([3, 7, 19]);
    expect(parseSeeds('1-3,10,2')).toEqual([1, 2, 3, 10]);
  });

  it('falls back to the default for missing or unusable input', () => {
    expect(parseSeeds(null)).toHaveLength(12);
    expect(parseSeeds('abc')).toEqual(parseSeeds('1-12'));
  });

  it('drops bad pieces and caps the count', () => {
    expect(parseSeeds('2,x,5')).toEqual([2, 5]);
    expect(parseSeeds('1-500')).toHaveLength(MAX_SEEDS);
  });
});

describe('parseWidths', () => {
  it('parses positive widths and drops the rest', () => {
    expect(parseWidths('320, 390.4,0,-5,abc')).toEqual([320, 390]);
    expect(parseWidths(null)).toEqual([]);
  });
});
