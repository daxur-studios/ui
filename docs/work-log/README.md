---
type: Standard
title: Agent Work Log
description: Record small standalone repository work and investigations without creating a plan/runbook pair for each task.
timestamp: 2026-10-22T00:00:00Z
tags: [documentation, agents, work-log, standards]
---

# Agent Work Log

Use the monthly work log for a small, standalone request or repository investigation that does not fit an existing initiative plan/runbook. For a substantial new initiative, create a reciprocal plan/runbook pair. For work already covered by a pair, reuse it and do not duplicate its record here. The routing rules live in [Plans and Runbooks](/docs/plans-and-runbooks.md).

## Files and entries

- Create `docs/work-log/YYYY-MM.md` when the first entry for that month is needed, then add it to [the index](/docs/work-log/index.md). Do not create empty monthly files in advance.
- Group entries under date headings. Add one concise entry per coherent standalone task, not one entry per chat turn. If the task continues in another session, append a dated follow-up line. If it grows into an initiative, cross-link the existing entry from the initiative runbook and continue detailed tracking there; do not move or rewrite the earlier entry.
- Record the request or investigation, its outcome or useful finding, and links to changed files or source documentation. Include verification performed when relevant.
- Provider name and stable session link are optional. Never require a provider-specific session ID.
- Treat entries as append-only. Correct typos; update the monthly file's `timestamp` when appending.

## Monthly file template

```markdown
---
type: Work Log
title: Agent Work Log — YYYY-MM
description: Standalone repository work and investigation records for YYYY-MM.
timestamp: YYYY-MM-DDTHH:MM:SSZ
period: YYYY-MM
tags: [agents, work-log]
---

# Agent Work Log — YYYY-MM

## YYYY-MM-DD

- **[task]** <request or investigation> — <outcome/finding; links to files or docs; verification if relevant>.
```

Keep each entry brief. The plan or runbook remains the detailed record when a task belongs to an initiative.
