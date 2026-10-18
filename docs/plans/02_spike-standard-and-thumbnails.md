---
type: Plan
title: Spike Standard and Static Thumbnails
description: Define how falsifiable UI spikes are structured, registered, captured as static Playwright thumbnails, and promoted into the library.
timestamp: 2026-10-18T00:00:00Z
status: active
runbook: /docs/runbook/02_spike-standard-and-thumbnails.md
tags: [spikes, examples, playwright, thumbnails, catalog, planning]
---

# Spike Standard and Static Thumbnails

## Goal

Give `@daxur-studios/ui` the same spike workflow that Triangular, Mycelia and
Brunos Space Program use, adapted for DOM-only pages: one template, one
registry entry per question, a visual catalog, and a falsifiable finding for
every spike. The standard is drafted in
[`docs/standards/spikes.md`](../standards/spikes.md).

## Decisions

Resolved by the owner on 2026-10-18. See standard §9.

- [x] `spike` and `example` are the only terms. `poc` is retired.
- [x] Failed and inconclusive spikes are kept, and hidden from the initial catalog view by a filter.
- [x] Status is set by hand. The spec's last result is shown beside it as a cross-check.
- [x] Thumbnails are encoded with browser image compression through the adapter pattern. No `sharp`.
- [x] `projects/demo` is created under this plan's dependency on plan 01, not as a separate plan.

## Work

- [x] Create `projects/demo` as the Playwright harness, in zoneless mode (plan 01).
- [x] Add `spike-registry.ts` (empty) and the pipeline fixture route.
- [ ] Add the spike route scaffold and `e2e/spikes/`. Waits for the owner's first hypothesis.
- [x] Install `browser-image-compression` (`^2.0.2`) as a root devDependency.
- [ ] ~~Add the adapter token~~ Dropped. Compression runs in the page, so no injection token is needed (standard §6.2).
- [x] Add the `spikes:thumbnails` script with the blank-frame check, and exercise the rejection with a blank fixture (`e2e/thumbnails/blank-frame.spec.ts`).
- [x] Add the placeholder component with `--ui-*` fallback styling.
- [x] Capture the pipeline fixture thumbnail (1.4 KB, 480 × 270). No spike thumbnail yet.
- [x] Add the catalog at `/catalog`, with failed and inconclusive spikes hidden by a filter.
- [ ] Add the "last spec result" cross-check to the catalog.
- [ ] Record the first real spike outcome in the runbook.

## Dependencies

- Plan 01 (testing and architecture) owns the Playwright setup and the demo harness.
  Its open items must be done first.
- Plan 00 (architecture and entrypoints) decides the selector convention for
  library components. Demo pages stay on `app-`.
