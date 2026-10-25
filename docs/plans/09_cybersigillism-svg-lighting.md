---
type: Plan
title: Cybersigillism UI and Hardware-Accelerated SVG Lighting Pipeline
description: Dedicated procedural cybersigil shape & chrome-lighting lab page first, followed by modular non-stretching SVG cybersigil geometry (thorns, star flares, 3-slice rails, 9-slice frames) shaded with native SVG feSpecularLighting chrome filters across sliders, buttons, inputs, title dividers, and dialogs.
timestamp: 2026-10-25T19:25:00Z
status: active
runbook: /docs/runbook/09_cybersigillism-svg-lighting.md
tags:
  [
    cybersigillism,
    procedural,
    svg,
    filters,
    lighting,
    theming,
    slider,
    button,
    input,
    dialog,
    spikes,
    planning,
  ]
---

# Cybersigillism UI and Hardware-Accelerated SVG Lighting Pipeline

## 1. Goal

Explore and build a **Cybersigillism** visual direction for `@daxur-studios/ui` — characterized by curved, razor-sharp, organic metallic thorns, hollow star-flare junctions, and liquid-chrome 2.5D bevels — starting with a **dedicated Procedural Shape & Lighting Lab page** to iterate on the organic asymmetric geometry until it matches the three target concept artworks, and then applying those proven procedural primitives across core UI controls:

1. **Procedural Cybersigil Shape & Chrome Lab (`/spikes/cybersigil-shape-lab-spike`)** — dedicated workbench for iterating on procedural bezier/thorn generation and SVG `<feSpecularLighting>` liquid-chrome shading against the three favorite concept references.
2. **Slider** (tapered blade rail, thorny end-caps, star-flare sigil thumb)
3. **Buttons** (action and `UiFormControl<boolean>` toggle buttons with thorny wing end-caps and glowing chrome veins)
4. **Input border** (`UiFormControl<string>` text field framed by asymmetric/mirrored thorn clusters and razor rails)
5. **Title underline / crest divider** (3-part wing + vein + centerpiece star sigil assembly)
6. **Dialog / panel border** (9-part corner thorn clusters + optional top crest + double-vein side rails around a readable dark glass interior)

### Visual Reference Targets

Concept art resides under `projects/demo/public/concept/cybersigillism/`:

1. **Favorite #1 — Asymmetric winged star & liquid-mercury shading (`cycbersigil-concept (6).jpg`):** Sweeping asymmetric C-curve wings that swell at branch junctions, carve deep concave crescent pockets, and taper to needle-sharp tips around a central 8-point hollow star eye, rendered with high-contrast dark mercury chrome ridges.
2. **Favorite #2 — Symmetric filigree crest & warm-chrome relief (`cycbersigil-concept (7).jpg`):** Balanced bilateral thorny filigree with a central vertical spear/diamond spine, rhythmic hook barbs, outer scythe wings, and sharp internal bevel ridges along every vein spine.
3. **Favorite #3 — Iridescent / anodized S-curve tendril (`cycbersigil-concept (1).jpg`):** Flowing asymmetric S-curve spine with opposing crescent hooks, forked needle tips, and violet + cyan specular reflections mapped across curved liquid-metal surfaces.
4. **UI control anatomy sheets (`cycbersigil-concept (1).png`, `cycbersigil-concept (2).png`, `cycbersigil-concept (4).jpg`):** Reference layouts for buttons, toggles, sliders, inputs, title borders, scrollbars, and panel/transmission frames.

---

## 2. Decisions

1. **Dedicated Procedural Shape Lab First (Spike 09a):**
   - Procedural cybersigil geometry (asymmetric C-curves, variable-width vein swelling, concave crescent branch junctions, hollow star eyes) requires visual iteration before locking into UI control chrome.
   - We first build a dedicated spike page (`/spikes/cybersigil-shape-lab-spike`, registered under `element: 'sigil'` in `spike-registry.ts`) that renders procedural specimens side-by-side with the three reference concepts (`(6).jpg`, `(7).jpg`, `(1).jpg`) and exposes live tuning controls (dogfooding `<ui--slider>` and `<ui--button>`) for both geometry and SVG `<filter>` lighting.
