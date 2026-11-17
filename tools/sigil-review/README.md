# sigil-review

Renders a procedural ornament generator across seeds and widths into a contact sheet beside its concept reference, and measures it.

```bash
npm run sigil:review -- --all
npm run sigil:review -- --subject blade-crest,tube-window-phone --seeds 1,2,3 --widths 320,390
npm run sigil:review -- --subject tube-window-phone --dressed   # adds the chrome-shaded window under each cell
npm run sigil:review -- --all --save-baseline                   # accept the current numbers as the baseline
```

Output (git-ignored) is `ignore/sigil-review/<subject>/`:

| file            | what it is                                                           |
| --------------- | -------------------------------------------------------------------- |
| `sheet.png`     | references plus every seed at every width; look at this first        |
| `report.md`     | measurements, flagged cells, and changes since the baseline          |
| `report.json`   | the same numbers for tools                                           |
| `baseline.json` | the saved reference run (`--save-baseline`); `report.md` diffs to it |

## Reading a report

- **Hard invariants fail the run (exit 1):** non-finite geometry, non-repeatable output, ink past the content box (`out-of-bounds`, `overshootPx` says how far; it saturates at the grid pad of 16 px), ink inside a keep-out box (`keep-out`, `keepOutDepthPx` says how deep).
- Everything else is reported, not failed: `coverage`, `boxFill`, `hairline` (share of thin strokes), `mass` (share of heavy fill), `fragments` (stray specks), `pockets` (enclosed holes), `mirror` (left-right symmetry), and seed `variety` (mean and the most similar pair; 0 means identical seeds).
- **Changes since baseline** lists only differences larger than 0.02 and 10% of the old value.

## Adding a subject

Add an entry to `REVIEW_SUBJECTS` in `projects/demo/src/app/fixtures/sigil-review/review-subjects.ts`: an id, reference images from `public/concept/cybersigillism/`, widths, and a `geometry(seed, width)` that returns pure ink paths (and keep-out boxes for frames). No generator changes are needed.

## Gotchas

- The `review` Playwright project only exists when this wrapper sets `SIGIL_REVIEW_SUBJECTS`, so `npm run test:e2e` never runs it.
- The dev server on port 4226 is started or reused automatically.
- Silhouettes only: chrome shading is never measured, because shading hides shape problems.
