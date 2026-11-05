# @daxur-studios/ui — Agent Instructions

Cross-tool rules for **Antigravity**, **Claude Code**, **Cursor**, **GitHub Copilot**, and **Codex**.

| Doc | Role |
| --- | --- |
| `AGENTS.md` (this file) | Short rules every agent loads at session start |
| [`docs/standards/form-controls.md`](docs/standards/form-controls.md) | Required reactive forms (`ControlValueAccessor`) contract for every form control |
| [`docs/plans-and-runbooks.md`](docs/plans-and-runbooks.md) | Plans (`docs/plans/`) + runbooks (`docs/runbook/`) rules |
| [`docs/work-log/README.md`](docs/work-log/README.md) | Lightweight records for standalone repository work that does not belong to an initiative pair |
| [`projects/ui/.agents/skills/ui/SKILL.md`](projects/ui/.agents/skills/ui/SKILL.md) | Packaged library skill documenting public entry points and APIs |

## Code Standards

- **JSDoc:** State *purpose + value* (why it exists, what it delivers).
- **No magic numbers:** Name every constant (`DEFAULT_TRANSITION_MS`, `ELEVATION_LEVEL_1`, etc.) with a JSDoc block directly above it.
- **CSS Variable Tokens Only:**
  - All colors and styling values must come from CSS custom properties (`--ui-*` or mapped system `--mat-sys-*` tokens).
  - **No literal hex (`#...`) or `rgba(...)`** in component styles.
  - Overlays on dark surfaces must use translucent white (`rgba(255, 255, 255, α)`), never black.
- **Angular Conventions:**
  - Separate `.ts`, `.html`, and `.scss` files for components (no inline templates or styles).
  - Modern signals: `input()`, `output()`, `computed()`, and signals instead of decorators/EventEmitters.
  - Built-in control flow: `@if`, `@for` (with stable `track`), `@switch`.
- **Form Controls (required):**
  - Every value-bearing control (slider, input, toggle, select, …) supports Angular reactive forms (`[formControl]`, `formControlName`) by extending `UiFormControl<T>` and providing `provideUiFormControl(...)`.
  - User changes go through `updateValueFromUser()`; form writes never echo back; touched on blur; read disabled state only via `isDisabled()`.
  - Material form-field integration is optional and lower priority. Full rules: [`docs/standards/form-controls.md`](docs/standards/form-controls.md).
- **Packaging & Skills:**
  - Reusable skills live in `projects/ui/.agents/skills/` and are bundled via `ng-package.json`.
  - Export public surfaces cleanly through entrypoint `public-api.ts`.

## Unit Tests

Run unit tests headlessly in a single run with watching off:
- **Unit Tests (Vitest):** Headless, in-memory Node tests with watching off:
  ```bash
  npm test
  ```
- **Component & Browser Tests (Playwright):** Cross-browser visual and interaction tests:
  ```bash
  npm run test:e2e
  ```

## Multi-Agent & Git Safety

- Multiple coding agents may share this workspace. Treat any file you did not modify in this session as in-flight work.
- **NEVER** overwrite, discard, or destroy uncommitted changes.
- Format only files you edited.

## Plans & Runbooks

- Every plan under `docs/plans/` has a reciprocal runbook under `docs/runbook/` sharing the same sequence number.
- Append dated findings/decisions to the runbook as work proceeds. Keep both indexes updated.
- Before repository work, find the relevant plan/runbook pair or decide whether this is standalone work for the monthly work log. Follow [`docs/plans-and-runbooks.md`](docs/plans-and-runbooks.md); choose the record type without asking whether documentation is wanted.
- Before handing completed repository work back, ensure its record is current and link it in your reply. Do not wait for the user to confirm that the conversation is over. Provider session IDs are optional.

## Demo videos

For narrated MP4 UI walkthroughs, read `node_modules/@daxur-studios/stop-motion-ui/skills/adopt-stop-motion-capture/SKILL.md`. The pilot recipe is `demos/buttons.demo.ts`; run `npm run demo:video -- --json`, or append `--narration off` for an explicitly silent demo. See `docs/runbook/10_stop-motion-demos.md` for the local package snapshot and supplied-audio setup.

In Codex, deliver the returned video with an inline Markdown media embed: `![Button demo](<absolute-path-to-demo.mp4>)`, using its actual absolute path and forward slashes on Windows. The user confirmed phone playback on 2026-11-05. Claude uses its available `SendUserFile` tool. This explicit delivery rule supplements the older installed package skill until its next snapshot; sharing does not establish listening quality or performance.

## Local package archives

All local `.tgz` files go under `/ignore/packages/`, and `/ignore/` must be gitignored.
Follow [Local package archives](docs/local-packages.md) for packing, dependency paths and clone setup.
