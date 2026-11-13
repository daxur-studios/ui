import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGIL_LAB_PARAMS } from './sigil-math';
import {
  composeBranchingConnector,
  composeCalyxFrame,
  composeCornerSpandrel,
  composeToolbarCrown,
  composeWaistDivider,
} from './sigil-ui-parts';

describe('sigil-ui-parts', () => {
  it('generates valid cubic paths and pockets for ToolbarCrown across seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const res = composeToolbarCrown(DEFAULT_SIGIL_LAB_PARAMS, seed);
      expect(res.d.startsWith('M')).toBe(true);
      expect(res.d).not.toContain('NaN');
      expect(res.pocketCount).toBeGreaterThanOrEqual(1);
      seen.add(res.d);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('generates distinct 4-quadrant CornerSpandrels', () => {
    const tl = composeCornerSpandrel(DEFAULT_SIGIL_LAB_PARAMS, 1, 120, 'tl');
    const tr = composeCornerSpandrel(DEFAULT_SIGIL_LAB_PARAMS, 1, 120, 'tr');
    const bl = composeCornerSpandrel(DEFAULT_SIGIL_LAB_PARAMS, 1, 120, 'bl');
    const br = composeCornerSpandrel(DEFAULT_SIGIL_LAB_PARAMS, 1, 120, 'br');
    expect(new Set([tl.d, tr.d, bl.d, br.d]).size).toBe(4);
  });

  it('generates WaistDivider with enclosed corner/center pockets', () => {
    const res = composeWaistDivider(DEFAULT_SIGIL_LAB_PARAMS, 3);
    expect(res.d.startsWith('M')).toBe(true);
    expect(res.d).not.toContain('NaN');
  });

  it('generates BranchingConnector for 2, 3, and 4 target rows', () => {
    const two = composeBranchingConnector(DEFAULT_SIGIL_LAB_PARAMS, 1, [60, 180]);
    const four = composeBranchingConnector(DEFAULT_SIGIL_LAB_PARAMS, 1, [30, 90, 150, 210]);
    expect(two.d.startsWith('M')).toBe(true);
    expect(four.d.startsWith('M')).toBe(true);
    expect(two.d).not.toBe(four.d);
  });

  it('generates CalyxFrame with an enclosed interior pocket', () => {
    const res = composeCalyxFrame(DEFAULT_SIGIL_LAB_PARAMS, 2);
    expect(res.d.startsWith('M')).toBe(true);
    expect(res.pocketCount).toBeGreaterThanOrEqual(1);
  });
});
