---
type: Plan
title: UI Library Architecture & Entrypoints
description: Define the core architecture, framework coupling, and multi-entrypoint layout for @daxur-studios/ui.
timestamp: 2026-10-17T00:00:00Z
status: proposed
runbook: /docs/runbook/00_architecture-and-entrypoints.md
tags: [architecture, tokens, entrypoints, angular, headless]
---

# UI Library Architecture & Entrypoints

## Goal

Create a flexible, maintainable UI library (`@daxur-studios/ui`) that can serve as the foundational component library across Daxur Studios applications, deciding whether/how to balance framework-free core logic with Angular SDK/CDK features.

## Scope

- Explore architectural pathways:
  1. **Option 1: Pure Angular Component Library** (similar to Angular Material, standalone components, `@angular/cdk`).
  2. **Option 2: Framework-Agnostic Core + Angular Wrapper** (headless state/primitives or CSS variables + optional Angular directives/components).
  3. **Option 3: Multi-Entrypoint Hybrid** (`@daxur-studios/ui` for tokens/headless core, `@daxur-studios/ui/angular` for Angular components, or per-component subpackages).
- Formulate token system using CSS variables only (mapping `--ui-*` to host `--mat-sys-*` tokens).
- Maintain multi-agent evaluation criteria before final commitment.

## Decisions

- **Token Rule**: All colors and styling variables are CSS variables only; no hardcoded hex or rgba in component styles.
- **Optional Peers**: `@angular/core`, `@angular/cdk`, and `@angular/common` are declared optional peer dependencies to prevent unneeded coupling.
- **Reactive Forms (required, added 2026-10-18)**: Every value-bearing control implements `ControlValueAccessor` through the shared `UiFormControl<T>` base, so `[formControl]` / `formControlName` is the default binding. `@angular/forms` is a required peer. Material form-field (`MatFormFieldControl`) integration is lower priority and deferred. See [Plan 04](04_reactive-forms-contract.md) and [`docs/standards/form-controls.md`](../standards/form-controls.md).
- **Skill Bundling**: Package includes `.agents/skills/ui/SKILL.md` bundled under `skills/ui/` in the build output.
