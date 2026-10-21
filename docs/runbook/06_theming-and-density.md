---
type: Runbook
title: Multi-Theme System and Density Presets (Theme Picker) — Runbook
description: Chronological trace of decisions and verification for the multi-theme system, density presets, signal-based theme service, and the reusable theme picker.
timestamp: 2026-10-21T00:00:00Z
plans: [/docs/plans/06_theming-and-density.md]
tags: [theming, tokens, density, angular, signals, accessibility, demo, runbook]
---

# Multi-Theme System and Density Presets (Theme Picker) — Runbook

## 2026-10-21

### opencode — Owner decisions and scope

- **[finding]** Every spike stage hard-forces `data-ui-theme="hud"` on its `<section>`. Because a
  descendant declaration of a custom property always beats an ancestor's, a document-level theme
  could never reach the stages. The `styles/theme.scss` shipped only a single `hud` scope.
- **[decision]** Separate controls for three axes — scheme (`hud`/`blue`/`orange`), mode
  (`dark`/`light`/`system`), and density (`compact`/`comfortable`/`spacious`) — rather than a
  single preset list.
- **[decision]** Mount a single library `ui--theme-picker` in the demo shell top corner so it is
  present on every page, instead of repeating markup in each spike.
- **[decision]** Make HUD dark the default theme and remove the forced stage attribute so themes
  flow through; keep `[data-ui-theme='hud']` as a backward-compatible alias.

### opencode — Implementation

- **[action]** Extended `projects/ui/src/lib/styles/_tokens.scss`:
  - Added `$schemes` (hud/blue/orange × dark/light) with the seven colour tokens. Light overlays
    use translucent dark; dark overlays stay translucent white.
  - Added `$densities` (compact/comfortable/spacious). Comfortable reuses today's spacing and type
    values, so existing pages are unchanged by default.
  - Added `color-scope($scheme, $mode)` (sets `color-scheme` too) and `density-scope($density)`.
- **[action]** Rewrote `projects/ui/src/lib/styles/theme.scss` to emit every
  `[data-ui-scheme][data-ui-mode]` and `[data-ui-density]` scope from those maps, and kept the
  legacy `.ui-theme-hud` / `[data-ui-theme='hud']` alias.
- **[action]** Added `projects/ui/src/lib/theme/theme-presets.ts` (pure types, option lists,
  defaults, and `parseStoredTheme` / `serializeTheme` / `normalizeUiTheme` / `resolveUiThemeMode`)
  with a Vitest spec at `theme-presets.spec.ts`.
- **[action]** Added `projects/ui/src/lib/theme/theme.service.ts`: a root-provided signal service
  that applies `data-ui-scheme` / `data-ui-mode` (resolved) / `data-ui-density` to
  `document.documentElement`, persists to `localStorage` (`ui-theme`), tracks
  `prefers-color-scheme` for `mode: 'system'`, and exposes `provideUiTheme()` which runs
  `provideAppInitializer` to create the service before the first render.
- **[action]** Added `projects/ui/src/lib/theme/theme-picker/theme-picker.component.{ts,html,scss}`
  as `ui--theme-picker`: standalone, `OnPush`, three `role="radiogroup"` segmented controls with
  `aria-pressed` toggles and `data-testid` hooks, token-only styling.
- **[action]** Exported the theme entrypoints from `projects/ui/src/public-api.ts`.
- **[action]** Demo integration: `app.html` renders the picker in a fixed top-corner overlay
  (`app.scss`), `app.config.ts` adds `provideUiTheme()`, and `index.html` carries the default
  `data-ui-*` attributes for correct first paint.
- **[action]** Removed `data-ui-theme="hud"` from the six spike stage templates.
- **[action]** Added a DOM spec and a Playwright spec for the picker.
- **[decision]** The service syncs the document from its setters (and the media listener) rather
  than from an `effect()`, so applying/persisting is synchronous and deterministic under jsdom
  without relying on effect-flush timing.

### opencode — Verification

- **[verification]** `npm test`: 57 Vitest unit tests pass (including 6 new `theme-presets` tests).
- **[verification]** `npm run test:dom`: 53 jsdom tests pass (including the 5 new
  `theme-picker.dom.spec.ts` tests covering option rendering, `aria-pressed`, document application,
  active-marker movement, and persistence).
- **[verification]** `npm run test:e2e` (chromium): 35 Playwright tests pass, including the 3 new
  `e2e/theme-picker.spec.ts` tests and the updated slider token test.
- **[verification]** `ng build ui` and `ng build demo` (development) succeed; the earlier Sass
  "color value in interpolation" warnings were removed by quoting the `blue`/`orange` map keys.
- **[action]** Updated the existing `e2e/spikes/slider-svg-spike.spec.ts` token-resolution test:
  because the document root now always sets `--ui-*`, the Material-adapter fallback only applies
  once the root `data-ui-scheme`/`data-ui-mode` are cleared, so the test clears those attributes
  before asserting the adapter value, then restores a scope with a stage-level `.ui-theme-hud`.
- **[action]** Formatted the changed files with Prettier and updated the packaged
  `projects/ui/.agents/skills/ui/SKILL.md` (entry points, theme scopes, version notes).
