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

- [ ] Create `projects/demo` as the Playwright harness, in zoneless mode (plan 01).
- [ ] Add `spike-registry.ts` and the spike route scaffold.
- [ ] Add `e2e/spikes/` and the first hypothesis spec.
- [ ] Install `browser-image-compression` (`^2.0.2`) as a demo dev dependency. Needs confirmation at install time.
- [ ] Add the adapter token and the `spikes:thumbnails` script with the blank-frame check.
- [ ] Add the placeholder SVG and `--ui-*` fallback styling.
- [ ] Capture the first thumbnail. Check its size against the 40 KB target.
- [ ] Add the "last spec result" cross-check to the catalog.
- [ ] Record the first real spike outcome in the runbook.

## Dependencies

- Plan 01 (testing and architecture) owns the Playwright setup and the demo harness.
  Its open items must be done first.
- Plan 00 (architecture and entrypoints) decides the selector convention for
  library components. Demo pages stay on `app-`.
