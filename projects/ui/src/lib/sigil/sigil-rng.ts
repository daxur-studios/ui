/**
 * Deterministic seeded PRNG and harmonic sampling utilities for procedural cybersigillism.
 *
 * Uses Mulberry32 with salted sub-stream forking so each structural slot (left wing, right wing,
 * centerpiece, corner spandrel, pocket) draws from an independent deterministic stream. Changing
 * a slider or toggling a sub-feature never scrambles unrelated parts of the same seed.
 */

/** Golden ratio conjugate, used for low-discrepancy harmonic placement along spines. */
export const SIGIL_PHI_CONJUGATE = 0.6180339887498949;

/** Default initial seed when none is provided. */
export const SIGIL_DEFAULT_SEED = 1;

/** 32-bit FNV/Murmur-style mixing constant for seed salting. */
const HASH_MIX_A = 0x9e3779b9;
/** Second mixing multiplier for avalanche bit dispersion. */
const HASH_MIX_B = 0x85ebca6b;
/** Third mixing multiplier for avalanche bit dispersion. */
const HASH_MIX_C = 0xc2b2ae35;
/** Divisor to normalize an unsigned 32-bit integer into `[0, 1)`. */
const UINT32_NORMALIZER = 4294967296;

/** Deterministic pseudo-random generator interface for one structural stream. */
export interface ISigilRng {
  /** Returns a uniform float in `[0, 1)`. */
  next(): number;
  /** Returns a uniform float in `[min, max)`. */
  range(min: number, max: number): number;
  /** Returns an integer in `[min, max]` inclusive. */
  int(min: number, max: number): number;
  /** Returns `true` with probability `probability` (default `0.5`). */
  chance(probability?: number): boolean;
  /** Picks one item from a non-empty readonly array. */
  pick<T>(items: readonly T[]): T;
  /** Picks one item according to non-negative weights. */
  weighted<T>(entries: readonly { readonly item: T; readonly weight: number }[]): T;
  /** Creates an independent child RNG stream salted by `salt`. */
  fork(salt: number | string): ISigilRng;
}

/** Hashes a string or number salt into a 32-bit integer. */
function hashSalt(baseSeed: number, salt: number | string): number {
  let h = (baseSeed | 0) ^ HASH_MIX_A;
  if (typeof salt === 'number') {
    h ^= Math.imul((salt | 0) + 1, HASH_MIX_B);
  } else {
    for (let i = 0; i < salt.length; i++) {
      h = Math.imul(h ^ salt.charCodeAt(i), HASH_MIX_B);
      h ^= h >>> 13;
    }
  }
  h = Math.imul(h ^ (h >>> 16), HASH_MIX_B);
  h = Math.imul(h ^ (h >>> 13), HASH_MIX_C);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Creates a deterministic `ISigilRng` from an integer seed. */
export function createSigilRng(seed: number): ISigilRng {
  const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : SIGIL_DEFAULT_SEED;
  let state = normalizedSeed || SIGIL_DEFAULT_SEED;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_NORMALIZER;
  };

  const range = (min: number, max: number): number => min + (max - min) * next();

  const int = (min: number, max: number): number => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi <= lo) return lo;
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  const chance = (probability = 0.5): boolean => next() < probability;

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('createSigilRng.pick requires at least one item');
    }
    return items[Math.floor(next() * items.length)];
  };

  const weighted = <T>(entries: readonly { readonly item: T; readonly weight: number }[]): T => {
    if (entries.length === 0) {
      throw new Error('createSigilRng.weighted requires at least one entry');
    }
    let total = 0;
    for (const entry of entries) {
      if (entry.weight > 0) total += entry.weight;
    }
    if (total <= 0) return entries[0].item;
    let cursor = next() * total;
    for (const entry of entries) {
      if (entry.weight <= 0) continue;
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return entries[entries.length - 1].item;
  };

  const fork = (salt: number | string): ISigilRng => createSigilRng(hashSalt(normalizedSeed, salt));

  return { next, range, int, chance, pick, weighted, fork };
}

/**
 * Generates `count` sorted harmonic positions in `[start, end]` using golden-ratio jittered
 * stratification so branches never cluster awkwardly or look mechanically uniform.
 */
export function harmonicPositions(
  count: number,
  start: number,
  end: number,
  rng: ISigilRng,
  jitterFraction = 0.25,
): number[] {
  if (count <= 0) return [];
  const span = end - start;
  if (count === 1) {
    return [start + span * (0.5 + (rng.next() - 0.5) * jitterFraction)];
  }
  const step = span / count;
  const positions: number[] = [];
  const phase = rng.next();
  for (let i = 0; i < count; i++) {
    const goldenOffset = ((phase + i * SIGIL_PHI_CONJUGATE) % 1) - 0.5;
    const raw = start + (i + 0.5) * step + goldenOffset * step * jitterFraction;
    positions.push(Math.min(end, Math.max(start, raw)));
  }
  return positions.sort((a, b) => a - b);
}
