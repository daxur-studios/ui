---
type: Standard
title: Plans and Runbooks
description: Keep current work plans linked to durable implementation and verification traces.
timestamp: 2026-10-17T00:00:00Z
tags: [documentation, plans, runbook, standards]
---

# Plans and Runbooks

This repository follows the Daxur Open Knowledge Format (OKF v0.1) documentation standard:

- **Plans (`docs/plans/`)**: Define *what* we are going to do (goals, architectural decisions, checklists, and open questions).
- **Runbooks (`docs/runbook/`)**: Maintain a chronological, append-only dated log of *what* happened, findings, decisions, and verification evidence.

Each active feature or architectural exploration under `docs/plans/` names its corresponding runbook with `runbook:`. The runbook links back with `plans:`. Both indexes (`docs/plans/index.md` and `docs/runbook/index.md`) must be kept up to date.
