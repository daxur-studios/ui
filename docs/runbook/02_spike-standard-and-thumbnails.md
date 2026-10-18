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
