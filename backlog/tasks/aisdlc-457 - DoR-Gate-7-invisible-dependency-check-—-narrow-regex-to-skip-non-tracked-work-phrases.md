---
id: AISDLC-457
title: >-
  DoR Gate 7 invisible-dependency check — narrow regex to skip non-tracked-work
  phrases
status: To Do
assignee: []
created_date: '2026-05-28 00:12'
labels:
  - dor-rubric
  - rfc-0011
  - operator-friction
  - false-positive
dependencies: []
references:
  - pipeline-cli/src/dor/seven-point-rubric.ts
  - pipeline-cli/src/dor/comment-loop.ts
  - spec/rfcs/RFC-0011-definition-of-ready-gate.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

DoR Gate 7 (invisible-dependency phrases) is overly aggressive: flags any task body containing `requires` or `depends on` as a dependency phrase needing a tracked-work reference. Real incident 2026-05-27: PR #743 (RFC-0028 walkthrough) failed twice because:
1. `"promotion to evolving requires RFC amendment"` — that's a procedural rule, not a tracked-work dependency
2. `"Statistical drift detection depends on a rolling 30d baseline"` — that's an algorithmic prerequisite, not a tracked-work dependency

Both rephrased to `"needs"` / `"uses"` to bypass the gate. The gate currently can't tell prose like "X uses a Y" apart from "X requires AISDLC-N to be done first."

## Acceptance criteria

- [ ] AC-1: Gate 7 regex narrows to phrases like `depends on AISDLC-`, `requires AISDLC-`, `blocked by RFC-`, etc. — i.e. dependency phrases that immediately precede a tracked-work identifier (AISDLC-N / RFC-N / GH issue / file path)
- [ ] AC-2: Bare `requires` / `depends on` / `needs` in prose without an adjacent tracked-work reference does NOT trigger Gate 7
- [ ] AC-3: New positive test fixtures: prose like "X requires Y configuration" / "X depends on Z baseline" pass without flag
- [ ] AC-4: Existing negative test fixtures preserved: "depends on AISDLC-123" / "requires #456" still flag
- [ ] AC-5: Renderer also fix (separate concern, file as own AC): when Gate 7 fails it should always emit the violation detail; current renderer at `pipeline-cli/src/dor/comment-loop.ts:101` emits the "blocked on the following gates:" header with zero detail when violations exist but pass severity filters, producing non-actionable output

## References

- pipeline-cli/src/dor/seven-point-rubric.ts (Gate 7 implementation)
- pipeline-cli/src/dor/comment-loop.ts:101 (renderer that produces empty gate-list output)
- PR #743 incident (RFC-0028 walkthrough — operator hit twice)
- PR #742 incident (AISDLC-447 + 451 backlog tasks — Claude hit during this session)
- spec/rfcs/RFC-0011-definition-of-ready-gate.md (DoR rubric source of truth)
<!-- SECTION:DESCRIPTION:END -->
