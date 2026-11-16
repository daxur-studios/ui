import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IReviewGeometry } from './review-types';
import { findReviewSubject, REVIEW_SUBJECTS } from './review-subjects';

/** Seeds checked per subject and width. */
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
/** Folder holding the concept reference images. */
const REFERENCE_DIR = fileURLToPath(
  new URL('../../../../public/concept/cybersigillism/', import.meta.url),
);

/** Every number found in the `d` strings of a geometry. */
function numbersIn(geometry: IReviewGeometry): number[] {
  return geometry.ink.flatMap((ink) =>
    (ink.d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number),
  );
}

describe('review subjects', () => {
  it('has six subjects with unique kebab-case ids', () => {
    expect(REVIEW_SUBJECTS).toHaveLength(6);
    const ids = REVIEW_SUBJECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('finds subjects by id', () => {
    expect(findReviewSubject('blade-crest')?.kind).toBe('motif');
    expect(findReviewSubject('tube-window-phone')?.kind).toBe('frame');
    expect(findReviewSubject('nope')).toBeUndefined();
  });

  it('only names reference images that exist', () => {
    for (const subject of REVIEW_SUBJECTS) {
      expect(subject.references.length).toBeGreaterThan(0);
      for (const file of subject.references) {
        expect(existsSync(REFERENCE_DIR + file), `${subject.id}: ${file}`).toBe(true);
      }
    }
  });

  for (const subject of REVIEW_SUBJECTS) {
    it(`${subject.id}: geometry is finite, repeatable and sized to the cell`, () => {
      for (const width of subject.widths) {
        for (const seed of SEEDS) {
          const geometry = subject.geometry(seed, width);
          expect(geometry.width).toBe(width);
          expect(geometry.height).toBe(subject.heightFor(width));
          expect(geometry.ink.length).toBeGreaterThan(0);
          const values = numbersIn(geometry);
          expect(values.length).toBeGreaterThan(0);
          expect(values.every(Number.isFinite)).toBe(true);
          expect(subject.geometry(seed, width)).toEqual(geometry);
        }
      }
    });

    it(`${subject.id}: keep-out boxes exist only on frames and lie inside the frame`, () => {
      for (const width of subject.widths) {
        const geometry = subject.geometry(1, width);
        if (subject.kind === 'motif') {
          expect(geometry.keepOut).toBeUndefined();
          continue;
        }
        expect(geometry.keepOut?.length).toBeGreaterThan(0);
        for (const box of geometry.keepOut ?? []) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(geometry.width);
          expect(box.y + box.height).toBeLessThanOrEqual(geometry.height);
        }
      }
    });
  }

  it('different seeds give different blade geometry', () => {
    const crest = findReviewSubject('blade-crest');
    expect(crest?.geometry(1, 240).ink[0].d).not.toBe(crest?.geometry(2, 240).ink[0].d);
  });
});
