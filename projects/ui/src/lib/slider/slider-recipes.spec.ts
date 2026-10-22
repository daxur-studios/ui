import { describe, expect, it } from 'vitest';
import type { ISliderPartState, ISliderRecipeContext } from './slider-parts';
import { DEFAULT_SLIDER_RECIPE, SLIDER_RECIPES } from './slider-recipes';

/** Wide rail so every recipe produces non-degenerate geometry. */
const WIDTH = 240;
/** Bipolar mid-range state reused across recipes. */
const STATE: ISliderPartState = { width: WIDTH, min: 0, max: 100, value: 50, text: '50%' };
/** Default presentation context. */
const CONTEXT: ISliderRecipeContext = { cellCount: 24, tickCount: 0, wrapper: true };
/** Rect as captured by the pointer handlers. */
const RECT = { left: 0, width: WIDTH };

describe('slider recipes', () => {
  it('defaults to the angled look', () => {
    expect(DEFAULT_SLIDER_RECIPE).toBe('angled');
  });

  it('ships exactly the known looks, each with a track class and height', () => {
    expect(Object.keys(SLIDER_RECIPES).sort()).toEqual(['angled', 'notch', 'reticle', 'segmented']);
    for (const definition of Object.values(SLIDER_RECIPES)) {
      expect(definition.height).toBeGreaterThan(0);
      expect(definition.trackClass).toMatch(/^track--/);
    }
  });

  it('angled renders an inactive path, an active path, and a circular knob', () => {
    const parts = SLIDER_RECIPES.angled.parts(STATE, CONTEXT);
    expect(parts.map((part) => (part.kind === 'path' ? part.cssClass : part.kind))).toEqual([
      'inactive',
      'active',
      'circle',
    ]);
    const knob = parts[2];
    if (knob.kind !== 'circle') throw new Error('expected a circle primitive');
    expect(knob.r).toBe(6);
    expect(SLIDER_RECIPES.angled.height).toBe(40);
    expect(SLIDER_RECIPES.angled.readout).toBe('heading');
  });

  it('segmented renders one cell array sized by the cell count', () => {
    const parts = SLIDER_RECIPES.segmented.parts(STATE, CONTEXT);
    expect(parts).toHaveLength(1);
    const cells = parts[0];
    if (cells.kind !== 'cells') throw new Error('expected a cells primitive');
    expect(cells.cells).toHaveLength(24);
    expect(cells.cells.filter((cell) => cell.active).length).toBeGreaterThan(0);
    expect(SLIDER_RECIPES.segmented.height).toBe(28);
  });

  it('reticle renders rails, a diamond knob, and two caliper brackets; bipolar adds an origin tick', () => {
    const classes = SLIDER_RECIPES.reticle
      .parts({ ...STATE, min: -24, max: 24, value: 4 }, CONTEXT)
      .filter((part) => part.kind === 'path')
      .map((part) => (part.kind === 'path' ? part.cssClass : ''));
    expect(classes.filter((name) => name === 'rail')).toHaveLength(2);
    expect(classes.filter((name) => name === 'caliper-bracket')).toHaveLength(2);
    expect(classes).toContain('thumb-diamond');
    expect(classes).toContain('origin-tick');

    const unipolar = SLIDER_RECIPES.reticle.parts(STATE, CONTEXT);
    expect(unipolar.some((part) => part.kind === 'path' && part.cssClass === 'origin-tick')).toBe(
      false,
    );
  });

  it('notch renders a dropped progress line and an anchored readout', () => {
    const parts = SLIDER_RECIPES.notch.parts(STATE, CONTEXT);
    expect(parts.map((part) => part.kind)).toEqual(['path', 'text']);
    expect(SLIDER_RECIPES.notch.readout).toBe('inline');
    expect(SLIDER_RECIPES.notch.wrappable).toBe(true);

    const readout = parts[1];
    if (readout.kind !== 'text') throw new Error('expected a text primitive');
    expect(readout.text).toBe('50%');
    expect(readout.anchor).toBe('end');
  });

  it('notch keeps the whole handle and readout inside the canvas at both endpoints', () => {
    const atMin = SLIDER_RECIPES.notch.parts({ ...STATE, value: 0 }, CONTEXT);
    const atMax = SLIDER_RECIPES.notch.parts({ ...STATE, value: 100 }, CONTEXT);
    const progressAtMin = atMin[0];
    const progressAtMax = atMax[0];
    if (progressAtMin.kind !== 'path' || progressAtMax.kind !== 'path') {
      throw new Error('expected path primitives');
    }
    expect(progressAtMin.d.startsWith('M 6 10')).toBe(true);
    const readout = atMin[1];
    if (readout.kind !== 'text') throw new Error('expected a text primitive');
    expect(readout.x).toBeGreaterThanOrEqual(36);
  });

  it('maps pointers onto each recipe rail, clamped to the unit interval where required', () => {
    expect(SLIDER_RECIPES.angled.pointerRatio(6, RECT)).toBeCloseTo(0, 5);
    expect(SLIDER_RECIPES.angled.pointerRatio(234, RECT)).toBeCloseTo(1, 5);

    expect(SLIDER_RECIPES.segmented.pointerRatio(120, RECT)).toBeCloseTo(0.5, 5);
    expect(SLIDER_RECIPES.segmented.pointerRatio(120, { left: 0, width: 0 })).toBe(0);

    expect(SLIDER_RECIPES.reticle.pointerRatio(20, RECT)).toBeCloseTo(0, 5);
    expect(SLIDER_RECIPES.reticle.pointerRatio(220, RECT)).toBeCloseTo(1, 5);
    expect(SLIDER_RECIPES.reticle.pointerRatio(400, RECT)).toBe(1);

    expect(SLIDER_RECIPES.notch.pointerRatio(6, RECT)).toBeCloseTo(0, 5);
    expect(SLIDER_RECIPES.notch.pointerRatio(234, RECT)).toBeCloseTo(1, 5);
    expect(SLIDER_RECIPES.notch.pointerRatio(-50, RECT)).toBe(0);
  });
});
