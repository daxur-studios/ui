---
type: Plan
title: Sigil Review Harness
description: One command that renders any procedural ornament generator across seeds and screen sizes into a contact sheet beside its concept reference, with measurements an AI agent can read and compare between runs.
timestamp: 2026-11-15T00:00:00Z
status: active
runbook: /docs/runbook/11_sigil-review-harness.md
tags: [cybersigillism, procedural, testing, playwright, tooling, agents, review]
---

# Sigil Review Harness

## 1. Goal

Make judging a procedural ornament generator cheap, repeatable and usable by an AI agent without
writing throwaway scripts.

One command must produce, for a named **subject** (one generator in one configuration):

1. a **contact sheet** image: many seeds at several widths, with the concept reference alongside;
2. a **report** of measurements per cell and per subject, as JSON and as a short Markdown table;
3. a **comparison** against a saved baseline, so an agent can see whether a change helped.

This comes before any further visual work on Plan 09. No generator is changed by this plan.

### Why

Every proof of concept so far was judged late and by eye, using one-off capture scripts kept in
temporary folders. The failures we kept hitting are measurable: shapes too thin ("twiggy"), too fat
("blobby"), seeds that look alike, stray fragments, ornament running over content. The harness turns
those into numbers and puts the picture next to the reference.

### Non-goals

- No change to `sigil-blade.ts`, `sigil-tube-kit.ts`, or any v2 file (`sigil-sdf.ts`,
  `sigil-grammar.ts`, `sigil-ui-parts.ts`, `sigil-strategy-*.ts`, `sigil-chrome.component.*`).
  Another session owns the v2 files; they are uncommitted. Read them, never edit them.
- No aesthetic pass/fail in CI. Measurements inform; only hard invariants fail a test.
- No automatic extraction from concept art, no style-sheet format. Those are follow-up plans.
- No new npm dependencies.

## 2. Design

### 2.1 Subject

A subject is one entry in a registry. It supplies pure geometry for measuring and a way to draw the
cell for looking.

```ts
/** One filled or stroked path contributing to the ornament silhouette. */
export interface IReviewInk {
  readonly d: string;
  /** Stroke width in subject units; omit for a filled path. */
  readonly strokeWidth?: number;
  /** Fill rule for filled paths. Default 'nonzero'. */
  readonly fillRule?: 'nonzero' | 'evenodd';
}

/** Geometry for one cell, in its own coordinate box. */
export interface IReviewGeometry {
  readonly width: number;
  readonly height: number;
  readonly ink: readonly IReviewInk[];
  /** Boxes that ornament must stay out of (text, controls). Frames only. */
  readonly keepOut?: readonly { x: number; y: number; width: number; height: number }[];
}

export type ReviewSubjectKind = 'motif' | 'frame';

export interface IReviewSubject {
  readonly id: string; // kebab-case, used on the command line and in output paths
  readonly kind: ReviewSubjectKind;
  readonly label: string;
  /** Reference image file names under /concept/cybersigillism/. */
  readonly references: readonly string[];
  /** Cell widths in CSS pixels. Motifs usually one; frames several. */
  readonly widths: readonly number[];
  /** Cell height for a given width. */
  heightFor(width: number): number;
  /** Pure, deterministic geometry. No DOM access. */
  geometry(seed: number, width: number): IReviewGeometry;
  /** Optional target ranges; cells outside are flagged, not failed. */
  readonly bands?: Partial<Record<ReviewMetricName, readonly [min: number, max: number]>>;
}
```

`geometry()` is the single source for both the measurements and the default picture. The default
cell draws `ink` as a flat dark silhouette on the pearl paper colour: flat fill is the honest view of
shape, and chrome hides shape problems. A subject may also name a real component to show in a second
"dressed" row (see 2.4); that row is for looking only and is never measured.

### 2.2 Initial subjects

