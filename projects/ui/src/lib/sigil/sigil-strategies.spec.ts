import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIGIL_LAB_PARAMS,
  ISigilLabParams,
  SIGIL_MAX_THORN_COUNT,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
} from './sigil-math';
import { SIGIL_STRATEGIES, type ISigilStrategy } from './sigil-strategies';

/** Rail width used for the join contract, in user units. */
const CONTRACT_RAIL_WIDTH = 240;

/** Extreme knob value used to sweep each strategy at its limits. */
const KNOB_MIN = 0;
const KNOB_MAX = 1;

/** Knob settings every strategy must render finitely, from calm to fully extended. */
const EXTREME_PARAMS: ISigilLabParams[] = [KNOB_MIN, KNOB_MAX].map((extreme) => ({
  curvature: extreme,
  swell: extreme,
  thornCount: SIGIL_MAX_THORN_COUNT,
  crescentDepth: extreme,
  asymmetry: extreme,
  spikeLength: extreme,
}));

describe('sigil strategy registry', () => {
  it('registers at least one strategy and gives every entry a unique id and a label', () => {
    expect(SIGIL_STRATEGIES.length).toBeGreaterThan(0);
    const ids = SIGIL_STRATEGIES.map((strategy) => strategy.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const strategy of SIGIL_STRATEGIES) {
      expect(strategy.label.length).toBeGreaterThan(0);
    }
  });

  for (const strategy of SIGIL_STRATEGIES) {
    describe(`strategy "${strategy.id}"`, () => {
      it('renders each full archetype on a full canvas with finite, non-empty geometry', () => {
        for (const geometry of fullCanvasGeometries(strategy, DEFAULT_SIGIL_LAB_PARAMS)) {
          expect(geometry.width).toBe(SIGIL_VIEW_WIDTH);
          expect(geometry.height).toBe(SIGIL_VIEW_HEIGHT);
          expect(geometry.d.length).toBeGreaterThan(0);
          expect(geometry.d).not.toMatch(/NaN|Infinity/);
        }
      });

      it('stays finite at every extreme knob setting', () => {
        for (const params of EXTREME_PARAMS) {
          for (const geometry of fullCanvasGeometries(strategy, params)) {
            expect(geometry.d).not.toMatch(/NaN|Infinity/);
          }
          expect(strategy.join(params, CONTRACT_RAIL_WIDTH).d).not.toMatch(/NaN|Infinity/);
        }
      });

      it('is deterministic for identical params', () => {
        const first = fullCanvasGeometries(strategy, DEFAULT_SIGIL_LAB_PARAMS).map((g) => g.d);
        const second = fullCanvasGeometries(strategy, DEFAULT_SIGIL_LAB_PARAMS).map((g) => g.d);
        expect(second).toEqual(first);
      });

      it('draws the join at the requested rail width', () => {
        const join = strategy.join(DEFAULT_SIGIL_LAB_PARAMS, CONTRACT_RAIL_WIDTH);
        expect(join.width).toBe(CONTRACT_RAIL_WIDTH);
        expect(join.d.length).toBeGreaterThan(0);
      });
    });
  }
});

/** The three archetypes that fill a full canvas, for one params set, in slot order. The join is sized by rail width. */
function fullCanvasGeometries(strategy: ISigilStrategy, params: ISigilLabParams) {
  return [strategy.star(params), strategy.crest(params), strategy.tendril(params)];
}
