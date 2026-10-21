import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_THEME,
  normalizeUiTheme,
  parseStoredTheme,
  resolveUiThemeMode,
  serializeTheme,
} from './theme-presets';

describe('theme-presets', () => {
  it('defaults to HUD dark, comfortable', () => {
    expect(DEFAULT_UI_THEME).toEqual({ scheme: 'hud', mode: 'dark', density: 'comfortable' });
  });

  it('normalizes unknown or missing axes back to the defaults', () => {
    expect(normalizeUiTheme({ scheme: 'blue' })).toEqual({
      scheme: 'blue',
      mode: 'dark',
      density: 'comfortable',
    });
    expect(
      normalizeUiTheme({
        scheme: 'pink' as never,
        mode: 'sepia' as never,
        density: 'tiny' as never,
      }),
    ).toEqual(DEFAULT_UI_THEME);
    expect(normalizeUiTheme(null)).toEqual(DEFAULT_UI_THEME);
  });

  it('resolves system mode against the OS preference', () => {
    expect(resolveUiThemeMode('system', true)).toBe('dark');
    expect(resolveUiThemeMode('system', false)).toBe('light');
    expect(resolveUiThemeMode('light', true)).toBe('light');
    expect(resolveUiThemeMode('dark', false)).toBe('dark');
  });

  it('round-trips a serialized theme', () => {
    const theme = { scheme: 'orange', mode: 'light', density: 'spacious' } as const;
    expect(parseStoredTheme(serializeTheme(theme))).toEqual(theme);
  });

  it('returns null for missing or malformed stored data', () => {
    expect(parseStoredTheme(null)).toBeNull();
    expect(parseStoredTheme('')).toBeNull();
    expect(parseStoredTheme('not json')).toBeNull();
    expect(parseStoredTheme('42')).toBeNull();
    expect(parseStoredTheme('{"scheme":"pink"}')).toBeNull();
  });

  it('keeps valid axes and defaults the rest from partial stored data', () => {
    expect(parseStoredTheme('{"scheme":"blue","density":"compact"}')).toEqual({
      scheme: 'blue',
      mode: 'dark',
      density: 'compact',
    });
  });
});
