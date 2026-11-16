---
type: Runbook
title: Sigil Review Harness
description: Decisions and verification trace for the contact-sheet and measurement harness for procedural ornament generators.
timestamp: 2026-11-15T00:00:00Z
plans:
  - /docs/plans/11_sigil-review-harness.md
---

# Sigil Review Harness

## 2026-11-15: claude: Plan written

**Context.** Plan 09 produced three generator attempts (the v2 SDF engine, the blade engine of spike
09e and the tube kit of spike 09f). Each was judged by eye, late, from one-off capture scripts kept
in temporary folders. The owner asked whether the approach is on the right path for procedural,
resize-safe ornament that starts from concept art and can be iterated by AI agents, and then asked
for a plan to build a review harness before any more visual work.

**Decisions.**

- Harness first, visuals paused. No generator changes in Plan 11.
- A subject supplies pure geometry; the same geometry feeds the measurements and the default flat
  silhouette picture. Chrome shading is an optional extra row and is never measured, because shading
  hides shape problems.
- Measurements come from a 128 × 128 occupancy grid rasterised in the browser, with the measuring
  functions pure and unit-tested in Node. This avoids adding an image-decoding dependency.
- Frames are measured against canned layouts that are pure functions of width, with keep-out boxes
  for content, so resize safety is a number rather than an impression.
- Only hard invariants fail a run (finite, deterministic, in bounds, off the content). Aesthetic
  measurements are reported and compared with a baseline.
- Output goes to `ignore/sigil-review/`, which is already git-ignored.

**Not done.** Nothing is implemented. No code was changed for this plan.

**Next.** Phase 1 of the plan (grid and measurements).

## 2026-11-16: claude: Phase 1 done (grid and measurements)

**Action.** Added `review-types.ts`, `review-grid.ts` and `review-metrics.ts` under
`projects/demo/src/app/fixtures/sigil-review/`, with 24 specs on hand-built grids. All nine
per-cell measurements from the plan are covered, plus variety (with fixed-rail subtraction), spread
and keep-out overlap. The grid is width by height rather than fixed square so specs can use small
shapes; `REVIEW_GRID_SIZE = 128` is what the browser rasteriser will use.

**Verification.** `npm test`: 201 passed. No engine file touched.

**Notes for Phase 2.** `outOfBounds` means ink on the outermost grid ring, so the rasteriser must pad
each cell by at least one grid cell, or frame rails drawn at the box edge will always flag.

**Next.** Phase 2: canned layouts and the six subjects.

## 2026-11-16: claude: Phase 2 done (subjects and canned layouts)

**Action.** Added `review-layouts.ts` (pure `desktopLayout(width)`, `phoneLayout(width)` and
`keepOutBoxes`) and `review-subjects.ts` (the six subjects: four blade layouts, desktop and phone
tube windows) with specs. Keep-out boxes are every pill and card shrunk by 6 px. Specs cover 30
seeds at every declared width: finite, repeatable, sized to the cell, keep-out boxes inside the
frame, unique ids, and every reference image exists on disk.

**Verification.** `npm test`: 225 passed. `npx ng build demo`: succeeded. No engine file edited.

**Not yet known.** Whether the tube kit actually keeps ornament out of these boxes. That needs the
rasteriser, so it is first measured in Phase 4; the 6 px inset may need tuning then.

**Next.** Phase 3: rasteriser and review page.