| id                    | kind  | source                                         | widths        | references                               |
| --------------------- | ----- | ---------------------------------------------- | ------------- | ---------------------------------------- |
| `blade-crest`         | motif | `generateBladeSigil({ layout: 'crest' })`      | 240           | `cycbersigil-concept (6).jpg`, `(7).jpg` |
| `blade-wingspan`      | motif | `generateBladeSigil({ layout: 'wingspan' })`   | 320           | `cycbersigil-concept (6).jpg`, `(7).jpg` |
| `blade-starburst`     | motif | `generateBladeSigil({ layout: 'starburst' })`  | 240           | `cycbersigil-concept (7).jpg`            |
| `blade-runner`        | motif | `generateBladeSigil({ layout: 'runner' })`     | 480           | `cycbersigil-concept (1).jpg`            |
| `tube-window-desktop` | frame | `buildTubeWindow` with a canned desktop layout | 760, 1100     | `cyber (1).jpg`                          |
| `tube-window-phone`   | frame | `buildTubeWindow` with a canned phone layout   | 320, 390, 480 | `cyber (3).jpg`                          |

Blade ink is `[{ d: sigil.d }]` (filled). Tube ink is every `tubes` and `fineTubes` entry with
`strokeWidth: tube.width`, plus each `nodes` entry filled. Glass is not ink.

Canned frame layouts are pure functions of width (`desktopLayout(width)`, `phoneLayout(width)`) that
return an `ITubeLayout` minus the seed: a header, a pill, and stacked card rows placed with the same
proportions as `chrome-kit-window.component`. The card and pill rectangles, inset by the tube width,
are the `keepOut` boxes. Keep these in one file with named constants; they are the test fixture for
resize behaviour.

Adding a v2 subject (for example the SDF crest) is welcome once those files are committed. It needs
only an adapter in the registry; do not add one in this plan.

### 2.3 Measurements

All measurements come from an **occupancy grid**: the cell's ink rasterised to `GRID` × `GRID`
booleans (`GRID = 128`), aspect preserved, letterboxed. Rasterising happens in the browser with a
canvas and `Path2D` (handles arcs and curves for free). The measuring functions are pure functions of
the grid, so they are unit-tested in Node with hand-built grids.

Per cell:

| name          | meaning                                                                                 | catches               |
| ------------- | --------------------------------------------------------------------------------------- | --------------------- |
| `coverage`    | ink cells ÷ cells inside the ink bounding box                                           | too sparse, too solid |
| `boxFill`     | ink bounding-box area ÷ cell area                                                       | not filling its space |
| `hairline`    | share of ink removed by one erosion step (4-neighbour)                                  | twiggy, thin strokes  |
| `mass`        | share of ink surviving `MASS_EROSIONS = 4` erosion steps                                | blobby, fat joints    |
| `fragments`   | connected ink components (8-neighbour) smaller than `FRAGMENT_MIN_CELLS = 6`            | stray bits            |
| `pockets`     | enclosed background components (holes)                                                  | lost or missing loops |
| `mirror`      | intersection-over-union of the grid with its left-right mirror                          | unwanted (a)symmetry  |
| `keepOutHit`  | share of keep-out area covered by ink (frames only; `0` for motifs)                     | ornament over content |
| `outOfBounds` | `true` if any ink touches the grid edge (motifs) or lies outside the frame box (frames) | clipping              |

Per subject, across seeds at one width:

| name            | meaning                                               | catches              |
| --------------- | ----------------------------------------------------- | -------------------- |
| `varietyMean`   | mean pairwise `1 − IoU` between seed grids            | seeds all alike      |
| `varietyMin`    | smallest pairwise `1 − IoU`, with the two seeds named | near-duplicate seeds |
| `spread.<name>` | min, median, max of each per-cell measurement         | unstable quality     |

For frames, variety is measured after subtracting the ink common to every seed (the fixed rails),
otherwise the rails swamp the ornament. Per subject across widths (frames): `resizeStable` is `true`
when `keepOutHit` is `0` and `outOfBounds` is `false` at every width.

