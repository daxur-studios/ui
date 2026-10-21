/**
 * Shared theme model for `@daxur-studios/ui`. Everything here is pure so it can be unit
 * tested in Node without a DOM. The theme is three independent axes: the colour `scheme`,
 * the `mode` (dark/light, or `system` to follow the OS), and the `density` (spacing and
 * type scale). `theme.scss` emits the matching `data-ui-*` attribute scopes.
 */

/** Colour scheme applied through `[data-ui-scheme]`. */
export type UiThemeScheme = 'hud' | 'blue' | 'orange';

/** Light/dark selection applied through `[data-ui-mode]`; `system` follows the OS preference. */
export type UiThemeMode = 'dark' | 'light' | 'system';

/** Spacing and type scale applied through `[data-ui-density]`. */
export type UiThemeDensity = 'compact' | 'comfortable' | 'spacious';

/** One selectable option on a theme axis. */
export interface IUiThemeOption<T extends string> {
  readonly value: T;
  /** Human-readable label shown by `<ui--theme-picker>`. */
  readonly label: string;
}

/** A complete theme selection across all three axes. */
export interface IUiTheme {
  readonly scheme: UiThemeScheme;
  readonly mode: UiThemeMode;
  readonly density: UiThemeDensity;
}

/** Colour scheme options in picker order. `hud` is the library's original teal scheme. */
export const UI_THEME_SCHEMES: readonly IUiThemeOption<UiThemeScheme>[] = [
  { value: 'hud', label: 'HUD' },
  { value: 'blue', label: 'Blue' },
  { value: 'orange', label: 'Orange' },
];

/** Mode options in picker order. */
export const UI_THEME_MODES: readonly IUiThemeOption<UiThemeMode>[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

/** Density options in picker order. `comfortable` matches the library's original sizing. */
export const UI_THEME_DENSITIES: readonly IUiThemeOption<UiThemeDensity>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

/** Theme applied when nothing is persisted and no OS preference is honoured. */
export const DEFAULT_UI_THEME: IUiTheme = {
  scheme: 'hud',
  mode: 'dark',
  density: 'comfortable',
};

/** `localStorage` key holding the serialized theme. */
export const UI_THEME_STORAGE_KEY = 'ui-theme';

/** Narrows an unknown value to a valid scheme. */
export function isUiThemeScheme(value: unknown): value is UiThemeScheme {
  return UI_THEME_SCHEMES.some((option) => option.value === value);
}

/** Narrows an unknown value to a valid mode. */
export function isUiThemeMode(value: unknown): value is UiThemeMode {
  return UI_THEME_MODES.some((option) => option.value === value);
}

/** Narrows an unknown value to a valid density. */
export function isUiThemeDensity(value: unknown): value is UiThemeDensity {
  return UI_THEME_DENSITIES.some((option) => option.value === value);
}

/**
 * Merge a partial selection over the defaults, validating each axis so an unknown or
 * missing value falls back to the default instead of producing an unstyled theme.
 */
export function normalizeUiTheme(partial: Partial<IUiTheme> | null | undefined): IUiTheme {
  return {
    scheme: isUiThemeScheme(partial?.scheme) ? partial.scheme : DEFAULT_UI_THEME.scheme,
    mode: isUiThemeMode(partial?.mode) ? partial.mode : DEFAULT_UI_THEME.mode,
    density: isUiThemeDensity(partial?.density) ? partial.density : DEFAULT_UI_THEME.density,
  };
}

/** Resolve a mode selection to a concrete scheme mode, following the OS when `system`. */
export function resolveUiThemeMode(
  mode: UiThemeMode,
  prefersDark: boolean,
): Exclude<UiThemeMode, 'system'> {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

/** Serialize a theme for storage. */
export function serializeTheme(theme: IUiTheme): string {
  return JSON.stringify({ scheme: theme.scheme, mode: theme.mode, density: theme.density });
}

/**
 * Parse a stored theme string. Returns `null` for missing, malformed, or partial data so
 * callers can fall back to defaults; unknown axis values are dropped and defaulted.
 */
export function parseStoredTheme(raw: string | null | undefined): IUiTheme | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<IUiTheme>;
  if (
    !isUiThemeScheme(candidate.scheme) &&
    !isUiThemeMode(candidate.mode) &&
    !isUiThemeDensity(candidate.density)
  ) {
    return null;
  }
  return normalizeUiTheme(candidate);
}
