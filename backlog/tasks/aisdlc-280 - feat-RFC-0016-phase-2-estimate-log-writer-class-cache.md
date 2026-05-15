---
id: AISDLC-280
title: 'feat: RFC-0016 Phase 2 — Estimate-log writer + class-assignment cache'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0016
  - estimation-calibration
  - phase-2
  - critical-path-rfc-0035
dependencies:
  - AISDLC-279
references:
  - spec/rfcs/RFC-0016-estimation-calibration-tshirt-sizes.md
  - spec/rfcs/RFC-0015-autonomous-orchestrator.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 2 of RFC-0016 Implementation Plan (§13). Captures every Stage A verdict to a structured log so Phase 3 measurement has data to ingest. The class-assignment LLM call is cached on first use per Q3 resolution.

## Scope

- Estimate-log writer that records Stage A multiset + final bucket + `estimateInputHash` (Q5) + class fields
- Wire to the RFC-0015 `events.jsonl` event stream
- Class-assignment LLM call cached on first use (Q3 resolution); subsequent estimates of the same task class reuse the cached class assignment
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 100% of agent estimates appear in `log.jsonl`
- [ ] #2 Records include `stageA`, `finalBucket`, `estimateInputHash`, and `class` fields
- [ ] #3 Class-assignment LLM call results cached (single LLM call per class per repo)
- [ ] #4 Wired to events.jsonl event stream from RFC-0015
- [ ] #5 Integration test with Phase 1 confirms full write path
<!-- AC:END -->
