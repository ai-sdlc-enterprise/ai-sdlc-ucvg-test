---
id: AISDLC-285
title: 'feat: RFC-0035 Phase 1 — Decision resource schema + cli-decisions {list, show, add}'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0035
  - decision-catalog
  - phase-1
  - critical-path
dependencies: []
references:
  - spec/rfcs/RFC-0035-decision-catalog-operator-routing.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 1 of RFC-0035 Implementation Plan (§14). Establishes the event-sourced `Decision` substrate behind feature flag `AI_SDLC_DECISION_CATALOG=experimental`. Every later phase composes on this.

## Scope

- JSON Schema for the `Decision` resource per §11 sketch
- Append-only event log at `.ai-sdlc/_decisions/events.jsonl` (event-sourced model per OQ resolutions)
- `cli-decisions list` enumerates decisions reconstructed from event log
- `cli-decisions show <id>` renders a single decision with full provenance
- `cli-decisions add` writes a new Decision via interactive prompt (manual authoring only at this phase)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `spec/schemas/decision.v1.schema.json` ships per §11 sketch
- [ ] #2 `cli-decisions list` enumerates decisions from event log
- [ ] #3 `cli-decisions show <id>` renders single decision with full event history
- [ ] #4 `cli-decisions add` writes new Decision via interactive prompt
- [ ] #5 Event log at `.ai-sdlc/_decisions/events.jsonl` (append-only)
- [ ] #6 Behind `AI_SDLC_DECISION_CATALOG=experimental` feature flag (degrade-open when disabled)
<!-- AC:END -->