2. **Approach A — Native SVG Vector Geometry + Hardware-Accelerated `<filter>` 2.5D Lighting:**
   - Rather than static raster 9-slices (which cannot animate lighting or morph paths) or the experimental Chromium HTML-in-Canvas API (`#canvas-draw-element` / `drawElementImage`, which is not yet cross-browser production-ready), we use **pure SVG vector paths** processed through a shared **SVG `<filter>` lighting pipeline**:
     - `<feGaussianBlur in="SourceAlpha">` converts 2D vector silhouettes into a smooth 3D heightmap (wider vein junctions become higher ridges; needle tips taper to zero).
     - `<feSpecularLighting>` (paired with `<feDistantLight>` or interactive `<fePointLight>`) computes 3D surface normals from that heightmap and renders real-time metallic ridge highlights.
     - `<feComponentTransfer>` / `<feColorMatrix>` and `<feComposite>` layer dark-chrome body shading, sharp rim highlights, iridescent tinting, and star-flare bloom over the vector geometry.
3. **Non-Stretching Modular Kit-of-Parts (3-Slice Rails & 9-Slice Frames):**
   - Stretching a cybersigil SVG with `preserveAspectRatio="none"` across a fluid control distorts thorn angles. Every responsive control is instead assembled from **fixed-aspect ornamental caps** and **stretchable connecting rails**:
     - **3-part horizontal assembly** (buttons, inputs, sliders, title dividers): `[Left Thorn Cluster]` (fixed aspect) + `[Stretchable Vein / Blade Rail]` + `[Right Thorn Cluster]` (fixed aspect) + optional `[Center / Thumb Star Sigil]` (fixed aspect).
     - **9-part frame assembly** (dialogs, panels, alerts): 4 fixed-aspect corner thorn clusters + optional top/bottom crest sigils + 4 stretchable side rails framing a high-contrast interior surface.
     - Ornamental SVG layers use `overflow: visible` and `pointer-events: none` so needle tips can extend outside the rectangular layout box without shifting neighboring layout or inflating hit targets.
4. **Token-Only Styling (`--ui-*`) and Metallic Palettes:**
   - Component styles remain strictly free of literal `#hex` or `rgba()` values (`AGENTS.md`).
   - SVG filter primitives and gradient stops read `--ui-*` custom properties (or theme-scoped filter tokens for `mercury` silver-chrome from `(6).jpg`, `bronze` warm chrome from `(7).jpg`, and `anodized` violet-cyan from `(1).jpg`).
5. **Interactive Specular Glint with Deterministic Fallback:**
   - Interactive controls can bind `<fePointLight>` coordinates (`x`, `y`, `z`) to pointer coordinates or slider thumb position so the metallic spine physically glints during hover or drag.
   - When `prefers-reduced-motion: reduce` is active (including during `npm run spikes:thumbnails`), lighting falls back to a deterministic static light angle so Playwright captures remain 100% reproducible.

---

## 3. Architecture: Procedural Sigil Engine & SVG Chrome Filter

### 3.1 Procedural Geometry Anatomy (`projects/ui/src/lib/sigil/sigil-math.ts`)

Why naïve SVG strokes fail cybersigillism: standard uniform-width `<path stroke-width="...">` lines look like wireframes rather than organic liquid metal. The silhouettes in `(6).jpg`, `(7).jpg`, and `(1).jpg` are **closed filled outlines (`<path d="M ... Z">`)** constructed from three geometric rules:

1. **Tapered Spine Ribbons (`buildTaperedRibbon`):**
   - Given a cubic Bezier spine curve $C(t)$ for $t \in [0, 1]$ and a width profile $w(t)$ that swells at branch nodes ($w_{\max}$) and tapers to a needle point ($w(1) = 0$ with sharp tangent convergence), offset the left and right contour normals $\pm n(t) \cdot w(t)$ into a single closed filled SVG path.
