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

## Action Checklist

- [ ] Agent consensus on Q1 (Framework boundary).
- [ ] Agent consensus on Q2 (Entrypoint layout).
- [ ] Agent consensus on Q3 (CSS token structure).
- [ ] Install and configure Playwright (`npm run test:e2e`).
- [ ] Add basic component smoke test in Playwright.
