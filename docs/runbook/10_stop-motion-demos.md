---
type: Runbook
title: Stop Motion UI Demo Pilot
description: Decisions and verification for the installed-package narrated demo workflow.
timestamp: 2026-11-05T00:00:00Z
plans:
  - /docs/plans/10_stop-motion-demos.md
---

# Stop Motion UI Demo Pilot

## 2026-11-05 — First local pilot

The user authorized proceeding with the agent video workflow planned in Stop Motion UI Plan 003. A tarball was installed into a separate temporary consumer outside both source checkouts. Its TypeScript recipe connected to the existing chamfered-button spike, checked the action count becomes 1 and toggle value becomes true, and produced a 12.5-second H.264/AAC video with three supplied narration clips. Windows System.Speech generated those local fixture clips for this pilot; this does not establish a production TTS choice or `daxur` integration.

Two immediate-read assertions initially failed because Angular had not rendered its updated value yet. Waiting for the actual displayed value resolved the recipe issue; no library code changed. The video contact sheet shows the correct page and the active toggle. Stream inspection confirms audio/video presence and duration; listening quality and remote playback have not been accepted by the user.

The durable recipe is `demos/buttons.demo.ts`. It manages a dedicated app server at port 4239, expects local `intro.wav`, `trigger.wav` and `toggle.wav` under `ignore/demo-audio` (override with `STOP_MOTION_AUDIO_DIR`), and writes isolated runs under `ignore/demo-videos`. `npm run demo:video -- --narration off --json` is available while preparing speech. Read the installed package's skill before editing recipes. Local tarballs and speech clips are intentionally ignored; a fresh clone must restore the package snapshot and supply clips or select silent narration.

## 2026-11-05 — Durable consumer verification

Installed `file:ignore/packages/daxur-studios-stop-motion-ui-0.2.0-c222d8a2.tgz`; its SHA256 is `c222d8a26c126084a47b79f888d748dc663b14e1856145572cf182b6834a1204`. The source archive is also retained in the Stop Motion UI checkout under `ignore/packages/agent-cli-0.2.0-consumer/`. The earlier snapshot remains intact as history. Package manifest and lockfile identify the chosen snapshot.

`npm.cmd run demo:video -- --json` succeeded from this repository and created `ignore/demo-videos/run-i4wKHf/demo.mp4`: 12.467 seconds, 1280x800, 30 fps H.264/AAC with three supplied speech clips. The command started its own Angular app on 4239 and stopped it before rendering. `demo:video:doctor` passed. A TypeScript/CommonJS host compatibility failure in the first snapshot was fixed in the tool's exports/loader and regression-tested; the host package's module configuration was preserved. In this PowerShell environment, `npm.cmd` correctly forwards the flags after `--`; the `npm.ps1` shim consumed them in an earlier attempt.

The UI library's production code was not changed. Verification exercised the actual button spike and installed tool; unit and component test suites were not rerun because this change only adds a development demo workflow. Remote-device playback and human speech acceptance remain open.

Follow-up: `npm.cmd run demo:video -- --fps 6 --json` produced another isolated run at `ignore/demo-videos/run-JaH8XO/`, preserving the original 30 fps video and authored inputs. The recipe's standalone TypeScript check found that this workspace did not declare Node types; added the Node 22 development declarations for its imports/process usage.

The standalone NodeNext TypeScript check passed after adding those declarations. Whitespace checks passed, and no listeners remained on the four recording/development ports after cleanup. Inspected the final 30 fps run's contact sheet. The local pilot is complete; remote playback remains the acceptance step requiring the user's actual device/client.

## 2026-11-05 — Phone playback confirmed

The user said the demo looks good and confirmed playback on their phone in the Codex chat. The shared artifact is `D:/code/@daxur-studios/ui/ignore/demo-videos/run-i4wKHf/demo.mp4`. Codex presents it using an assistant Markdown media embed with that absolute path: `![Button demo](D:/code/@daxur-studios/ui/ignore/demo-videos/run-i4wKHf/demo.mp4)`. No separate upload call, public URL, replay app or local HTTP server was used for the delivery. Human listening quality was not separately confirmed.

Added the exact handoff method to this repo's AGENTS.md to supplement its older immutable installed skill, and checked the remote playback acceptance item in Plan 10. The package snapshot and runtime are unchanged. A personal Codex skill/user-level instruction now covers other repos on this laptop; the source package guidance and Triangular's packaged skills also document the client-specific methods for future installations. Claude uses its available `SendUserFile` tool; Antigravity remains untested. No new capture/tests or commit were needed for this documentation-only follow-up.

## 2026-11-05 — Daxur Gemini speech replaces the fixture default

The user supplied the supported `daxur generate gemini-speech <text> --out <wav> --voice Fola --agent` interface. Installed a fresh Stop Motion UI snapshot at `file:ignore/packages/daxur-studios-stop-motion-ui-0.2.0-218a6be5.tgz`, SHA256 `218a6be5aa4a6dc43813a7c7d35dbd69f96f855262970177a0829108f9f81adf`. The former c222d8a2 archive and old demo artifacts remain intact. No production component code changed.

The recipe now sets `audioProvider: daxurSpeech({voice: 'Fola'})`. Its normal command generates speech from the authored narration, using Daxur's configured encrypted credentials and content cache; no manual fixture generation is needed. The helper pins the installed CLI's default model, `gemini-3.8-flash-tts`, and validates output/cancellation. `STOP_MOTION_AUDIO_DIR` remains an optional override for supplied `intro.wav`, `trigger.wav` and `toggle.wav`; `--narration off` makes no speech calls. Fresh clones still need the ignored package snapshot restored, Chromium/ffmpeg/ffprobe and configured Daxur for generated speech. Do not check in keys or clips.

`npm.cmd run demo:video -- --json` succeeded: `ignore/demo-videos/run-WLRWyH/demo.mp4`, 11.8 seconds, 1280x800, 30 fps H.264/AAC, 225542 bytes, three Gemini clips. Action-count/toggle assertions passed and the contact sheet shows the expected states. A second installed `capture` command produced `run-k9KYuo` with all three normalized cache WAVs unchanged (same names/modification times and no additions). The tool's separate direct Daxur repeat request also reported `cached: true`. The dedicated app server on 4239 stopped after capture. Standalone NodeNext recipe type checking and whitespace checks passed; Stop Motion UI's three runtime tests, package build and skill/records checks passed upstream.

Deliver this new video in Codex with `![Gemini-narrated button demo](D:/code/@daxur-studios/ui/ignore/demo-videos/run-WLRWyH/demo.mp4)`. Actual human listening quality and a full remote coding rehearsal remain open; the prior phone playback confirmation belongs to the earlier supplied-audio clip. All changes are left uncommitted.
