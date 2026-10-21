---
type: Index
title: Plans Index
description: Index of architectural and implementation plans for @daxur-studios/ui.
timestamp: 2026-10-17T00:00:00Z
tags: [documentation, plans, index]
---

# Plans Index

| Plan                                                                                   | Status    | Description                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [00_architecture-and-entrypoints.md](00_architecture-and-entrypoints.md)               | proposed  | Architecture, framework integration boundaries, and multi-entrypoint structure for the UI library.                                                                                                                    |
| [01_testing-and-architecture-evaluation.md](01_testing-and-architecture-evaluation.md) | active    | Multi-agent evaluation of framework coupling (Angular-free vs CDK) and establishing Playwright alongside Vitest.                                                                                                      |
| [02_spike-standard-and-thumbnails.md](02_spike-standard-and-thumbnails.md)             | active    | Spike and example workflow for DOM-only UI pages, with static Playwright thumbnails. Draft standard in [`docs/standards/spikes.md`](../standards/spikes.md).                                                          |
| [03_slider-svg-spike.md](03_slider-svg-spike.md)                                       | completed | First UI spike passed; reflection identifies precise value editing and coordinated density presets as follow-up exploration.                                                                                          |
| [04_reactive-forms-contract.md](04_reactive-forms-contract.md)                         | active    | Required reactive forms (`ControlValueAccessor`) support for every value-bearing control via a shared base, starting with the slider. Standard in [`docs/standards/form-controls.md`](../standards/form-controls.md). |
| [05_multi-attempt-element-spikes.md](05_multi-attempt-element-spikes.md)               | active    | Multi-attempt HUD style explorations per UI element (`slider`, `button`), catalog preference ranking & `keep`/`discard` curation, and `UiFormControl<boolean>` support for buttons.                                   |
| [06_theming-and-density.md](06_theming-and-density.md)                                 | active    | Multi-theme system (scheme × mode × density) via `data-ui-*` scopes, a signal `UiThemeService`, and the reusable `ui--theme-picker` mounted in the demo shell.                                                        |
| [07_headless-slider-core.md](07_headless-slider-core.md)                               | active    | Headless `UiSliderBase` de-duplication of the slider attempts (spike 07a) and evaluation of a procedural slider-parts layer (spike 07b).                                                                              |
