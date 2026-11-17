---
type: Runbook
title: Tube Kit Containment
description: Decisions and verification trace for fixing the tube window's containment failures.
timestamp: 2026-11-16T00:00:00Z
plans:
  - /docs/plans/12_tube-kit-containment.md
---

# Tube Kit Containment

## 2026-11-16: claude: Plan written

**Context.** Plan 11 left both tube windows failing. Before planning, I inspected the phone review page (seed 1, 390 px) path by path. The phone keep-out failure comes from the fixture's nested boxes (a group card containing its row cards), not the kit. The edge failure is real: the medallion ring sits about 28 px above the frame, plus about 4 px from rib tips and 0.8 px from divider lenses.

**Correction.** The Plan 11 runbook entry said the phone keep-out depth was "the kit, not the inset". That was wrong; it is the fixture. Corrected there.

**Not done.** No code changed. Owner decision pending: is the medallion meant to rise above the window?

**Next.** Phase 1 (fixture fix), then the owner's answer for Phase 2.

## 2026-11-17: claude: Phases 1 to 3 done

**Owner decision.** The medallion stays as a crown (owner looked at the phone frame and said it looks fine).

**Phase 1.** `leafRects` in `review-layouts.ts` (with spec) makes `keepOutBoxes` skip the grouped card. Phone keep-out hit went from 8.5% to 0, depth from 60 px to 2 px.

**Phase 2.** `ITubeScene.overhang` (px the ring rises above the frame, spec over 30 seeds and 4 widths). `IReviewGeometry.headroom` gives the harness that much room above the box, so ink past it still fails. The rasteriser and the sheet SVG both honour it. Headroom is rounded up to whole 2 px cells, so it can allow up to 2 px extra.

**Phase 3.** The desktop failures were ribs, not lenses: a rib's first control point rose far above the ring (about 75 to 110 px at 760 and 1100). `ribPath` now keeps that control point at or below the ring's top. The lens and rib-tip clamps in the plan turned out not to be needed; overshoot reads 0 everywhere.

**Result.** `--all`: 6 passed. Unit tests 239 passed. `ng build demo` succeeds. Tube baselines re-saved for both tube subjects.

**Not checked.** I have not looked at the new desktop sheet, so I do not know how the flatter ribs look. The chrome kit spike was not opened to check the medallion glyph. The tube frame still barely varies between seeds.
