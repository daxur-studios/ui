---
type: Plan
title: Testing Strategy & Architectural Evaluation
description: Multi-agent evaluation of framework coupling (Angular-free vs CDK/Angular) and establishing Playwright alongside Vitest.
timestamp: 2026-10-17T00:00:00Z
status: active
runbook: /docs/runbook/01_testing-and-architecture-evaluation.md
tags: [playwright, testing, architecture, angular, multi-agent, tokens]
---

# Testing Strategy & Architectural Evaluation

## Goal

Resolve core architectural decisions via multi-agent consensus and establish a dual testing setup: unit tests (Vitest) and browser/component verification (Playwright).

## 1. Testing Stack

- **Unit Testing**: Vitest (node-based, fast, runs headlessly via `npm test`).
- **Browser / Component Testing**: Playwright (real Chromium/Firefox/WebKit rendering, accessibility, visual/interaction checks).
- **Harness**: Lightweight test harness / demo page to serve components to Playwright.

## 2. Core Questions for Multi-Agent Consensus

### Q1: Framework Coupling Boundary
- **Option A (Pure Angular)**: Built directly with Angular 20 standalone primitives, signals, and `@angular/cdk`.
  - *Pros*: Best ergonomics, native control flow, zero boilerplate wrappers.
  - *Cons*: Cannot be consumed by non-Angular apps (e.g. Vanilla, React, Svelte).
- **Option B (Framework-Agnostic Core + Angular Bindings)**: Headless logic/math/DOM state in `@daxur-studios/ui`, with Angular components in `@daxur-studios/ui/angular`.
  - *Pros*: Universal reusability, easy migration, logic portable across web apps.
  - *Cons*: Maintenance overhead of maintaining two layers.
- **Option C (Web Components Primitives)**: Custom elements under the hood with Angular directive bindings.
  - *Pros*: Native browser standard, works anywhere.
  - *Cons*: SSR complexities, form control binding ergonomics in Angular.

### Q2: Entry Point & Packaging Layout
- Root export `@daxur-studios/ui` vs granular per-component secondary entry points (e.g. `@daxur-studios/ui/button`, `@daxur-studios/ui/dialog`) modeled after Angular Material.

### Q3: Styling & Token Scoping
- CSS variable token dictionary (`--ui-*`) defaulting to `--mat-sys-*` tokens without bundling app-specific theme files into the library.

## 3. Locked-In Multi-Agent Consensus (2026-10-18)

Following independent reviews across **Argon**, **Codex**, and **Claude**, the following architectural decisions and design contracts are locked in:

1. **Q1 (Framework Coupling) — Pure Angular 20 Standalone + Signals + `@angular/cdk` (Option A):**
   - Components are authored directly as Angular 20 `standalone: true`, `ChangeDetectionStrategy.OnPush`, zoneless-compatible primitives using Signals (`input()`, `model()`, `output()`, `computed()`) and selective `@angular/cdk` utilities (`FocusMonitor`, `Overlay`, a11y).
   - Pure numeric normalization, stepping/clamping math, and SVG path string builders (`d` attribute generators) live in pure TypeScript helper functions (zero Angular/DOM imports) for fast, deterministic Vitest unit testing.
   - `@angular/core`, `@angular/common`, and `@angular/cdk` become required peer dependencies of `@daxur-studios/ui`.

2. **Q2 (Entrypoint Layout) — Single Root Entrypoint (`@daxur-studios/ui`):**
   - Export all public components, directives, and types from the root `@daxur-studios/ui` entrypoint to maximize AI-agent ergonomics and eliminate hallucinated sub-paths.
   - Avoid aggregate "import-all" arrays so individual standalone components remain tree-shakeable. Revisit secondary entrypoints only if measured bundle size or lazy-loading boundaries later require them.

3. **Q3 (Token & Theme Strategy) — Public `--ui-*` Contract → `--mat-sys-*` Adapter → Dark HUD Fallback + Explicit `.ui-theme-hud`:**
   - Components resolve `var(--ui-*, var(--mat-sys-*, <hud-default>))` at consumption sites (or into private `--_ui-*` variables) rather than defining public `--ui-*` properties on `:host` (which would block inherited theme overrides).
   - Ship an explicit `.ui-theme-hud` / `[data-ui-theme="hud"]` scope (with `color-scheme: dark` and explicit `--ui-*` token definitions) so dark game HUD panels over a WebGL/Three.js canvas remain dark even inside a light-themed Material studio editor.
   - Avoid default `backdrop-filter: blur(...)` over animating WebGL canvases; use CSS `clip-path` for static chamfers/notches and `ResizeObserver` + Signals for value-dependent SVG geometry (such as angled slider tracks).

4. **Selector & Control Contracts (`ui--*`):**
   - **Element Selectors**: Use double-dash `<ui--*>` element selectors (`<ui--panel>`, `<ui--folder>`, `<ui--row>`, `<ui--number>`, `<ui--slider>`) to visually distinguish UI controls from standard HTML (`<div>`) and `camelCase` 3D scene elements (`<boxGeometry>`). Keep inputs, outputs, and attribute directives standard `camelCase`, use single-dash `.ui-*` / `[data-state]` for styling, set explicit `:host { display: ... }` on every component, and forbid `CUSTOM_ELEMENTS_SCHEMA` in demos/tests so typos fail at compile time (`NG8001`).
   - **Value & Labeling Contract**: Standardize controls around `label = input<string>()`, `value = model<T>()` (live scrubbing preview), and `valueCommit = output<T>()` (pointerup / Enter / blur commit transaction).
   - **Progressive `<ui--number>` Ergonomics & Single-Tab-Stop A11y**:
     - Use `<input type="text" inputmode="decimal" role="spinbutton">` as the **sole `tabindex="0"` stop** (zero tab traps; auxiliary steppers use `tabindex="-1"` with `pointerdown` focus forwarding).
     - When finite `min`/`max` (`max > min`) or `step` are provided, default progressive enhancements stay **in-field** (in-field progress fill bar, horizontal drag-to-scrub, and inline steppers revealed on hover/focus with `100ms–150ms` hover hysteresis) so neighboring rows in dense inspector panels are never occluded. Floating popover trays (`tray="popover"` via CDK Overlay) are opt-in.
     - Keyboard partition on `<ui--number>`: `ArrowUp`/`ArrowDown` (`1x step`), `Shift+ArrowUp/Down` (`10x step`), `PageUp`/`PageDown` (coarse jump), `Escape` (dismiss/revert draft), while `ArrowLeft`/`ArrowRight`/`Home`/`End` remain native text caret keys.

## Action Checklist

- [x] Agent consensus on Q1 (Framework boundary).
- [x] Agent consensus on Q2 (Entrypoint layout).
- [x] Agent consensus on Q3 (CSS token structure).
- [ ] Install and configure Playwright (`npm run test:e2e`).
- [ ] Add basic component smoke test in Playwright.

