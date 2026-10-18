---
type: Runbook
title: UI Library Architecture & Entrypoints — Runbook
description: Chronological log of architecture, entrypoints, and token decisions for @daxur-studios/ui.
timestamp: 2026-10-17T00:00:00Z
plans: [/docs/plans/00_architecture-and-entrypoints.md]
tags: [architecture, tokens, entrypoints, angular, headless]
---

# UI Library Architecture & Entrypoints — Runbook

## 2026-10-17

- **[action]** Initialized repository at `d:\code\@daxur-studios\ui` with Angular CLI 20 + ng-packagr + Vitest test runner.
- **[action]** Linked remote `https://github.com/daxur-studios/ui.git` and pushed initial `main` branch.
- **[decision]** All colors and theme properties must come exclusively from CSS variables (`--ui-*`, `--mat-sys-*`). No literal hex or rgba in component SCSS.
- **[decision]** Adopt the Daxur Library Standards: bundle an agent skill (`projects/ui/.agents/skills/ui/SKILL.md`) into package output via `ng-package.json` assets (`skills/ui/SKILL.md`).
- **[decision]** Adopt OKF v0.1 Plans & Runbooks documentation standard in `docs/plans/` and `docs/runbook/`.
- **[action]** Verified build (`ng build ui`) compiles in under 1s, runs Vitest unit tests headlessly, and copies skill assets to `dist/ui/skills/ui/SKILL.md`.

## 2026-10-18

- **[decision]** Reactive forms support is a required architecture rule that initial planning missed: every value-bearing control implements `ControlValueAccessor` via the shared `UiFormControl<T>` base, and `@angular/forms` becomes a required peer. Material form-field integration is deferred. Recorded in [Plan 04](../plans/04_reactive-forms-contract.md) / [Runbook 04](04_reactive-forms-contract.md) and [`docs/standards/form-controls.md`](../standards/form-controls.md).
