import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGIL_LAB_PARAMS, SIGIL_MAX_THORN_COUNT } from './sigil-math';
import { SIGIL_SCULPTED_WEB_STRATEGY } from './sigil-strategy-sculpted-web';

describe('sculpted web tendril', () => {
  it('adds authored spurs as the thorn count increases', () => {
    const paths = Array.from(
      { length: SIGIL_MAX_THORN_COUNT },
      (_, index) =>
        SIGIL_SCULPTED_WEB_STRATEGY.tendril({ ...DEFAULT_SIGIL_LAB_PARAMS, thornCount: index + 1 })
          .d,
    );
    expect(new Set(paths).size).toBe(SIGIL_MAX_THORN_COUNT);
  });
});