Hard invariants (these fail the Playwright run): every coordinate finite; same seed gives an
identical grid twice; `outOfBounds` false; `keepOutHit` ≤ `KEEP_OUT_TOLERANCE = 0.01`. Everything
else is reported, and flagged when a subject declares a band.

### 2.4 Review page

A demo fixture route, `fixtures/sigil-review`, driven by query parameters so both people and
Playwright can use it:

- `subject` (required id), `seeds` (`1-24` or `3,7,19`; default `1-12`), `widths` (override),
  `dressed` (`1` to add the component row, where the subject has one).

Layout, top to bottom: a header with the subject label and the reference images at a fixed height;
then one block per width; in each block a wrapping grid of cells. Each cell is exactly
`width × heightFor(width)` CSS pixels (no scaling: resize behaviour is the point), captioned with the
seed and flagged measurements. Cells carry `data-review-cell`, `data-seed` and `data-width`.

After render the page rasterises each cell's ink to a grid, runs the measurements and publishes
`window.__sigilReview = { subject, seeds, cells: [...], summary: {...}, ready: true }`. It also sets
`data-review-ready` on the root for Playwright to wait on.

The dressed row for the two tube subjects mounts `app-chrome-kit-window` inside a fixed-width
wrapper. Blade subjects have no dressed row in this plan.

### 2.5 Command and output

```
npm run sigil:review -- --subject blade-crest
npm run sigil:review -- --subject tube-window-phone --seeds 1-8 --dressed
npm run sigil:review -- --all
npm run sigil:review -- --subject blade-crest --save-baseline
```

`tools/sigil-review/run.mjs` parses the flags, sets `SIGIL_REVIEW_*` environment variables and spawns
`playwright test --project=review`. (A wrapper is used because inline environment variables are not
portable between PowerShell and POSIX shells.) The `review` Playwright project matches
`e2e/review/*.spec.ts` and is excluded from the default `chromium` project, the same way
`thumbnails` is.

Output goes to `ignore/sigil-review/<subject>/` (already git-ignored, regenerable):

- `sheet.png`: full-page screenshot of the review page.
- `report.json`: `{ subject, seeds, widths, cells, summary, generatedAt }`.
- `report.md`: summary table, flagged cells, and the delta table when a baseline exists.
- `baseline.json`: written only by `--save-baseline`.

The run prints the `report.md` path and the summary table to the console, so an agent gets the
result without opening files.

### 2.6 Files

New, all owned by this plan:

```
projects/demo/src/app/fixtures/sigil-review/
  review-types.ts               interfaces from 2.1, metric names
  review-grid.ts                grid type, erosion, components, IoU (pure)
  review-grid.spec.ts
  review-metrics.ts             per-cell and per-subject measurements (pure)
  review-metrics.spec.ts
  review-layouts.ts             canned desktop and phone tube layouts (pure)
  review-layouts.spec.ts
  review-subjects.ts            registry: the six subjects
  review-subjects.spec.ts       every subject: finite geometry, deterministic, ids unique
  review-rasterise.ts           Path2D + canvas to grid (browser only)
  sigil-review-fixture.component.ts / .html / .scss
e2e/review/sigil-review.spec.ts
tools/sigil-review/run.mjs
tools/sigil-review/README.md    how to run, how to add a subject, what each number means
```

Edited: `projects/demo/src/app/app.routes.ts` (one lazy route beside the other fixtures),
`playwright.config.ts` (`review` project; `chromium` ignores `**/review/**`), `package.json` (one
script). These three are shared files: change only the lines needed and do not reformat the rest.

Unit specs under `projects/demo/src/**` already run with `npm test`.

## 3. Phases

Each phase ends green on `npm test` and `npx ng build demo`, with a dated runbook entry.

### Phase 1: grid and measurements (pure, no browser)