2. **Concave Crescent Webbing at Branch Junctions (`buildCrescentBranch`):**
   - Where a child thorn branches off a parent vein, the inner armpit is never a sharp V-corner; it is a **smooth concave crescent arc** (visible throughout `(6).jpg` and `(1).jpg`) while the outer edge sweeps continuously into a needle tip.
3. **Hollow Star-Eye & Spear Cores (`buildStarEyeSigil`, `buildSpearCrest`):**
   - **Star Eye (`(6).jpg` center):** Alternating long cardinal needle spikes and shorter diagonal thorns radiating from a scalloped concave inner ring (compound path with inner cutout).
   - **Spear Crest (`(7).jpg` center):** Vertical diamond-lance axis with mirrored C-curve rib branches and forked crown tips.

### 3.2 Dedicated Procedural Shape Lab (`cybersigil-shape-lab-spike`)

The lab page (`/spikes/cybersigil-shape-lab-spike`) is structured to make iterating on `sigil-math.ts` fast and falsifiable:

1. **Three Archetype Canvases (matching the 3 favorites):**
   - **Archetype 1 — Asymmetric Winged Star (`concept (6)` target):** Hollow 8-point star eye flanked by asymmetric sweeping left/right C-curve thorn wings and lower crescent hooks.
   - **Archetype 2 — Bilateral Filigree Crest (`concept (7)` target):** Symmetric vertical spear axis with mirrored multi-branch scythe wings.
   - **Archetype 3 — Flowing S-Curve Tendril (`concept (1)` target):** Asymmetric horizontal S-curve spine with opposing crescent barbs and forked tail spikes.
   - **Archetype 4 — Modular UI Join Preview:** Live preview of `[Left Cap] + [Stretchable Rail] + [Center Sigil] + [Right Cap]` across variable widths to verify zero seam breaks.
2. **Reference Comparison Mode:**
   - Toggleable reference strip displaying `cycbersigil-concept (6).jpg`, `(7).jpg`, and `(1).jpg` alongside the procedural SVG outputs, plus a **Flat Silhouette vs. 3D Chrome Filter** toggle so silhouette math and lighting math can be inspected independently.
3. **Live Parameter Workbench (dogfooding `<ui--slider>` and `<ui--button>`):**
   - **Geometry sliders:** `curvature` (C-curve whip tension), `swell` (junction thickness), `thornCount` (branching barbs), `asymmetry` (left/right organic offset & seed), `crescentRadius` (inner webbing depth), `spikeLength` (needle extension).
   - **Material & `<filter>` sliders/toggles:** Material palette (`mercury` / `bronze` / `anodized`), `heightmapBlur` (`feGaussianBlur stdDeviation`), `surfaceScale` (ridge height), `specularExponent` (chrome sharpness), and pointer-tracked `<fePointLight>` toggle.

---

## 4. Planned Spikes

Following [`docs/standards/spikes.md`](../standards/spikes.md), each spike answers a falsifiable question and registers in `projects/demo/src/app/spikes/spike-registry.ts` (extending `SpikeElement` with `'sigil'`):

