---
id: AISDLC-301
title: 'audit: AISDLC-269 / RFC-0024 OQ-4 / OQ-6 / OQ-8 / OQ-10 / OQ-12 — operator walkthrough on subagent-decided resolutions'
status: To Do
assignee: []
created_date: '2026-05-15'
labels:
  - audit
  - rfc-0024
  - revert-candidate
  - governance-gap
  - critical
dependencies: []
references:
  - spec/rfcs/RFC-0024-emergent-issue-capture-and-triage.md
  - pipeline-cli/src/capture/
  - pipeline-cli/src/cli/capture.ts
  - backlog/completed/aisdlc-269 - chore-complete-RFC-0024-capture-authoring-triage-flow.md
priority: critical
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The 2026-05-15 RFC-0024 OQ revision walkthrough revised OQ-1 / OQ-2 / OQ-3 / OQ-5 / OQ-7 / OQ-9 / OQ-11. The remaining 5 OQs — OQ-4 (in-code marker syntax), OQ-6 (capture quota), OQ-8 (Issue labeling), OQ-10 (multi-capture from one source), OQ-12 (CLI auto-detect) — were *not* revised, but they were also never operator-walked-through. Their first-pass resolutions were authored inline by the dev subagent during AISDLC-269 implementation.

## Why this matters

The user's directive: "we should resolve the OQ for RFCs that were missing the OQ then we can do an audit of the issues to determine what we should do with them to address the missing OQ." For the 5 RFC-0024 OQs we didn't touch on 2026-05-15, the shipped implementation reflects subagent-decided architectural choices that have not been operator-vetted.

## Scope

Two-phase, in this order:

### Phase 1 — operator OQ walkthrough on each of RFC-0024 OQ-4 / OQ-6 / OQ-8 / OQ-10 / OQ-12

Full-format walkthrough per OQ (problem / industry research / 3-4 options / recommendation + counter-argument). Same standard as the 2026-05-15 walkthrough that revised OQ-1/2/3/5/7/9/11. Each OQ either:
- **Affirms** the existing first-pass resolution (operator agrees with subagent's choice → record affirmation in §15)
- **Revises** the resolution (operator picks different option → file as a Refit task in the AISDLC-273..278 chain)

### Phase 2 — audit shipped code against Phase 1 outcome

For each affirmed OQ: no action; record operator approval.
For each revised OQ: extend the RFC-0024 Refit (AISDLC-273..278) chain with new tasks, OR file a revert if the divergence is foundational.

## Linked decisions

- AISDLC-273..278 already file the refit for the 7 OQs revised on 2026-05-15. Phase 2 of this task may extend that chain.
- AISDLC-299 does the same audit pattern for RFC-0031 (different RFC, same root cause).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Operator walkthrough completed for RFC-0024 OQ-4 (in-code marker syntax)
- [ ] #2 Operator walkthrough completed for RFC-0024 OQ-6 (capture quota / rate-limiting)
- [ ] #3 Operator walkthrough completed for RFC-0024 OQ-8 (Issue labeling on auto-created Issues)
- [ ] #4 Operator walkthrough completed for RFC-0024 OQ-10 (multi-capture from one source)
- [ ] #5 Operator walkthrough completed for RFC-0024 OQ-12 (CLI auto-detect against current PR)
- [ ] #6 Each operator-affirmed OQ recorded with affirmation in RFC-0024 §15
- [ ] #7 Each revised OQ filed as new Refit task or revert task
- [ ] #8 Audit report `docs/audits/2026-05-15-rfc-0024-unresolved-oq-audit.md` written
<!-- AC:END -->
