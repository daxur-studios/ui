import {
  computed,
  DOCUMENT,
  inject,
  Injectable,
  makeEnvironmentProviders,
  provideAppInitializer,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import {
  DEFAULT_UI_THEME,
  parseStoredTheme,
  resolveUiThemeMode,
  serializeTheme,
  UI_THEME_STORAGE_KEY,
  type IUiTheme,
  type UiThemeDensity,
  type UiThemeMode,
  type UiThemeScheme,
} from './theme-presets';

/** Document attributes the host element receives so the packaged theme scopes apply. */
const SCHEME_ATTRIBUTE = 'data-ui-scheme';
const MODE_ATTRIBUTE = 'data-ui-mode';
const DENSITY_ATTRIBUTE = 'data-ui-density';

/** Media query used to honour `mode: 'system'`. */
const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Holds the active theme as signals and reflects it onto `document.documentElement` as
 * `data-ui-scheme` / `data-ui-mode` / `data-ui-density` attributes, which the packaged
 * `styles/theme.scss` scopes turn into `--ui-*` tokens. The selection persists to
 * `localStorage` (`ui-theme`) and `mode: 'system'` follows the OS preference live.
 *
 * Application is synchronous on every setter (not an `effect`) so it is deterministic in
 * tests and happens before the next paint; `provideUiTheme()` also runs it during bootstrap
 * to avoid a flash of the default theme.
 */
@Injectable({ providedIn: 'root' })
export class UiThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly stored = readStoredTheme();
  private readonly schemeState = signal<UiThemeScheme>(this.stored.scheme);
  private readonly modeState = signal<UiThemeMode>(this.stored.mode);
  private readonly densityState = signal<UiThemeDensity>(this.stored.density);
  private readonly prefersDarkState = signal(readPrefersDark());

  /** Active colour scheme. */
  readonly scheme = this.schemeState.asReadonly();
  /** Active mode selection, which may be `system`. */
  readonly mode = this.modeState.asReadonly();
  /** Active density. */
  readonly density = this.densityState.asReadonly();
  /** Concrete `dark`/`light` after resolving `system` against the OS preference. */
  readonly resolvedMode = computed(() =>
    resolveUiThemeMode(this.modeState(), this.prefersDarkState()),
  );

  constructor() {
    this.watchSystemPreference();
    this.applyToDocument();
  }

  /** Set the colour scheme and reflect it immediately. */
  setScheme(scheme: UiThemeScheme): void {
    this.schemeState.set(scheme);
    this.sync();
  }

  /** Set the mode (including `system`) and reflect it immediately. */
  setMode(mode: UiThemeMode): void {
    this.modeState.set(mode);
    this.sync();
  }

  /** Set the density and reflect it immediately. */
  setDensity(density: UiThemeDensity): void {
    this.densityState.set(density);
    this.sync();
  }

  /** Current selection as a plain object. */
  snapshot(): IUiTheme {
    return { scheme: this.schemeState(), mode: this.modeState(), density: this.densityState() };
  }

  /** Write the active theme onto the document root. Safe to call repeatedly. */
  applyToDocument(): void {
    const root = this.document?.documentElement;
    if (!root) return;
    root.setAttribute(SCHEME_ATTRIBUTE, this.schemeState());
    root.setAttribute(MODE_ATTRIBUTE, this.resolvedMode());
    root.setAttribute(DENSITY_ATTRIBUTE, this.densityState());
  }

  /** Reflect the active theme onto the document and persist it. */
  private sync(): void {
    this.applyToDocument();
    writeStoredTheme(this.snapshot());
  }

  /** Keep `mode: 'system'` in step with the OS preference. */
  private watchSystemPreference(): void {
    if (typeof globalThis.matchMedia !== 'function') return;
    const query = globalThis.matchMedia(DARK_MODE_MEDIA_QUERY);
    query.addEventListener('change', (event) => {
      this.prefersDarkState.set(event.matches);
      if (this.modeState() === 'system') this.applyToDocument();
    });
  }
}

/** Read the persisted theme, tolerating unavailable or corrupt storage. */
function readStoredTheme(): IUiTheme {
  try {
    if (typeof globalThis.localStorage === 'undefined') return DEFAULT_UI_THEME;
    return (
      parseStoredTheme(globalThis.localStorage.getItem(UI_THEME_STORAGE_KEY)) ?? DEFAULT_UI_THEME
    );
  } catch {
    return DEFAULT_UI_THEME;
  }
}

/** Persist the theme, tolerating unavailable storage (private mode, SSR). */
function writeStoredTheme(theme: IUiTheme): void {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.setItem(UI_THEME_STORAGE_KEY, serializeTheme(theme));
  } catch {
    // Storage is optional; a failed write must not break theming.
  }
}

/** Whether the OS currently prefers a dark colour scheme. */
function readPrefersDark(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia(DARK_MODE_MEDIA_QUERY).matches;
}

/**
 * Provide the theme system. The app initializer creates {@link UiThemeService} during
 * bootstrap so the persisted theme is on the document before the first render.
 */
export function provideUiTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(UiThemeService).applyToDocument();
    }),
  ]);
}
