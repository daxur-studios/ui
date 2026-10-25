---
type: Runbook
title: Cybersigillism UI and Hardware-Accelerated SVG Lighting Pipeline — Runbook
description: Chronological trace of feasibility analysis, concept art breakdown, architectural decisions, and implementation verification for Cybersigillism UI components using SVG vector geometry and feSpecularLighting chrome filters.
timestamp: 2026-10-25T19:25:00Z
plans: [/docs/plans/09_cybersigillism-svg-lighting.md]
tags:
  [cybersigillism, svg, filters, lighting, theming, slider, button, input, dialog, spikes, runbook]
---

# Cybersigillism UI and Hardware-Accelerated SVG Lighting Pipeline — Runbook

## 2026-10-25

### antigravity — Concept art review and technical feasibility analysis

- **[finding]** Reviewed the 11 cybersigillism concept files under `projects/demo/public/concept/cybersigillism/`, focusing on the owner's three favorites (`cycbersigil-concept (6).jpg`, `cycbersigil-concept (7).jpg`, `cycbersigil-concept (1).jpg`) and the UI control sheets (`cycbersigil-concept (1).png`, `cycbersigil-concept (2).png`, `cycbersigil-concept (4).jpg`).
- **[finding]** Visual deconstruction identifies two distinct requirements that standard CSS box borders (`border`, `clip-path`) cannot satisfy alone:
  1. **2D Silhouette:** Sweeping C-curve thorns that swell at vein junctions and taper to needle-sharp tips, concave crescent cutouts, and 4-point star flares at focal intersections.
  2. **2.5D Liquid-Chrome Material:** A bright specular spine running along the center of each vein, falling off into dark chrome reflection with a secondary sharp rim light and optional iridescent tinting (silver-black in `(6).jpg`, warm bronze in `(7).jpg`, violet-cyan anodized metal in `(1).jpg`).
- **[finding]** Evaluated the "recent browser UI rendering news" referenced by the owner: the WICG **HTML-in-Canvas API** (`drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`), which uploads live DOM subtrees into WebGL/WebGPU textures while preserving DOM hit-testing and accessibility. While promising for future GPU shader overlays, it currently requires Chrome's experimental `#canvas-draw-element` flag and is not yet suitable as the sole production dependency for `@daxur-studios/ui`.
- **[finding]** Evaluated three implementation tiers:
  - **Approach A (SVG Vector Paths + Native SVG `<filter>` 2.5D Lighting):** Uses `<feGaussianBlur in="SourceAlpha">` to generate a smooth heightmap from flat 2D vector paths, `<feSpecularLighting>` + `<feDistantLight>` / `<fePointLight>` to calculate 3D surface normals and metallic ridge highlights in hardware, and `<feComponentTransfer>` / `<feComposite>` to map chrome reflection curves and star-flare bloom. Works in all modern browsers today without flags, scales infinitely, preserves native DOM accessibility and `UiFormControl` behavior, and supports interactive pointer/thumb light tracking.
  - **Approach B (WebGL / WebGPU Canvas Overlay with MatCap / SDF Shaders):** Highest possible 3D shader fidelity, but adds a parallel WebGL context lifecycle per control or page.
  - **Approach C (Static 9-Slice Raster Assets via `border-image`):** Low runtime cost, but static baked lighting cannot glint interactively or morph vector geometry on state transitions.
- **[decision]** Owner selected **Approach A (SVG Vector Paths + Native SVG `<filter>` 2.5D Lighting)** and asked to establish Plan 09 and Runbook 09.
- **[decision]** To prevent thorn distortion when UI controls resize, controls must use **modular non-stretching SVG assemblies**: fixed-aspect thorny end-caps/corners (`overflow: visible`, `pointer-events: none`) bridged by stretchable vein/blade rails (`ResizeObserver`-driven viewBox or 3-slice/9-slice layout).
- **[action]** Created [`docs/plans/09_cybersigillism-svg-lighting.md`](/docs/plans/09_cybersigillism-svg-lighting.md) and [`docs/runbook/09_cybersigillism-svg-lighting.md`](/docs/runbook/09_cybersigillism-svg-lighting.md), and registered both in [`docs/plans/index.md`](/docs/plans/index.md) and [`docs/runbook/index.md`](/docs/runbook/index.md).
- **[decision]** Owner requested a dedicated page for testing and iterating on the procedurally generated shapes first, since achieving the asymmetric curved-thorn + crescent-webbing look of `cycbersigil-concept (6).jpg`, `(7).jpg`, and `(1).jpg` will likely take a few visual iterations before locking into UI controls.
- **[action]** Updated Plan 09 (§1–§5) to establish **Spike 09a (`cybersigil-shape-lab-spike`, `element: 'sigil'`)** as the first deliverable: a procedural geometry and SVG `<feSpecularLighting>` workbench featuring:
  - Closed-outline tapered Bezier ribbons (`buildTaperedRibbon`), concave crescent branch junctions (`buildCrescentBranch`), and hollow star-eye / spear cores (`sigil-math.ts`).
  - Three archetype specimen canvases targeting `(6).jpg` (asymmetric winged star), `(7).jpg` (bilateral filigree crest), and `(1).jpg` (anodized S-curve tendril), plus a 4th modular UI cap+rail seam test.
  - A toggleable reference comparison strip + flat-silhouette vs. 3D liquid-chrome toggle.
  - Live `<ui--slider>` and `<ui--button>` tuning controls for curvature, vein swell, thorn count, crescent depth, asymmetry, material palette (`mercury` / `bronze` / `anodized`), and `<feSpecularLighting>` filter parameters.