- [x] `review-types.ts`, `review-grid.ts`, `review-metrics.ts` with specs.
- [x] Spec cases built by hand: solid square (`hairline` low, `mass` high), one-cell line (`hairline`
      1, `mass` 0), ring (`pockets` 1), two far dots (`fragments` 2), mirrored and lopsided shapes,
      identical grids (`variety` 0), disjoint grids (`variety` 1), keep-out overlap.

Done when: every measurement in 2.3 has at least one test that would fail if its formula were wrong.

### Phase 2: subjects and canned layouts

- [x] `review-layouts.ts` and `review-subjects.ts` with specs.
- [x] Spec: for seeds 1 to 30 and every declared width, geometry is finite and repeatable; tube
      keep-out boxes lie inside the frame; ids unique; every reference file exists in
      `projects/demo/public/concept/cybersigillism/`.

Done when: `npm test` passes and no engine file has changed (`git status` shows none of them newly
modified by this work).

### Phase 3: review page

- [ ] `review-rasterise.ts` and the fixture component; route added.
- [ ] Styles use design tokens only (no literal colours), separate `.ts`/`.html`/`.scss`, named
      constants with JSDoc, per `AGENTS.md`.
- [ ] Open `/fixtures/sigil-review?subject=blade-crest` and `?subject=tube-window-phone&dressed=1`
      in the browser; confirm cells, references and captions render, and
      `window.__sigilReview.ready` is `true`.

Done when: both URLs render with no console errors and the demo builds.

### Phase 4: command, sheet and report

- [ ] `e2e/review/sigil-review.spec.ts`, the `review` project, `run.mjs`, the npm script.
- [ ] The spec asserts the hard invariants from 2.3 and writes the three output files.
- [ ] Run `--all`; look at each `sheet.png`; record the six summary tables in the runbook.

Done when: `npm run sigil:review -- --all` exits 0, six folders exist under `ignore/sigil-review/`,
and `npm run test:e2e` still passes without running the review project.

### Phase 5: baseline and sanity check

- [ ] `--save-baseline` and the delta table in `report.md` (current, baseline, change per summary
      measurement).
- [ ] Sanity check that the numbers mean something: temporarily pass `weight: 0.5` and then
      `weight: 1.8` to the blade subjects (in the registry, not the engine) and confirm `hairline`
      and `mass` move the expected way; revert. Record the three sets of numbers in the runbook.
- [ ] `tools/sigil-review/README.md`.
- [ ] Save baselines for all six subjects.

Done when: the delta table shows the weight experiment correctly, and the README lets a fresh agent
add a subject without reading the harness code.

## 4. Acceptance

- One command per subject produces sheet, JSON and Markdown; `--all` covers every subject.
- A fresh agent can answer "did my change make crests less twiggy, and did any seed become a
  duplicate?" from `report.md` alone.
- Frame subjects prove resize safety at every declared width.
- No engine file edited; no new dependency; `npm test`, `npx ng build demo` and `npm run test:e2e`
  pass.

## 5. Rules for the implementing agent

- This is a shared, uncommitted tree with other sessions' work in it. Commit nothing unless the owner
  asks; if asked, stage only the paths in 2.6 by explicit path. Never stash, reset, clean or
  force-push.
- Format only the files you edit (`npx prettier --write <paths>`). `npx eslint` does not run here
  (no `eslint.config.*`); do not add one in this plan.
- The dev server may already be running on port 4226; Playwright reuses it.
- Keep the fixture stylesheet under the 4 kB component style budget.
- Append to the runbook as you go; tick the boxes above as phases close.

## 6. Open questions

- Should reference images be measured too, to derive target bands? Deferred: the references are
  shaded paintings and need a silhouette extraction step. `tools/sigil-trace/` (another session's
  work) may supply this later.
- Bands are empty at first. Set them from seeds the owner marks as good on the first sheets.
- Follow-up plans, not part of this one: a written style sheet per concept; concept art generated as
  kit sheets (isolated elements, flat background) so it can be measured.
