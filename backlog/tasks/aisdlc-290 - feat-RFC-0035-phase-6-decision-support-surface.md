---
id: AISDLC-290
title: 'feat: RFC-0035 Phase 6 — Decision support surface (recommendation + counter-argument + sub-decision graph)'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0035
  - decision-catalog
  - phase-6
  - critical-path
dependencies:
  - AISDLC-288
  - AISDLC-289
references:
  - spec/rfcs/RFC-0035-decision-catalog-operator-routing.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 6 of RFC-0035 Implementation Plan (§14). Renders the decision support surface so operators get the full problem / options / recommendation / counter-argument bundle the AskUserQuestion walkthrough format produces manually.

## Scope

- Per-decision rendering: problem, options, recommendation, confidence, counter-argument
- Sub-decision graph rendered as Mermaid-style text tree
- Integrates with `cli-decisions show <id>`
- Stage A / B / C verdict provenance visible inline
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Per-decision rendering shows problem, options, recommendation, confidence, counter-argument
- [ ] #2 Sub-decision graph rendered as Mermaid-style text tree
- [ ] #3 Integrates with `cli-decisions show <id>` command
- [ ] #4 Stage A/B/C verdict provenance visible (which tier resolved it, with what signals)
- [ ] #5 Backward-compatible: decisions without sub-decisions render without empty tree section
<!-- AC:END -->
