---
type: Plan
title: Agent Work Records
description: Define how agent repository work reuses initiative records or falls back to a monthly work log.
timestamp: 2026-10-22T00:00:00Z
status: active
runbook: /docs/runbook/08_agent-work-records.md
tags: [agents, documentation, plans, runbook, work-log]
---

# Agent Work Records

## Goal

Every repository-work request has a durable record link without creating a new plan or runbook for each chat session.

## Scope

- **In:** Set the record-routing rule, work-log format, clarification behavior, and handback expectation for agent work in this repository.
- **Out:** Provider-specific hooks, required session IDs, Daxur CLI changes, and changes to historical plans or runbooks.

## Decisions

- Reuse an existing plan/runbook pair for work in the same initiative. Create a pair for substantial new initiatives. Use the monthly work log for small standalone work and repo investigations without a fitting pair. [R: 2026-10-22](/docs/runbook/08_agent-work-records.md#2026-10-22)
- Agents select the record type without asking whether documentation is wanted. Ask questions only when missing details materially affect scope or acceptance criteria; otherwise state assumptions and continue. [R: 2026-10-22](/docs/runbook/08_agent-work-records.md#2026-10-22)
- Provider session IDs are optional; before handing completed repository work back, the agent links its record in the response. [R: 2026-10-22](/docs/runbook/08_agent-work-records.md#2026-10-22)

## Phases

- [x] Add the record-routing rule to agent instructions and the plans/runbooks standard.
- [x] Define the monthly work-log structure and entry guidance.
- [ ] Exercise the policy on a future small standalone UI task and a future initiative task.

## Open questions

- Whether repo-free brainstorming should become an explicit default exception; the pilot currently requires a record only when an agent interacts with the repository.
