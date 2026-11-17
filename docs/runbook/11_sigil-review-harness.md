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
- Measurements come from an occupancy grid (2 CSS px per cell) rasterised in the browser, with the measuring
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
shapes; the browser rasteriser later settled on a fixed cell size instead (see Phase 3).

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

## 2026-11-16: claude: Phase 3 done (rasteriser and review page)

**Action.** Added `review-rasterise.ts`, `review-params.ts`, `review-report.ts` and the fixture page
at `/fixtures/sigil-review` (query: `subject`, `seeds`, `widths`, `dressed`). It publishes
`window.__sigilReview` and sets `data-review-ready`. Deviation from the plan: the grid is 2 CSS px per
cell with 2 cells of padding, not a fixed 128, because a fixed grid would be far too coarse for
1100 px frames.

**Verification.** `npm test`: 232 passed. `ng build demo`: succeeded, no new budget warnings. Browser:
`blade-crest` shows 12 cells, both references, ready true, no flags, no console errors.
`tube-window-phone&dressed=1` shows 9 cells with the dressed window under each, ready true.

**First real finding.** Every tube-window-phone cell at 320, 390 and 480 flags `out-of-bounds` and
`keep-out` (keep-out overlap about 0.083 to 0.086). Either the tube kit really spills onto the
content boxes and the frame edge, or the 6 px inset is too tight. Phase 4 should settle which.

**Next.** Phase 4: command, sheet and report.

## 2026-11-16: claude: Phase 4 done (command, sheet and report), with a failing result

**Action.** Added `e2e/review/sigil-review.spec.ts`, `tools/sigil-review/run.mjs`, the
`sigil:review` npm script and a `review` Playwright project that only exists when the wrapper sets
`SIGIL_REVIEW_SUBJECTS`. Each subject writes `sheet.png`, `report.json` and `report.md` under
`ignore/sigil-review/<subject>/`, prints the report, and fails on console errors or hard invariants.

**Result of `--all`.** Four blade subjects pass with no flags. Both tube windows fail on every seed:

| subject             | widths        | flags                                                           |
| ------------------- | ------------- | --------------------------------------------------------------- |
| tube-window-desktop | 760, 1100     | out-of-bounds                                                   |
| tube-window-phone   | 320, 390, 480 | out-of-bounds, keep-out (about 8.5% of the keep-out area inked) |

The phone sheet shows the tube frame is almost identical across seeds, the rails run to the box edge,
and the kit draws its own double rim inside the pill and card boxes. So the flags look like a real
property of the kit plus a keep-out inset that may be too tight, not a harness bug. I did not change
either; the choice is the owner's.

**Not verified.** Whether the seed barely changing the tube frame is intended. Desktop sheet not
viewed. Seven thumbnail e2e tests fail in plain `npm run test:e2e` (not touched by this plan).

**Next.** Decide how to treat the tube-frame failures, then Phase 5 (baseline and deltas).

## 2026-11-16: claude: Phase 5 done (baseline, deltas, README) and the tube finding measured

**Action.** Added `overshootPx` and `keepOutDepthPx` per cell, `out-of-bounds` now means ink past the content box, grid pad raised from 2 to 8 cells so overshoot can be read up to 16 px. Added `review-delta.ts` (with spec), the baseline delta table in `report.md`, `--save-baseline`, and `tools/sigil-review/README.md`. Saved baselines for all six subjects; a rerun shows no changes.

**Sanity check (blade-crest, 12 seeds, median).**

| weight | hairline | mass | coverage |
| --- | --- | --- | --- |
| 0.5 | 0.637 | 0 | 0.151 |
| default | 0.341 | 0.068 | 0.225 |
| 1.8 | 0.196 | 0.349 | 0.301 |

The numbers move the right way. Registry reverted.

**Tube finding.** Desktop: keep-out is fine (at most 0.2% of the box, 6 px deep); only the edge is crossed. Phone: ink goes 60 px deep into the keep-out boxes (8.3 to 8.6%), far more than any inset could explain, which first looked like the kit but is not (corrected in Plan 12): the phone layout's grouped card contains its three row cards, and the kit's fine tube around each row lands inside the group's keep-out box. It is a fixture bug. Both: ink goes at least 16 px past the cell edge at every seed and width (the pad caps the reading), and a path-by-path look (Plan 12) shows the medallion ring rising about 28 px above the frame top, plus small rib and lens overshoots. Whether the medallion overhang is intended is the owner's call.

**Verification.** `npm test`: 237 passed. `ng build demo`: succeeded. `--all`: 4 pass, 2 fail (tube windows).

**Not verified.** Desktop tube sheet not viewed. Seed insensitivity of the tube frame unexplained. 7 thumbnail e2e failures untouched.

**Next.** Owner decides whether to fix the tube kit (separate work, not in Plan 11).
