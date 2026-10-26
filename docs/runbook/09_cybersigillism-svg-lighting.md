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

### claude — Shape iteration pass 1 (`cybersigil-shape-lab-spike`)

- **[action]** Star eye in `sigil-math.ts`: base radius 44 → 60, valley ratio 0.42 → 0.30, hole ratio 0.30 → 0.22, diagonal ratio 0.6 → 0.5. The star now reads as a needle-sharp 8-point star around a scalloped hollow eye, nearer to the star in `(6).jpg`.
- **[action]** Thorn variety: new `SIGIL_THORN_SHORT_RATIO` (0.6) and `SIGIL_THORN_VARIETY_PERIOD` (3), so every third thorn is short. Thorn branch point end moved from `t = 0.85` to `0.9`, so thorns curl nearer the needle tip.
- **[action]** Hooks: new `hookShapes` helper (`SIGIL_HOOK_T` 0.7, `SIGIL_HOOK_TURN` 2 rad, `SIGIL_HOOK_BASE_LENGTH` 70). It adds a curl-back hook at the wing tips of the winged star and the crest, and a lower lobe hook on the tendril at `SIGIL_TENDRIL_HOOK_T` 0.6. Mirrored wings hook in opposite directions.
- **[action]** Crest veins: new `SIGIL_CREST_VEIN_WIDTH` (10), thinner than the star's 14, so the lace shows gaps between the thorns. Tendril fork spread 22 → 28.
- **[verification]** `npm test`: 100 passed. `npm run test:dom`: 60 passed. Spike Playwright (chromium): 8 passed. `npm run spikes:thumbnails -- --workers=1 --retries=3`: the spike thumbnail was rewritten at 12.0 KB. The 2 `blank-frame` failures remain, for the overlay reason above. Prettier passes on `sigil-math.ts`.
- **[finding]** Judged from a live render at the lab's archetype scale. The star is now the clearest match to `(6).jpg`. The crest still reads as two heavy scythe blades rather than open filigree, because the wing spines stay solid and merge with their thorns. The tendril's thickest point sits at its root (the taper runs from the left end), while `(1).jpg` swells mid-spine and tapers at both ends. Its shape stays a gap.
- **[open]** Next shape pass: a both-ends taper for the tendril (a bulb mid-spine), open lace in the crest by thinning or splitting the spine ribbons, and looping C-curl wings for the winged star. The checklist item stays open until the owner reviews these against the concept art.

### claude — Shape iteration pass 2 (`cybersigil-shape-lab-spike`)

- **[review]** Applied the planning agent's review of the first pass, as the procedural route (no hybrid templates yet). The review also asked for a visual decision on the chrome contrast, which is left unchanged for the owner.
- **[action]** Width model: `baseWidth` is now the full ribbon width, not the half-width. Ribbons are half as thick as before, and vein widths are 12 (star), 10 (crest), 14 (tendril), with thorns at 9. New `SIGIL_ROOT_TAPER_SPAN` (0.12) fades every ribbon from a needle at `t = 0`, so roots weld into their parents instead of ending in a blunt butt.
- **[action]** Armpit webs now run between outer contours. The parent's edge (`parentWidth`) and the thorn's armpit-side edge bound the web, so it fills the corner rather than sitting on centrelines. Thorns and hooks pass their vein width through.
- **[action]** Crest: the wing roots start at `SIGIL_CREST_ROOT_SHARE` (0.125) of the spear width from the axis, inside the spear, so the veins weld into it. Its control points are named constants, with no inline offsets.
- **[action]** Winged star: wing control points are named knot templates (`SIGIL_LEFT_WING_KNOTS`, `SIGIL_RIGHT_WING_KNOTS`), with a shared `wingSpine` helper. Tendril coordinates, fork curl and reach shares, and spear height are named constants too, so no composer carries inline coordinates.
- **[action]** Modular join: each cap now has an upper and a lower armpit, so it is mirror-symmetric about the centre line. Each cap's armpits start on the rail's edge. On the page, each join's SVG width is its share of the widest join, so all three joins render at the same px-per-unit (0.4511 measured for 240, 420 and 600).
- **[action]** Eyebrow changed to `UI LAB / PLAN 09 · SPIKE 09A`. The registry number stays `#8`. `SKILL.md` entry points and version notes now list the sigil exports.
- **[verification]** `npm test`: 102 passed, including 37 in `sigil-math.spec.ts`, which now checks the needle root, the taper width after the root fade, and cap symmetry. `npm run test:dom`: 60 passed. `npm run build:ui`: built. Spike Playwright (chromium): 8 passed. Prettier `--check` passes on every changed file. `npm run spikes:thumbnails -- --workers=1 --retries=3`: the spike thumbnail was rewritten at 10.5 KB. This run retried several spikes, and I did not recount the two `blank-frame` failures.
- **[finding]** Live render at archetype scale. The winged star reads as thin, separate C-curve wings with hooks around a hollow 8-point star, which is clearly closer to `(6).jpg`. The crest now reads as scythe veins that join the spear, so the lace has gaps. The tendril has a needle root and fork, but its mid-spine swell is still subtle against `(1).jpg`, and it has no second looped lobe.
- **[open]** Pass 3 candidates: a stronger mid-spine bulb for the tendril, a second looping lobe on the tendril, and a decision on the chrome contrast (darker core, brighter spine). The checklist item stays open for owner review.

