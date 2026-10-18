---
type: Runbook
title: Spike Standard and Static Thumbnails — Runbook
description: Append-only trace of how spike workflows differ across sibling projects and how the library's draft standard was derived.
timestamp: 2026-10-18T00:00:00Z
plans: [/docs/plans/02_spike-standard-and-thumbnails.md]
tags: [spikes, examples, playwright, thumbnails, catalog, runbook]
---

# Spike Standard and Static Thumbnails — Runbook

## 2026-10-18

- **[finding]** Four sibling projects run a spike workflow. Each has a copyable template, a registry entry carrying a hypothesis and status, and a WebP thumbnail. The core shape is shared. Details differ:

  | Project | Template | Registry | Thumbnails | Retention |
  | --- | --- | --- | --- | --- |
  | Triangular `demo-app` | `_spike-template/` + `/new-spike` command | `SPIKES` (`pending`, `passed`, `failed`, `inconclusive`) | runtime Dexie + WebP, 480 px | failed hidden by default |
  | Mycelia `sandbox` | `_spike-template/` + `/new-spike` command | `SANDBOX_ITEMS` (`kind`, `status`, `category`, `phase`) | runtime `ScreenshotService` + WebP | kept |
  | Brunos Space Program | `features/examples/_spike-template/` | `EXAMPLE_LINKS` (no status field) | runtime WebP, 480 px, auto + manual | deleted when finished |
  | Daxur Daemon scaffold | generated `sandbox/` with `sandbox-items.ts` | question, outcome, finding, thumbnail, plan/runbook | shared catalog service, static thumbnails supported | kept, failed hidden |

- **[finding]** Naming diverges. Triangular top-level folders use `*-spike`, but its `pages/` folder uses `*-poc`. Brunos Space Program uses `*-poc` for example pages and `_spike-template` for the template. Mycelia uses `*-spike` and `*-example`.
- **[finding]** Brunos Space Program also keeps a headless Node kind in `spikes/`, where each spike writes a `FINDINGS.md`. It tests physics math, not UI, so it is out of scope here.
- **[finding]** The thumbnail implementation is copied four times. Triangular's constants (480 px width, 0.82 WebP quality, 16 visible-channel threshold, 16 minimum pixels) reappear in Brunos Space Program and in Daemon's generator. Mycelia has its own service. This is the largest drift risk across the family.
- **[finding]** Runtime capture depends on `EngineService` render events (`renderComplete$`, `activeInstance`). A DOM-only page never fires them. Brunos Space Program's capture gives up after 20 seconds on such routes. Daemon's catalog explicitly supports static thumbnails for this reason.
- **[finding]** Triangular's falsifiable-suite rules (runbook 028) are the strongest discipline in the family: a two-day cap, unresolved means not passed, findings written back to the document carrying the assumption, and disposable fixtures. The library's standard inherits these.
- **[decision]** Use the spike and example split from Mycelia's `AGENTS.md`, and retire `poc`. *(Pending confirmation; see plan 02.)*
- **[decision]** Use a single registry file and the field set from Daemon's `sandbox-items.ts`, extended with `thumbnail` and `planRunbook`.
- **[decision]** Thumbnails are committed static files produced by a Playwright script, not runtime captures. Capture is fixed at 960 × 540 and clipped to a `data-spike-stage` element. A `data-spike-ready` attribute signals readiness.
- **[decision]** Encode WebP in the browser using a canvas, rather than adding an image dependency. Playwright cannot write WebP itself. *(Pending confirmation; `sharp` is the fallback.)*
- **[decision]** Demo pages use the `app-` selector prefix, while library components keep `ui--`. The two namespaces must not mix.
- **[action]** Drafted [`docs/standards/spikes.md`](../standards/spikes.md) with status `draft`, and this plan and runbook pair. Both indexes updated.
- **[constraint]** No source or configuration files were changed. `projects/demo` does not exist yet, and the existing `e2e/smoke.spec.ts` asserts only `expect(true).toBe(true)`. The thumbnail pipeline cannot be verified until the harness exists.
- **[verification]** Pending. The first end-to-end check will be a capture of one spike, its file size, and a deliberately blank-page rejection.

### Owner review of the open questions

