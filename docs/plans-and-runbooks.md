---
type: Standard
title: Plans and Runbooks
description: Keep current work plans linked to durable implementation and verification traces.
timestamp: 2026-10-22T00:00:00Z
tags: [documentation, plans, runbook, standards]
---

# Plans and Runbooks

This repository follows the Daxur Open Knowledge Format (OKF v0.1) documentation standard:

- **Plans (`docs/plans/`)**: Define *what* we are going to do (goals, architectural decisions, checklists, and open questions).
- **Runbooks (`docs/runbook/`)**: Maintain a chronological, append-only dated log of *what* happened, findings, decisions, and verification evidence.

Each active feature or architectural exploration under `docs/plans/` names its corresponding runbook with `runbook:`. The runbook links back with `plans:`. Both indexes (`docs/plans/index.md` and `docs/runbook/index.md`) must be kept up to date.

## Choosing a work record

Every coherent request that involves this repository — including read-only investigation — must be associated with a durable work record. The record belongs to the work, not to each chat turn: reuse it when the same task continues, and keep separate records for unrelated tasks even when they arrive in one conversation.

1. **Continue an initiative:** reuse its existing plan/runbook pair. Append meaningful findings, decisions, actions, and verification to the runbook as work proceeds. Link the pair when handing work back.
2. **Start a substantial initiative:** create a reciprocal plan/runbook pair. Use this for a distinct feature, cross-cutting change, or investigation with meaningful phases, decisions, or follow-up. State the goal, scope, and acceptance criteria in the plan.
3. **Handle small standalone work:** add a concise entry to the current monthly file under [the work log](/docs/work-log/README.md). This is the route for isolated fixes, small edits, or repository questions that require investigation but do not belong to an initiative. Do not create a plan/runbook pair just to record these.

An agent chooses the record type without asking whether documentation is wanted. Ask only when missing information materially affects scope or acceptance criteria; otherwise state assumptions, record unresolved choices as open questions, and proceed where possible. Before handing completed work back, make sure its record is current and link it in the response; no user confirmation that the conversation has ended is needed. For longer work, log as you go.

Provider-specific session IDs are optional because providers do not expose them consistently. A stable session URL may be added when available. A user may explicitly exempt a request from this convention. Conversation that does not involve repository work does not need a repository record.

## Monthly work log

The work log is a lightweight alternative to a new initiative pair, not a duplicate of one. See [the work-log guide](/docs/work-log/README.md) for its entry format and index. If a request fits an existing pair, use that pair instead of also adding a work-log entry.