### claude — Shape iteration pass 3 (`cybersigil-shape-lab-spike`)

- **[review]** Owner confirmed pass 3 on the tendril bulb and the chrome contrast. The pass 2 open items were the mid-spine bulb, a second looping lobe, and the contrast decision (darker core, brighter spine).
- **[action]** Tendril bulb: `tendrilBulbShape` is a solid ellipse on the spine at `SIGIL_TENDRIL_BULB_T` (0.45). Its half-length is 18, and its half-width is 7 at zero swell, scaled by `SIGIL_TENDRIL_BULB_SWELL_GAIN`. The vein at that point is about 5 units wide, so the knot is clearly swollen.
- **[action]** Tendril looping lobe: `tendrilLoopShape` is a ribbon arch that leaves the spine at `SIGIL_TENDRIL_LOOP_START_T` (0.16) and rejoins it at `SIGIL_TENDRIL_LOOP_END_T` (0.34). Both ends are needle points on the spine, so the arch welds in and encloses an eye. Its height is `SIGIL_TENDRIL_LOOP_HEIGHT` (56), scaled by spike length.
- **[action]** Chrome contrast: the body tokens are darker (`sigil-mercury-body` #101418, `sigil-bronze-body` #1f1009, `sigil-anodized-body` #0f0820), and the spine glint is brighter (`sigil-mercury-light` #ffffff, `sigil-bronze-light` #fff1d6, `sigil-anodized-light` #b8fff9). `SIGIL_CHROME_AMPLITUDE` rose from 1.15 to 1.4. The palettes stay in `_tokens.scss`, so the component SCSS has no literals.
- **[verification]** `npm test`: 102 passed. `npm run test:dom`: 60 passed. `npm run build:ui`: built. Spike Playwright (chromium): 8 passed. The spike thumbnail was regenerated at 10.8 KB. Prettier was run on the three edited files. Visual check in the lab: the tendril shows a knot and an arch above the spine, and mercury, bronze and anodized each read as a dark core with bright ridges.
- **[gap]** No targeted unit test was added for the bulb or loop. The existing finiteness sweep covers them, and the visual check stands in for shape assertions. The dev server also logs a compile error in `button-trace-pill-spike`. That file belongs to other in-flight work, so I left it alone.
- **[open]** Owner review of the bulb and lobe against `(1).jpg` and the contrast against `(6).jpg` and `(7).jpg`. The checklist item stays open. Registry entry #8 stays `pending` until the owner decides.

### claude — Shape iteration pass 4 (`cybersigil-shape-lab-spike`)

- **[review]** Applied the planning agent's pass 3 review. Each finding was checked against the code and a large render before it was changed.
- **[action]** Tendril lobe: `tendrilLoopShape` now uses a symmetric arch profile, `sin(pi t)^0.7` (`SIGIL_LOOP_ARCH_EXPONENT`). Both legs stay fuller near the spine and weld with equal thickness, so the eye closes under the chrome filter. `ribbonPoints` is now a wrapper around `outlinePoints(spine, widthAt)`, so a ribbon can take its own width profile.
- **[action]** Child thorns: `crescentBranchShapes` uses a near-blunt root (`SIGIL_CHILD_ROOT_SPAN` 0.02) instead of the 0.12 main-vein taper, capped at the parent's width at the junction so the base sits flush. The earlier blunt version stuck out past the parent on late thorns, and the capped version does not.
- **[action]** Join caps: `joinCapShapes` builds each thorn and its armpit once, from the rail edge. The duplicate set that started at `x = 30` in empty space is gone, and the armpit direction now points along the rail toward the centre.
- **[action]** Crest barbs: the `SIGIL_SPEAR_WIDTH / 4` divisor is named `SIGIL_BARB_ROOT_SHARE` (0.25).
- **[action]** Tests: `buildTendrilBulb` and `buildTendrilLoop` are exported as path builders, so the three new tests can check that swell thickens the bulb, that spike length lifts the loop, and that both are closed subpaths. `sigilWidthProfile` takes an optional root span.
- **[not applied]** The review's item 3 (anchor the upper and lower thorns at the bulb, so it reads as a vein junction) is a shape decision and is not in this pass. The bulb still stands alone.
- **[verification]** `npm test`: 105 passed (3 new). `npm run test:dom`: 60 passed. `npm run build:ui`: built. Spike Playwright (chromium): 8 passed. The spike thumbnail was regenerated at 10.1 KB. Prettier was run on the edited files.
- **[visual]** At 1600 px: the lobe is a full arch with both legs visible. The crest thorns sit flush on the veins with no blunt stubs. The join is one symmetric thorn cluster, with no hollow double crescent. One straight edge remains on the tendril's upper thorn armpit (`x ≈ 725` in the render).
- **[open]** Owner review of the tendril and crest against the concept art. The bulb junction (review item 3) and the remaining straight armpit edge are candidates for a later pass.

### claude — Strategy registry and per-archetype selects (`cybersigil-shape-lab-spike`)

- **[decision]** Competing geometry is swappable per archetype slot, not as a whole set. `ISigilStrategy` (`sigil-strategies.ts`) holds `star`, `crest`, `tendril` and `join` functions. A strategy may spread `SIGIL_BASELINE_STRATEGY` and override only the slots it rewrote. The chrome filter is held constant so competitors are compared on shape alone.
- **[action]** `sigil-math.ts` exports its shared kernel: `ISigilShape`, `solid`, `hole`, `shapesToPath`, `mirrorShapes`, `outlinePoints`, `ribbonPoints`, `crescentBranchShapes`, `starEyeShapes`, `thornShapes` and `hookShapes`. Strategies build shapes with these and must not change them. Changing a shared primitive affects every strategy.
- **[action]** The lab has a Strategy panel with one select per archetype and an "All archetypes" master select. The master shows "Mixed" when the slots disagree. A failed id falls back to the baseline.
- **[action]** `sigil-strategies.spec.ts` runs five contract checks per registered strategy: a full canvas for star, crest and tendril, finite output, finite output at extreme knobs, determinism, and a join at the requested rail width.
- **[status]** The registry holds only the baseline, so each select offers one option. Competing agents add their files and entries to `SIGIL_STRATEGIES`.
- **[verification]** `npm test`: 110 passed (5 new). `npm run test:dom`: 60 passed. `npm run build:ui`: built. `ng build demo`: built with no template errors. The lab Playwright spec: 8 passed. Prettier was run on the edited files.
- **[budget]** The lab stylesheet grew from about 4.86 kB to 5.23 kB. It was already over the 4 kB budget, so the owner decision on the budget is still open.
- **[open]** Each competing strategy still needs its own visual review against the concept art. The selects have not been exercised in the browser pane.

## 2026-10-26

### antigravity — Competing geometry strategy `chitin-filigree` (`cybersigil-shape-lab-spike`)

- **[action]** Added `projects/ui/src/lib/sigil/sigil-strategy-chitin-filigree.ts`, exporting `SIGIL_CHITIN_FILIGREE_STRATEGY` of type `ISigilStrategy` (`id: 'chitin-filigree'`, `label: 'Chitin Filigree'`), competing across all four archetype slots:
  1. `star` (Winged Star): Concept (6) multi-tiered scythe plumes with soaring primary wings, an under-wing looping armpit pocket with inner hook, and an 8-point hollow star eye with an elongated top cardinal needle.
  2. `crest` (Filigree Crest): Concept (7) bilateral ribcage with a trident crown diamond spear, open negative-space filigree lace eyes, upright antler combs, and outer double-horn terminal scythes.
  3. `tendril` (S-Curve Tendril): Concept (1) continuous flowing spine with mid-spine looping eye, sweeping lower belly claw, swollen terminal chitin node, upper crescent claw eye, and lower anchor/cross cluster.
  4. `join` (Modular UI Join): Interlocking dual-claw end-caps with concave crescent rail welds and an 8-point cyber-diamond star reticle that preserves exact `railWidth` and fixed cap aspect ratios.
- **[action]** Registered `SIGIL_CHITIN_FILIGREE_STRATEGY` in `SIGIL_STRATEGIES` in `projects/ui/src/lib/sigil/sigil-strategies.ts`. Avoided import cycle by deriving directly from `./sigil-math` without importing `SIGIL_BASELINE_STRATEGY`.
- **[action]** Added `projects/ui/src/lib/sigil/sigil-strategy-chitin-filigree.spec.ts` testing subpath counts, bilateral symmetry, determinism, exact width preservation across stretching widths (180, 240, 420, 600, 720), and finiteness across extreme parameter combinations.
- **[verification]** `npm test` (vitest): 128 tests passed across 11 test files (+18 tests total: 4 new registry contract test instances in `sigil-strategies.spec.ts` and 14 tests in `sigil-strategy-chitin-filigree.spec.ts`).
- **[verification]** `npm run test:dom`: 60 passed. `npm run build:ui`: built cleanly. `npx ng build demo`: built cleanly. `e2e/spikes/cybersigil-shape-lab-spike.spec.ts`: 8 passed.
- **[visual]** Captured lab stage renders in Playwright with `chitin-filigree` selected. The wings weld seamlessly into the hollow star eye without floating gaps. The filigree crest exhibits authentic negative-space lace windows and antler crowns. The tendril connects solidly into its terminal node with a dramatic sweeping lower claw and anchor cross.
- **[open]** Owner review of `chitin-filigree` against the baseline in the shape lab select controls and comparison with concept art (6), (7), and (1).

### codex — Competing geometry strategy `orbital-lace` (`cybersigil-shape-lab-spike`)

- **[action]** Added and registered `orbital-lace`, rewriting the tendril with a double-tapered spine, two open lobes and terminal crescent branches. Star, crest and join use the baseline composers; no shared helper needed an export.
- **[verification]** `npm test`: 132 passed. `npm run test:dom`: 60 passed, with existing jsdom `ResizeObserver is not defined` messages. `npm run build:ui` and `npx ng build demo` passed; the demo reported existing style budget warnings. The lab's eight Playwright tests passed. Full `npm run test:e2e`: 54 passed, three failed: a button chamfer trigger-count assertion and two blank-frame rejection assertions.
- **[visual]** Lab render with the shared chrome shows two open arches and a forked terminal. Compared with concept (1), the result is sparse and regular, with thin circular loops and too little of the reference's irregular webbing and lower cross cluster. The inherited star and crest remain simpler than concepts (6) and (7).
- **[open]** Owner comparison and selection; the tendril's loop shape, branch density and terminal silhouette need further visual refinement.

### codex — Art-directed tendril prototype `sculpted-web` (`cybersigil-shape-lab-spike`)

- **[action]** Added a second tendril competitor using a connected, sampled cubic outer contour and two shaped negative spaces. The baseline star, crest and join remain in its other slots. Curvature, spike length, asymmetry, swell and crescent depth deform the authored contours; thorn count does not yet change this prototype.
- **[visual]** At default settings the connected web, lower sweep and forked terminal are closer to concept (1) than Orbital Lace's circular loops. The fixed contour is still less detailed than the reference, and the two upper openings are small at lab scale. The star and crest are unchanged.
- **[verification]** `npm test`: 136 passed; `npm run test:dom`: 60 passed with the existing jsdom ResizeObserver messages; `npm run build:ui` and `npx ng build demo` passed (the demo retains stylesheet budget warnings). The eight lab Playwright tests passed. The registry contract checks finite extremes, deterministic paths and join width.
- **[open]** Owner visual review, topology at intermediate knob settings, and an art-directed thorn-count implementation. This prototype intentionally prioritizes a fixed silhouette over full knob semantics; its path closely follows the reference composition and should be evaluated for suitability as a reusable design.

### codex — Sculpted Web full-archetype iteration (`cybersigil-shape-lab-spike`)

- **[action]** Replaced the inherited star and crest with authored cubic silhouettes: asymmetric star wings and lower arc, and a mirrored crest framework with a central pendant. The join still uses the baseline composer. The tendril now adds up to six small authored spurs as thorn count increases.
- **[visual]** Checked the three shapes in the lab with shared chrome at thumbnail size against concepts (6), (7), and (1). The large sweeps and open crest are closer to the references. The star's lower arc and centre are still simpler than (6), the crest has fewer fine branches than (7), and the tendril's openings and added spurs are small at this scale.
- **[verification]** `npm test`: 137 passed, including a focused thorn-count test. `npm run test:dom`: 60 passed with existing `ResizeObserver is not defined` console errors. `npm run build:ui` and `npx ng build demo` passed; existing style-budget warnings remain. The eight Chromium lab Playwright tests passed.
- **[open]** Owner visual review. Star and crest use fixed authored branch topology; thorn count affects only the tendril, and swell and crescent depth only deform its openings. Contract tests check finite endpoint settings, but do not establish visual quality throughout the control range. No shared helper export was needed.
