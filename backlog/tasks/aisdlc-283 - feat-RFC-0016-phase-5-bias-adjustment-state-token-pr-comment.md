---
id: AISDLC-283
title: 'feat: RFC-0016 Phase 5 — Per-class bias adjustment + 3-state token + PR comment'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - rfc-0016
  - estimation-calibration
  - phase-5
  - critical-path-rfc-0035
dependencies:
  - AISDLC-282
references:
  - spec/rfcs/RFC-0016-estimation-calibration-tshirt-sizes.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 5 of RFC-0016 Implementation Plan (§13). Surfaces calibrated estimates across CLI, dashboard, Slack, and PR comments via a shared 3-state token enum. Per-agent stratification via `predictedBy` (Q2).

## Scope

- Bias-multiplier computation across Stage A + Stage B verdicts
- Per-agent stratification via `predictedBy` field (Q2 resolution)
- `cli-estimates show <class>` command
- 3-state token enum formatter (Q6 resolution): `uncalibrated` / `warming` / `calibrated`
- Bot PR comment writer with `<!-- ai-sdlc:estimate -->` marker (Q7 resolution)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `cli-estimates show feature` returns mean/median bucket-miss + Stage-A-vs-Stage-B accuracy comparison
- [ ] #2 Per-agent bias stratification via `predictedBy` field
- [ ] #3 3-state token formatter shared across CLI / dashboard / Slack / PR-comment surfaces
- [ ] #4 PR opened from worktree receives bot estimate comment within 30s of `pull_request: opened`
- [ ] #5 Marker comment idempotent (single comment per PR, updated in-place on revision)
<!-- AC:END -->
