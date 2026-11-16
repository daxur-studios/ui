/** Seeds used when the `seeds` parameter is missing or unusable. */
export const DEFAULT_SEEDS = '1-12';

/** Most seeds one review page renders, to keep a run quick. */
export const MAX_SEEDS = 48;

/**
 * Parses a seed list such as `1-24` or `3,7,19` (ranges and numbers can mix). Invalid pieces are
 * dropped, duplicates removed, order kept, and the result is capped at `MAX_SEEDS`.
 */
export function parseSeeds(text: string | null | undefined): number[] {
  const seeds: number[] = [];
  const seen = new Set<number>();
  const add = (n: number) => {
    if (!seen.has(n) && seeds.length < MAX_SEEDS) {
      seen.add(n);
      seeds.push(n);
    }
  };
  for (const piece of (text ?? '').split(',')) {
    const range = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(piece);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      for (let n = from; n <= to && seeds.length < MAX_SEEDS; n++) add(n);
      continue;
    }
    if (/^\s*\d+\s*$/.test(piece)) add(Number(piece));
  }
  return seeds.length > 0 || text === DEFAULT_SEEDS ? seeds : parseSeeds(DEFAULT_SEEDS);
}

/** Parses a width list such as `320,390`; non-positive or invalid pieces are dropped. */
export function parseWidths(text: string | null | undefined): number[] {
  return (text ?? '')
    .split(',')
    .map((piece) => Number(piece.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map(Math.round);
}
