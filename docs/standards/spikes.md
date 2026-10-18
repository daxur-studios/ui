---
type: Standard
title: Spikes and Examples
description: Draft standard for falsifiable UI spikes, promoted examples, and the static Playwright thumbnail catalog for @daxur-studios/ui.
timestamp: 2026-10-18T00:00:00Z
status: draft
plans: [/docs/plans/02_spike-standard-and-thumbnails.md]
tags: [spikes, examples, playwright, thumbnails, catalog, standards]
---

# Spikes and Examples

> **Draft.** Rules marked *(proposed)* have not been confirmed. Rules in §9
> are decided. The rest are inherited from the sibling projects (Triangular,
> Mycelia, Brunos Space Program, Daxur Daemon) and the library's own
> [`AGENTS.md`](../../AGENTS.md). Provenance is in
> [`docs/runbook/02_spike-standard-and-thumbnails.md`](../runbook/02_spike-standard-and-thumbnails.md).
> Built so far: the registry, the pipeline and blank fixtures, the thumbnail
> script with its blank-frame check, the placeholder, and the catalog with its
> hidden-entry filter. Not built: the spec last-result cross-check in the catalog.
> The first spike, [`slider-svg-spike`](../plans/03_slider-svg-spike.md), passed.

## 1. Purpose