### claude — Spike 09a implementation (`cybersigil-shape-lab-spike`)

- **[action]** Added `projects/ui/src/lib/sigil/sigil-math.ts`: `buildTaperedRibbon`, `buildCrescentBranch`, `buildStarEyeSigil`, `buildSpearCrest`, the composers `composeWingedStar`, `composeFiligreeCrest`, `composeTendrilSCurve` and `composeModularUiJoin`, plus `sigil-math.spec.ts`. Exported from `public-api.ts`. Every constant is named and documented, and the math is pure and deterministic.
- **[action]** Added `ui--sigil-chrome` (`SigilChromeComponent`) with the `sigil-liquid-chrome` and `sigil-star-bloom` filters. Palettes are `--ui-sigil-{mercury,bronze,anodized}-{body,light,rim,bloom}` tokens in `_tokens.scss`, read through `data-material` scoping. Component SCSS holds no literal colours.
- **[action]** Registry: `SpikeElement` gains `'sigil'`, and entry #8 `cybersigil-shape-lab-spike` is added with status `pending`, disposition `candidate`, rank `null`. The catalog gets a `Sigil` pill, and the lazy route is registered.
- **[action]** Spike page: the three archetypes, the four-part join at rail widths 240, 420 and 600, six geometry `ui--slider`s, three filter `ui--slider`s, `ui--button` material presets and toggles, and the concept reference strip. The stage is the captured frame (928 x 540). Controls sit below it, so the thumbnail is not stretched by the 16:9 catalog card.
- **[decision]** Status stays `pending`. The shapes are a first pass the owner has not yet compared with the concept art, so the hypothesis is neither confirmed nor refuted.
- **[finding]** First-pass fidelity. The chrome reads as liquid metal in all three palettes, and the bloom and pointer glint work. The geometry reads as tapered blades with crescent thorns. Against the concept art: (7) is the closest silhouette. (6) lacks the looping C-curve wings and the extra armpit pockets, and its hollow star eye is too small to read as hollow at thumbnail scale. (1) reads as one blade, and its forked tip is small. The next shape pass needs loops, more thorn variety, and a larger eye.
- **[finding]** Pointer glint. One `fePointLight` is shared by all canvases, and each pointer position is mapped into the hovered canvas's own user units. Join canvases with different widths get an approximate glint. A filter per canvas would make it exact.
- **[finding]** Shell overlay. `app.html` pins `ui--theme-picker` at the top-right of the harness (`.theme-overlay`, `position: fixed`). It lands in the top-right corner of every spike capture, including this one. It is also the likely cause of the two `blank-frame` failures: the black 960 x 540 blank fixture captures about 2 KB of picker pixels. Neither file is in this change. Hiding the overlay during capture would be the fix, and that is a shell decision for the owner.
- **[finding]** Capture race. Each capture writes into `projects/demo/public/thumbnails/`, which the dev server watches. Parallel captures then hit reloads (`Execution context was destroyed`, `compressor is not a function`). Run the thumbnail project with `--workers=1` and a retry, as below.
- **[verification]** `npm test` (vitest): 100 tests passed, including 35 in `sigil-math.spec.ts`. `npm run test:dom`: 60 passed, including 6 in `cybersigil-shape-lab-spike.dom.spec.ts`. The `ResizeObserver is not defined` lines in that run come from the existing slider base class under jsdom and do not fail it. `npm run build:ui`: built. Playwright chromium: all 8 spike tests in `e2e/spikes/cybersigil-shape-lab-spike.spec.ts` pass. The first full `npm run test:e2e` run had 52 passing tests and 5 failing, and all 5 were in the thumbnails project (the 2 blank-frame tests and 3 capture races).
- **[verification]** Thumbnails: `npx playwright test --project=thumbnails --workers=1 --retries=3` wrote all 8 registry thumbnails, and `cybersigil-shape-lab-spike.webp` is 11.4 KB against the 40 KB budget. The two `blank-frame` tests still fail, for the overlay reason above. `npx --no-install prettier --check` passes on every changed file.
- **[open]** Owner review of the lab against `(6).jpg`, `(7).jpg` and `(1).jpg`, then the status decision for entry #8. The checklist item for shape iteration stays open until then.
