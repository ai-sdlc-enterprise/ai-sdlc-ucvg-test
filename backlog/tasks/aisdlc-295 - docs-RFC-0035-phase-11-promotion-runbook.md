---
id: AISDLC-295
title: 'docs: RFC-0035 Phase 11 — Hybrid promotion runbook'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0035
  - decision-catalog
  - phase-11
  - docs
dependencies:
  - AISDLC-293
references:
  - spec/rfcs/RFC-0035-decision-catalog-operator-routing.md
  - docs/operations/dor-promotion.md
  - docs/operations/orchestrator-promotion.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 11 of RFC-0035 Implementation Plan (§14). Operator dispatches the default-on flip from a runbook once corpus or spot-check evidence supports it, mirroring the project's promotion convention (RFC-0011 DoR, RFC-0015 orchestrator).

## Scope

- `docs/operations/decision-catalog-promotion.md` runbook
- Covers: corpus accuracy threshold, spot-check protocol, rollback procedure, monitoring after flip
- Cross-references RFC-0014 + RFC-0015 promotion runbooks
- Documents the promotion ladder: experimental → shadow-mode → default-on
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `docs/operations/decision-catalog-promotion.md` ships
- [ ] #2 Runbook covers corpus accuracy threshold, spot-check protocol, rollback procedure, monitoring after flip
- [ ] #3 Cross-references RFC-0014 + RFC-0015 promotion runbooks
- [ ] #4 Promotion ladder documented: experimental → shadow-mode → default-on
- [ ] #5 Adopter-facing example walkthrough included
<!-- AC:END -->
