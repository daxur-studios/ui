import { describe, expect, it } from 'vitest';
import { UI_LIB_VERSION } from './ui';

describe('UI Lib', () => {
  it('should export the initial library version', () => {
    expect(UI_LIB_VERSION).toBe('0.0.1');
  });
});