- **[decision]** Failed and inconclusive spikes are kept in the catalog and hidden from the initial page view by a filter. This follows Mycelia and Daemon, not Brunos Space Program.
- **[decision]** Status is set by hand for now. Each spike's last Playwright result is shown beside it as a cross-check. A mismatch is flagged for review, not corrected automatically.
- **[decision]** Thumbnails use browser image compression (`browser-image-compression` `^2.0.2`, the version Triangular's engine uses), injected through the same adapter-token shape as `IMAGE_COMPRESSION_FUNCTION`. The earlier canvas-only plan is replaced. `sharp` is not needed.
- **[finding]** Triangular's `ScreenshotService` cannot capture a DOM-only page. It requires a live `EngineService`, and it renders through WebGL, camera jitter, and the CSS2D/CSS3D overlays. Only its adapter token, its `compress` option shape, and its download helper carry over. Its `maxSizeMB` default of 2 is far above a thumbnail budget, so the script must set its own limits: `maxWidthOrHeight: 480`, `maxSizeMB: 0.04`.
- **[decision]** `projects/demo` is created under plan 01. It is not a separate plan.
- **[constraint]** The compression package is not yet installed in the library or the demo. Installing it needs confirmation.
- **[action]** Updated standard §3, §6.2, §7 and §9, plan 02 decisions and work list. No source files changed.

### Demo harness created

- **[action]** Generated `projects/demo` as a zoneless, standalone Angular 20 application with routing and SCSS. `provideZonelessChangeDetection()` is in `app.config.ts`. The root shell is `demo-root`, with a single home route.
- **[action]** Added a path alias in `projects/demo/tsconfig.app.json`: `@daxur-studios/ui` → `../ui/src/public-api.ts`. The demo compiles against library source, not `dist/ui`. The home page imports `UI_LIB_VERSION` to prove the alias.
- **[action]** `playwright.config.ts` gained a `webServer` that runs `ng serve demo` on port 4200, and a `baseURL`. `e2e/smoke.spec.ts` replaces the `expect(true)` placeholder with a real check on the home page's `harness-ready` marker.
- **[action]** Installed `browser-image-compression@^2.0.2` as a root devDependency (resolved 2.0.2). The root `package.json` is the only one in this repo, so the demo's dev dependency lives there. The library's `projects/ui/package.json` is unchanged.
- **[mistake]** I generated the demo with `--skip-tests`, which wrote `"skipTests": true` schematic defaults into `angular.json`. I also deleted the karma `test` target and `tsconfig.spec.json`. No instruction asked for either. The user confirmed unit tests are wanted. The schematic defaults are removed. The karma target stays removed because Vitest is the unit runner per AGENTS.md.
- **[mistake]** I used `--skip-install`, so `@angular/router` was missing and the first build failed. It is now installed as a root devDependency (20.3.34, matching the other Angular packages).
- **[verification]** `ng build demo --configuration development` passes. `npm test` passes (1 test, the existing library version check). The Vitest include now also covers `projects/demo/src/**/*.spec.ts`.
- **[blocked]** `npx playwright test` starts the dev server but cannot launch Chromium: the browser is not installed. Installing it downloads a binary, so it needs the user's approval. The smoke test has not passed yet.
- **[finding]** `npm install` reported 4 vulnerabilities (2 moderate, 2 critical). Not investigated. Check whether they predate this change.
- **[open]** No demo unit test exists yet. Vitest runs in the `node` environment. Angular component specs need a DOM and TestBed. Two options: add a DOM environment (jsdom or happy-dom) with Angular's Vitest integration, or use Angular's `@angular/build:unit-test` builder through `ng test demo`. Needs a decision.

### Smoke test passing

- **[action]** Installed the Playwright Chromium headless shell (chromium-headless-shell 1248, Chrome 156.0.8078.4) after the user's approval. The download was from Playwright's CDN.
- **[finding]** The first smoke run reached the wrong server. Port 4200 belongs to a local apps dashboard, and `reuseExistingServer` attached to it. The harness now uses a dedicated port, 4310, set in `playwright.config.ts` as `HARNESS_PORT`.
- **[verification]** `npx playwright test`: 1 passed (chromium, home page renders the library version through the `@daxur-studios/ui` path alias).
- **[verification]** `ng build demo --configuration development` passes. `npm test` passes (existing library test only).
- **[open]** Unit test environment for demo component specs is still undecided (see above). The smoke test does not replace component unit tests.

- **[decision]** The user chose port 4226 for the harness. `HARNESS_PORT` in `playwright.config.ts` is now 4226, replacing 4310. The smoke test passes on it.
- **[action]** `angular.json` now sets `projects.demo.architect.serve.options.port` to 4226, so a bare `ng serve demo` also uses it. `playwright.config.ts` still passes the port explicitly.
