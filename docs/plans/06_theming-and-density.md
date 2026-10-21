---
type: Plan
title: Multi-Theme System and Density Presets (Theme Picker)
description: Predefined colour schemes (HUD, blue, orange) across dark/light modes, compact/comfortable/spacious density, a signal-based UiThemeService, and a reusable ui--theme-picker mounted in the demo shell.
timestamp: 2026-10-21T00:00:00Z
status: active
runbook: /docs/runbook/06_theming-and-density.md
tags: [theming, tokens, density, angular, signals, accessibility, demo, planning]
---

# Multi-Theme System and Density Presets (Theme Picker)

## 1. Goal

Spike stages currently hard-force `data-ui-theme="hud"`, so every page has exactly one
look. We want reusable theme-switching chrome on every spike page that picks from a list
of predefined themes combining **colour scheme**, **mode**, and **density** — for example
a compact blue theme, a spacious orange theme, and dark/light variants of each.

The mechanism must follow Angular 20 best practices for multiple themes: CSS custom
properties driven by `data-*` attributes on the document root, a signal-based service,
pre-paint application to avoid a flash of the wrong theme, persistence, and an
OS-preference option, all without literal colours in component styles.

## 2. Decisions

1. **Three independent axes**, selected by separate controls (chosen by the owner):
   - **Scheme** (`data-ui-scheme`): `hud` (default, teal), `blue`, `orange`.
   - **Mode** (`data-ui-mode`): `dark` (default), `light`, `system` (follows the OS).
   - **Density** (`data-ui-density`): `compact`, `comfortable` (default), `spacious`.
2. **Tokens are emitted by attribute scopes** in the packaged `styles/theme.scss`, so a
   single `data-ui-*` change restyles every `--ui-*` consumer without touching components.
3. **The picker lives in the library** (`ui--theme-picker`) and is mounted once in the
   demo shell as a fixed top-corner overlay, so it appears on every page (spikes and catalog).
4. **HUD dark is the default theme.** The hard-coded `data-ui-theme="hud"` is removed from
   the spike stages so document-level themes flow through; the legacy `[data-ui-theme='hud']`
   scope remains as an alias for backward compatibility.
5. **Persistence and pre-paint:** the choice is stored in `localStorage` under `ui-theme`,
   and `index.html` carries the default attributes so first paint is already correct.

## 3. Theme Model

`projects/ui/src/lib/theme/theme-presets.ts` (pure, Node-testable):

- Types `UiThemeScheme`, `UiThemeMode`, `UiThemeDensity`, `IUiTheme`.
- Option lists `UI_THEME_SCHEMES`, `UI_THEME_MODES`, `UI_THEME_DENSITIES` (value + label).
- `DEFAULT_UI_THEME`, `UI_THEME_STORAGE_KEY`.
- Pure helpers: `parseStoredTheme`, `serializeTheme`, `normalizeUiTheme`, `resolveUiThemeMode`.

## 4. Service & Providers

`projects/ui/src/lib/theme/theme.service.ts`:

- `UiThemeService`: root-provided, signal-based (`scheme`, `mode`, `density`,
  `resolvedMode`), reads/writes `localStorage` safely, applies `data-ui-*` to
  `document.documentElement` via the `DOCUMENT` token, and tracks `prefers-color-scheme`
  for `mode: 'system'`.
- `provideUiTheme()`: registers an app initializer that creates the service before the
  first render so the persisted theme is applied without a flash.

## 5. Colour & Density Tokens

`projects/ui/src/lib/styles/_tokens.scss` gains:

- `$schemes`: scheme → mode → the seven colour tokens (`surface`, `surface-raised`,
  `text`, `muted`, `accent`, `border`, `overlay`). Light-mode overlays use translucent
  dark; dark-mode overlays stay translucent white (library rule).
- `$densities`: density → spacing and type scale (`font-size`, `font-small`, `title-size`,
  `space-small`, `space`, `space-large`). Comfortable equals today's defaults, so nothing
  shifts for existing consumers.
- Mixins `color-scope($scheme, $mode)` (also sets `color-scheme`) and `density-scope($density)`.

`projects/ui/src/lib/styles/theme.scss` emits every `[data-ui-scheme][data-ui-mode]` and
`[data-ui-density]` combination from those maps.

## 6. Component Contract (`<ui--theme-picker>`)

- Standalone, `OnPush`, separate `.ts`/`.html`/`.scss`, `ui--` selector.
- Three `role="radiogroup"` segmented controls with `aria-pressed` toggles, `data-testid`
  hooks, and full keyboard support.
- Uses `--ui-*` tokens only (no literal colours) and reads its state from `UiThemeService`.
- The library stays layout-neutral; the shell positions the overlay.

## 7. Demo Integration

- `app.html` renders `<ui--theme-picker>` once at the top corner; `app.scss` fixes it.
- `app.config.ts` adds `provideUiTheme()`.
- `index.html` `<html>` carries `data-ui-scheme="hud" data-ui-mode="dark" data-ui-density="comfortable"`.
- Remove `data-ui-theme="hud"` from the six spike stage templates.

## 8. Action Checklist

- [x] Create Plan 06 / Runbook 06 and register both in the indexes.
- [x] Extend `_tokens.scss` with `$schemes`, `$densities`, `color-scope`, `density-scope`.
- [x] Emit attribute scopes in `theme.scss` (plus the legacy HUD alias).
- [x] Add `theme-presets.ts` and `theme-presets.spec.ts`.
- [x] Add `UiThemeService` and `provideUiTheme()`.
- [x] Add `ui--theme-picker` (`theme-picker.component.{ts,html,scss}`).
- [x] Export the theme API from `public-api.ts`.
- [x] Wire the picker into the demo shell, `app.config.ts`, and `index.html`.
- [x] Remove the forced HUD attribute from the spike stages.
- [x] Add a DOM spec and a Playwright spec for the picker.
- [x] Run `npm test`, `npm run test:dom`, `npm run test:e2e`, `npm run build:ui`, and Prettier.

## 9. Open Questions

- Should catalog thumbnails capture each spike in its default HUD theme, or honour the
  last-selected theme? Default: keep captures deterministic at HUD (thumbnail script
  already forces `colorScheme: 'dark'`).
- Do we later split density into its own per-page control? Not yet; one picker covers all.
