---
id: AISDLC-300
title: 'block: AISDLC-270 dispatch until RFC-0025 OQ walkthrough complete + sweep for other premature impl tasks'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - governance-gap
  - audit
  - block
  - rfc-0025
priority: high
dependencies: []
references:
  - spec/rfcs/RFC-0025-framework-quality-monitoring.md
  - backlog/tasks/aisdlc-270 - chore-complete-RFC-0025-quality-monitoring-auto-classification.md
  - spec/rfcs/README.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two-part: (a) explicitly block AISDLC-270 from dispatch until RFC-0025's 10 OQs are resolved by operator walkthrough, and (b) sweep the rest of the backlog for `chore-complete-RFC-N` tasks that target an RFC with open OQs or at lifecycle < Signed Off — apply the same block pattern.

## Why immediate block

AISDLC-270 sits in `backlog/tasks/` correctly only because no one has dispatched it. There is no enforced gate (AISDLC-296 is the long-term fix). Until AISDLC-296 ships, manual `blocked.reason` is the only protection.

## Scope

### Part A — block AISDLC-270

- Edit `backlog/tasks/aisdlc-270 - chore-complete-RFC-0025-quality-monitoring-auto-classification.md` frontmatter:
  - Add `blocked: { reason: "RFC-0025 has 10 unresolved OQs (§13). Operator walkthrough required before dispatch. Block lifts when RFC-0025 lifecycle ≥ Signed Off." }`
  - Optionally also `dispatchable: false` with `dispatchableReason` per AISDLC-243 convention.

### Part B — sweep + block

- Survey `backlog/tasks/` for tasks matching `chore-complete-RFC-NNNN-*` pattern.
- For each: check the referenced RFC's lifecycle field + count unresolved OQs in §OQ section.
- Apply the same `blocked.reason` to any task pointing at an RFC at lifecycle < Signed Off OR with open OQs.
- Output an audit report: `docs/audits/2026-05-15-premature-impl-task-sweep.md` listing each task + its RFC + the block reason (or "no block needed").

### Part C — schedule the RFC-0025 walkthrough

- File a separate decision-walkthrough task or schedule it directly with the operator.
- Once RFC-0025 §13 OQs are resolved + lifecycle promoted, the AISDLC-270 block lifts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 AISDLC-270 frontmatter has `blocked.reason` referencing RFC-0025 OQ status
- [ ] #2 Backlog swept for all `chore-complete-RFC-N` tasks
- [ ] #3 Each premature task gets `blocked.reason` applied
- [ ] #4 Audit report `docs/audits/2026-05-15-premature-impl-task-sweep.md` written
- [ ] #5 RFC-0025 OQ walkthrough scheduled (separate task or operator session)
<!-- AC:END -->