A **spike** answers one falsifiable question about a UI mechanism (for example,
"can a `<ui--number>` scrub a value and reach `valueCommit` without a stray text
selection?"). A spike is timeboxed and disposable. A failed spike is a useful
result, not a mistake.

An **example** is a spike that held up, cleaned into a small reference page for a
proven pattern. Examples have no status. They are meant to stay correct.

*(proposed)* Use the word **spike** for question-driven pages and **example** for
promoted reference pages. Do not add `poc` as a third term. Brunos Space Program
and the Triangular demo app already mix `*-poc` and `*-spike` names; this
standard retires that split for the library.

## 2. Scope

- **In scope:** Angular demo pages under `projects/demo/` that exercise
  `@daxur-studios/ui` controls.
- **Out of scope:** headless Node spikes (Brunos Space Program's `spikes/` with
  `FINDINGS.md`). They test engine math, not UI behaviour. If the library ever
  needs one, it gets its own standard.
- The demo project is a **prerequisite**, not yet created. Plan 01 proposes it
  as the Playwright harness. Create it before the first spike.

## 3. Lifecycle

```
pending ──► passed        hypothesis confirmed
        ├─► failed        hypothesis refuted (a valid, useful outcome)
        └─► inconclusive  timebox spent without a clear answer
```

- **Timebox:** *(proposed)* two working days, inherited from Triangular's
  falsifiable spike suite. Unresolved at the deadline means `inconclusive`,
  which is **not** `passed`.
- **Hypothesis:** one falsifiable question, written before any code. Ask the
  user if it is unclear. Do not invent one.
- **Finding:** one or two sentences: what actually happened, with numbers where
  they exist. Written into the registry entry and back into the plan or
  runbook that made the assumption. The finding is the deliverable, not the
  code.
- **Retention:** spikes stay in the catalog after they finish. `failed` and
  `inconclusive` entries are hidden from the initial catalog view by a page
  filter and remain reachable through it. Mycelia and Daemon both keep them;
  Brunos Space Program deletes them. The library follows Mycelia and Daemon.

## 4. Anatomy

One folder per spike, one lazy route, one registry entry.

```
projects/demo/src/app/spikes/<name>-spike/
  <name>-spike.component.ts      # class <PascalCase(name)>SpikeComponent
  <name>-spike.component.html
  <name>-spike.component.scss
```

- Selector: `app-<name>-spike`. *(proposed)* Demo pages use the `app-` prefix,
  never `ui--`. Library components own the `ui--` namespace. Keeping them
  separate stops agents from mixing page wrappers with library controls.
- Route: `spikes/<name>-spike` (lazy `loadComponent`).
- The stage element carries `data-spike-stage`. The page sets
  `data-spike-ready` on it once its initial state is rendered. The thumbnail
  script waits for that attribute.
- Build the mechanism from the library's own public API (dogfooding). Do not
  hand-roll the control under test. This mirrors the Triangular rule against
  hand-rolled renderers.
- Page styles use `--ui-*` tokens only, with no literal colours. This follows
  the library's `AGENTS.md`.

## 5. Registry

A single file, `projects/demo/src/app/spikes/spike-registry.ts`, holds every
entry. Fields follow Daemon's `sandbox-items.ts` and Mycelia's `SANDBOX_ITEMS`:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | kebab-case, equal to `<name>-spike` |
| `number` | yes | next sequential integer, creation order |
| `title` | yes | sentence case |
| `route` | yes | `/spikes/<name>-spike` |
| `hypothesis` | yes | the falsifiable question |
| `status` | yes | `pending` \| `passed` \| `failed` \| `inconclusive` |
| `finding` | when status ≠ `pending` | one or two sentences |
| `thumbnail` | yes | `thumbnails/<id>.webp`, or `null` (placeholder) |
| `planRunbook` | optional | link to the plan or runbook that owns the assumption |
| `dateISO` | yes | date created |

`kind` (`spike` | `example`) and `category` are *(proposed)* optional. Add a
category only when two or more entries need it.

## 6. Thumbnails: static, captured with Playwright

Catalog thumbnails are **generated static files**, not runtime captures. They
are git-ignored (`projects/demo/public/thumbnails/`) and rebuilt locally with
`npm run spikes:thumbnails`. The
Triangular, Mycelia and Brunos Space Program catalogs capture at runtime
because their scenes need a live WebGL engine. Those captures depend on
`EngineService` render events, which a DOM-only page does not have. (Brunos
Space Program would wait 20 s and give up.) Daemon already supports supplied
static thumbnails, so a static pipeline matches the family.

### 6.1 Capture

*(proposed)* A script, `npm run spikes:thumbnails`, drives the demo through
the Playwright `webServer` config and writes one file per registry entry:

- **Viewport:** fixed at 960 × 540, so every spike is framed the same way.
- **Determinism:** `animations: 'disabled'`, `caret: 'hide'`,
  `emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })`, wait for
  `document.fonts.ready`, wait for `[data-spike-ready]`, move the pointer to a
  neutral corner so no hover state is captured.
- **Region:** clip to `[data-spike-stage]`. The stage is required. A page
  without it fails its capture, because a full-viewport fallback would give
  the catalog inconsistent framing.
- **Blank-frame rejection:** reuse the Triangular thresholds. A pixel counts as
  visible when its alpha is above 0 and its brightest channel is above 16. At
  least 16 visible pixels are required. Fail the entry and keep the previous
  file.

### 6.2 Format and size

Playwright writes PNG or JPEG. It cannot write WebP. Compression uses
`browser-image-compression` (`^2.0.2`, the version Triangular's engine uses),
installed as a root devDependency.

1. Capture the 960 × 540 PNG of `[data-spike-stage]` with Playwright.
2. Load the package's browser build into the page with `addScriptTag`, then
   check the frame for blankness in the page. Count pixels whose alpha is above
   0 and whose brightest channel is above 16. Require at least 16. A blank frame
   fails the capture and the previous file is kept.
3. Compress in the page with `maxWidthOrHeight: 480`,
   `fileType: 'image/webp'`, `initialQuality: 0.82`, `maxSizeMB: 0.04`, and
   `useWebWorker: false`. The size cap is in MB, so 0.04 MB is about 40 KB.
4. Write `projects/demo/public/thumbnails/<id>.webp`.

Triangular's `ScreenshotService` is not reusable for capture. It requires a
live `EngineService`, and it renders through WebGL, camera jitter and the
CSS2D/CSS3D overlay layers. Its `maxSizeMB` default of 2 is far too large for
thumbnails, so the script always sets its own limits.

*Deviation from the earlier draft:* the draft proposed injecting compression
through an adapter token. Not built. The capture runs in Playwright's Node
process, so an Angular injection token has no consumer. Revisit only if the
catalog itself needs to compress at runtime.

Size budget: target under 40 KB per file, and flag any file over 80 KB for
review. *(proposed)*

### 6.3 Fallback

An entry with `thumbnail: null`, or a thumbnail file that is missing or fails to
load, shows the `app-spike-placeholder` component. The placeholder is rendered with `--ui-*` tokens, not an SVG file. An `<img>` cannot read page tokens. Recapture only replaces a file when the new capture passes the
blank-frame check, so a broken run never erases a good thumbnail.

### 6.4 When to recapture

Run `spikes:thumbnails` after changing a spike's page or its registry entry.
The `.webp` files are not committed, so the run is local. A fresh clone shows
placeholders until someone runs the script. *(proposed)* Run it in CI before
any build that publishes the catalog. Evidence screenshots
for runbook entries go under `docs/runbook/assets/02/` and are referenced from
the runbook. They are not catalog thumbnails.

## 7. Verification

- **Hypothesis test:** every spike has a Playwright spec at
  `e2e/spikes/<name>-spike.spec.ts` that asserts the hypothesis.
- **Status:** set by hand. The registry's `status` is the authoritative value.
  The catalog also shows the spec's last result beside it, as a cross-check. A
  mismatch between the two is flagged for review, not auto-corrected.
- **Gates before a status change:** `npm test`, `npm run test:e2e`, the
  thumbnail script, and `npx --no-install prettier --write <changed-paths>`
  for changed files only.

## 8. Promotion

When a spike passes and the pattern is worth keeping:

1. Move the proven mechanism to `projects/ui/src/lib/` as production code, or
   keep the page as an example (`kind: 'example'`, no status).
2. The library never imports from `projects/demo/`. The demo imports from the
   library. This is the same rule Triangular and Daemon apply to sandboxes.
3. Leave the original spike entry in place with its finding. Its page can be
   reduced to a thin harness around the promoted code.

## 9. Decisions

Resolved by the owner on 2026-10-18.

1. **Terms:** `spike` and `example` are the only two terms. `poc` is retired.
2. **Retention:** failed and inconclusive spikes are kept and hidden from the
   initial catalog view by a filter. See §3.
3. **Status:** set by hand for now. The spec's last result is shown beside it
   as a cross-check. See §7.
4. **Thumbnail encoding:** browser image compression through the adapter
   pattern. `sharp` is not needed. See §6.2.
5. **Demo harness:** `projects/demo` is created under plan 01. It is not a
   separate plan.
