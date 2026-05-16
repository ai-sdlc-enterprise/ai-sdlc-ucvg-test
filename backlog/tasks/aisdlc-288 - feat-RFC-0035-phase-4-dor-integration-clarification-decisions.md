---
id: AISDLC-288
title: 'feat: RFC-0035 Phase 4 — RFC-0011 DoR integration + clarification rounds emit Decision records'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0035
  - decision-catalog
  - phase-4
  - critical-path
dependencies:
  - AISDLC-285
references:
  - spec/rfcs/RFC-0035-decision-catalog-operator-routing.md
  - spec/rfcs/RFC-0011-definition-of-ready-gate.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 4 of RFC-0035 Implementation Plan (§14). Wires the existing RFC-0011 DoR clarification flow into the Decision catalog so every clarification question becomes a first-class Decision record.

## Scope

- RFC-0011 DoR clarification rounds emit Decision records
- Each clarification question becomes a Decision with question, options, recommendation, confidence
- Operator answers feed back into Decision resolution (status → resolved)
- Backwards-compatible with existing DoR substrate
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 RFC-0011 DoR clarification rounds emit Decision records into the catalog
- [ ] #2 Each clarification question becomes a Decision with question, options, recommendation
- [ ] #3 Operator answers feed back into Decision resolution (status → resolved)
- [ ] #4 Backwards-compatible with existing DoR substrate (degrade-open when feature flag off)
- [ ] #5 Integration test: DoR clarification round produces a queryable Decision via `cli-decisions list`
<!-- AC:END -->
