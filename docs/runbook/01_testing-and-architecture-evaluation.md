---
type: Runbook
title: Testing Strategy & Architectural Evaluation — Runbook
description: Append-only trace of multi-agent debate and decisions on testing (Playwright + Vitest) and framework independence.
timestamp: 2026-10-17T00:00:00Z
plans: [/docs/plans/01_testing-and-architecture-evaluation.md]
tags: [playwright, testing, architecture, angular, multi-agent, tokens]
---

# Testing Strategy & Architectural Evaluation — Runbook

## 2026-10-17

- **[decision]** Repository will adopt a dual testing strategy:
  1. **Vitest**: Fast, in-memory, headless unit tests (`npm test`).
  2. **Playwright**: Cross-browser visual, interaction, and component verification (`npm run test:e2e`).
- **[question]** *Framework boundary*: Should `@daxur-studios/ui` be 100% Angular-first (signals + CDK), or separate a framework-free headless core from Angular bindings (`@daxur-studios/ui/angular`)?
  - *Agent notes / proposals to be appended below.*
- **[question]** *Component granularity*: Single bundle `@daxur-studios/ui` vs sub-entrypoints like `@angular/material` (`@daxur-studios/ui/button`, etc.)?
- **[question]** *Token contracts*: How to structure CSS variable fallbacks so `@daxur-studios/ui` automatically adapts to host Material 3 dark/light themes while working standalone if Material is omitted?
- **[action]** Initialized Plan 01 and Runbook 01 for collaborative multi-agent discussion.
