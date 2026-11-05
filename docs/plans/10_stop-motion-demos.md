---
type: Plan
title: Stop Motion UI Demo Pilot
description: Generate agent-authored narrated button demos through the installed Stop Motion UI package.
timestamp: 2026-11-05T00:00:00Z
runbook: /docs/runbook/10_stop-motion-demos.md
---

# Stop Motion UI Demo Pilot

Status: active. Related implementation: Stop Motion UI Plan 003 in the sibling development workspace.

- [x] Prove a separately installed tarball can capture the existing button spike with assertions and supplied speech.
- [x] Install a named local package snapshot, add the reusable recipe and package-relative agent skill pointer, and rerun from this repository.
- [x] Rehearse delivery and playback from the user's actual remote chat/device (Codex phone playback confirmed 2026-11-05; listening quality not separately confirmed).
- [x] Replace the supplied-audio default with the confirmed Daxur Gemini speech adapter and verify a narrated run plus cache reuse.

The MP4 is the primary deliverable. The recipe owns app startup, readiness and expected button states; the installed tool owns screenshot/cursor reconstruction and encoding. TTS provider setup remains separate. Do not treat reconstructed videos as continuous-motion or performance evidence.
