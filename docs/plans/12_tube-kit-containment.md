---
type: Plan
title: Tube Kit Containment
description: Settle why the tube window frame reports ink past its edge, fix the review fixture's nested keep-out boxes, and make the kit either stay inside its box or declare how far it reaches.
timestamp: 2026-11-16T00:00:00Z
status: done
runbook: /docs/runbook/12_tube-kit-containment.md
tags: [cybersigillism, tube-kit, review, layout]
---

# Tube Kit Containment

## 1. Goal

Both tube windows fail the Plan 11 hard checks. Measuring where, with the review page open on
`tube-window-phone` seed 1 at 390 px, shows three separate causes, one of which is not the kit:

| cause                       | where                                                                                                                                                                                           | size                                               | whose fault                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Nested keep-out boxes       | phone layout: the grouped card (box 1) contains three row cards; the kit draws a fine tube around each row, so every row outline lands inside the group's keep-out box (370 sample points each) | explains the 60 px keep-out depth and the 8.5% hit | the fixture (`review-layouts.ts`), not the kit    |
| Medallion ring              | `sigil-tube-kit.ts`: radius up to `header * 0.82 * 1.08`, centre at `header * 0.32`, so its top is always above `y = 0`                                                                         | about 28 px above the frame at 390 px              | kit, possibly by design (a crown over the window) |
| Rib tips and divider lenses | ribs reach `endY = e` with Bezier controls above 0; lenses at dividers start at `x = -0.8`                                                                                                      | about 4 px and 0.8 px                              | kit, small                                        |

The edge rail itself is inside the frame. Desktop keep-out is already fine (at most 0.2%, 6 px deep).
Desktop was not inspected path by path; assume the same medallion cause until checked.

Goal: after this plan, `npm run sigil:review -- --subject tube-window-phone,tube-window-desktop`
passes, or the medallion is declared overhang with a number the harness checks.

## 2. Decision for the owner (before Phase 2)

Does the concept art show the medallion rising above the window's top edge?

- **Yes, crown:** keep the shape, add `overhang` to `ITubeScene` (px above the top, from the ring
  geometry), and let the review subject treat that much headroom as inside the box. Cheapest.
- **No:** keep the ring inside the frame: cap `ringR` by `cy` and lower `MEDALLION_CENTRE_RATIO`
  (or shrink the ring). This changes the look of every seed, so the owner reviews the sheet.

## 3. Phases

### Phase 1: fix the fixture (no kit change)

- [ ] `review-layouts.ts`: `keepOutBoxes` must skip a card that contains other cards. Add a pure
      helper `leafRects(rects)` and a spec: the phone layout yields the pill, three rows and three
      tail rows (not the group).
- [ ] Rerun `npm run sigil:review -- --subject tube-window-phone`. Record keep-out hit and depth.
- [ ] Probe the desktop frame the same way and list which paths cross the edge (browser console:
      `getBBox` per path with half stroke added). Record it in the runbook.

Done when: phone keep-out is reported without nested boxes and the desktop edge causes are listed.

### Phase 2: the medallion (needs the Section 2 answer)

- [ ] Implement the chosen option in `sigil-tube-kit.ts` and `sigil-tube-kit.spec.ts`
      (spec: for 30 seeds and widths 320 to 1100, the scene bounds are inside the frame, or the
      declared overhang is exact).
- [ ] If crown: add `overhang` to `ITubeScene`, let the review subject offset its geometry by it,
      and check the chrome kit spike still places the medallion glyph correctly.
- [ ] `ng build demo` and the chrome kit spike thumbnail still render.

### Phase 3: ribs and lenses

- [ ] Clamp rib control points to `y >= e` and start lens nodes at `x >= 0`. Spec the bounds.
- [ ] Rerun `--all`; save new baselines for the two tube subjects only.

Done when: `--all` exits 0, or the only remaining failure is a documented overhang.

## 4. Rules

- Edit only `sigil-tube-kit.ts` (+ spec), `review-layouts.ts` (+ spec), `review-subjects.ts` and the
  chrome kit spike if the glyph position needs it. Do not touch the blade engine or v2 files.
- Commit nothing unless the owner asks. Format only edited files.
- Open question not solved here: the tube frame barely changes between seeds. Measure
  `variety` before and after; do not change it in this plan.