| Spike                                                                      | Target Elements                                                                  | Falsifiable Hypothesis                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **09a — `cybersigil-shape-lab-spike`** (`element: 'sigil'`, `attempt: 1`)  | Procedural Shape & Lighting Workbench                                            | Can pure procedural Bezier-ribbon + crescent-junction math (`sigil-math.ts`) and a hardware-accelerated SVG `<feSpecularLighting>` filter generate the three target cybersigil archetypes (asymmetric winged star `(6).jpg`, bilateral crest `(7).jpg`, anodized S-tendril `(1).jpg`) with live `<ui--slider>` parameter tuning, flat-vs-chrome inspection, and pointer-reactive specular glints using `--ui-*` tokens only? |
| **09b — `slider-cybersigil-spike`** (`element: 'slider'`, `attempt: 5`)    | Slider (`UiSliderBase` / recipe)                                                 | Can a cybersigil slider render fixed-aspect thorny end-caps, a tapered chrome blade track, and a star-flare thumb shaded by the SVG `<feSpecularLighting>` filter (with thumb-tracking `<fePointLight>`) that resizes via `ResizeObserver` without distorting thorn proportions and passes the full `UiFormControl<number>` + Playwright contract?                                                                           |
| **09c — `button-cybersigil-spike`** (`element: 'button'`, `attempt: 4`)    | Button (`UiFormControl<boolean>`)                                                | Can a cybersigil button frame its label with non-stretching thorny wing clusters (`overflow: visible`) and liquid-chrome rails that shift specular intensity and star-flare bloom across default, hover, press, disabled, and latched (`aria-pressed="true"`) states using `--ui-*` tokens only?                                                                                                                             |
| **09d — `cybersigil-chrome-kit-spike`** (`element: 'sigil'`, `attempt: 2`) | Input border (`UiFormControl<string>`), Title divider crest, Dialog/panel border | Can the shared 3-slice and 9-slice cybersigil SVG assembly + `<feSpecularLighting>` filter frame a reactive text input, a section title underline crest, and a dialog/panel container while preserving interior text readability, single-tab-stop accessibility, and deterministic Playwright thumbnail capture?                                                                                                             |

---

## 5. Action Checklist

- [x] Create Plan 09 (`docs/plans/09_cybersigillism-svg-lighting.md`) and Runbook 09 (`docs/runbook/09_cybersigillism-svg-lighting.md`), and register both in `docs/plans/index.md` and `docs/runbook/index.md`.
- [x] Add the dedicated **Procedural Shape & Lighting Lab (`cybersigil-shape-lab-spike`)** as Phase 1 / Spike 09a before control integration.
- [x] Extend `SpikeElement` in `spike-registry.ts` and `catalog-page` filter pills to include `'sigil'`.
- [x] Build `projects/ui/src/lib/sigil/sigil-math.ts` (tapered Bezier ribbon builder, concave crescent branch junctions, hollow star-eye generator, and the 3 archetype composers) + unit tests (`sigil-math.spec.ts`).
- [x] Build the SVG `<filter>` liquid-chrome pipeline (`mercury`, `bronze`, `anodized` palettes + flat silhouette debug mode) with `--ui-*` token bindings and reduced-motion determinism.
- [x] Implement **Spike 09a (`cybersigil-shape-lab-spike`)** with live `<ui--slider>` / `<ui--button>` tuning controls and reference comparison strip + DOM spec + Playwright spec. Registry status stays `pending` until the owner review below.
- [ ] Iterate on procedural shape math in the lab with the owner until the asymmetric and symmetric shapes match the visual standard of `(6).jpg`, `(7).jpg`, and `(1).jpg`.
- [ ] Implement **Spike 09b (`slider-cybersigil-spike`)** + DOM spec + Playwright spec.
- [ ] Implement **Spike 09c (`button-cybersigil-spike`)** + DOM spec + Playwright spec.
- [ ] Implement **Spike 09d (`cybersigil-chrome-kit-spike`: Input border, Title underline crest, Dialog/panel frame)** + DOM spec + Playwright spec.
- [ ] Run `npm test`, `npm run test:dom`, `npm run test:e2e`, `npm run spikes:thumbnails`, and Prettier; record findings in Runbook 09.

---

## 6. Open Questions

1. **Theme integration (after Spike 09a):** Once we dial in the three metallic reflection palettes (`mercury` silver from `(6).jpg`, `bronze` from `(7).jpg`, `anodized` violet-cyan from `(1).jpg`) inside the Shape Lab, should we promote them to global schemes in `<ui--theme-picker>` (`data-ui-scheme`), or keep them as a palette input on the sigil filter?
