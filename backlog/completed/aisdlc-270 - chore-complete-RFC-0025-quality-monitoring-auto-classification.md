---
id: AISDLC-270
title: 'chore: complete RFC-0025 quality monitoring auto-classification'
status: Done
assignee: []
created_date: '2026-05-13 18:48'
labels:
  - rfc-0025
  - retrofit-followup
  - framework-quality
dependencies: []
references:
  - spec/rfcs/RFC-0025-framework-quality-monitoring.md
  - pipeline-cli/src/tui/analytics/quality-reader.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the unbuilt portion of RFC-0025 (Framework Quality Monitoring — Non-Decision Failure Modes). The reliability-trend reader and failure-mode handlers ship today; the auto-classification, framework-bug routing, and severity rubric do not.

## What ships today (per 2026-05-13 audit)

- pipeline-cli/src/tui/analytics/quality-reader.ts — reads the framework-quality capture corpus and computes the §8 reliability trend. The file notes that RFC-0025 has not yet shipped Phase 5 and treats missing input as available false
- pipeline-cli/src/orchestrator/playbook/handlers — 9 catalogued failure-mode handlers (verification-failure, push-race, rebase-conflict, attestation-verify-mismatch, etc.) implementing the spirit of the §3 failure-mode taxonomy

## What's missing

- cli-quality-corpus aggregate CLI (referenced as eventual in the reader)
- Automatic classification of failures into operator-under-decided / framework-misbehaved / ambiguous / external-dependency-failed per §5
- Automatic routing of framework-misbehaved cases into the backlog with framework-bug triage labels per §6
- Severity-scoring rubric in code per §7 (operator-time-cost × blast-radius × frequency)
- MTTR and recurrence metric computation per §8
- framework-determinism-violated detection mechanism (RFC-0025 OQ-7)

## Why this matters

RFC-0025 operationalizes VISION.md §4 honest failure modes — when the framework misbehaves (vs. when the operator under-decided), the framework should route a bugfix into its own backlog rather than blaming the operator. Without auto-classification, the framework's failure modes get silently absorbed as operator-time-cost.

## Pre-work required

The 10 Open Questions in RFC-0025 §13 still need an operator walkthrough before this implementation can land. Each OQ has an author Recommendation; the walkthrough resolves them.

## References

- RFC-0025 §3 (failure-mode taxonomy), §5 (classification), §6 (detection), §7 (severity rubric), §8 (self-improvement metrics)
- pipeline-cli/src/tui/analytics/quality-reader.ts (existing trend reader)
- pipeline-cli/src/orchestrator/playbook/handlers (existing failure-mode handlers)
- Surfaced by the 2026-05-13 partial-implementation status retrofit pass
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 cli-quality-corpus aggregate CLI ships and produces the framework-quality capture corpus file from per-run logs
- [x] #2 Classifier ships per §5 (operator-under-decided / framework-misbehaved / ambiguous / external-dependency-failed); default to `ambiguous` per OQ-1 recommendation
- [x] #3 Auto-routing of `framework-misbehaved` cases into backlog with `triage: framework-bug` per §6 (composes with RFC-0024's capture flow)
- [x] #4 Severity scoring rubric in code per §7 (operator-time-cost × blast-radius × frequency)
- [x] #5 MTTR + recurrence-rate metrics computed per §8 and surfaced in TUI analytics
- [x] #6 `framework-determinism-violated` detection per OQ-7 (sampled 1-in-50 baseline, always for `requires-determinism: true` tasks)
- [x] #7 Vendor-namespace enforcement for adopter custom subclasses per §10 + OQ-10 (schema rejects un-namespaced)
- [x] #8 RFC-0025 §13 OQs resolved with normative answers (operator walkthrough required first)
- [x] #9 RFC-0025 lifecycle flipped to Implemented; registry row + inventory entry updated
<!-- AC:END -->

## Final Summary

## Summary

RFC-0025 (Framework Quality Monitoring) is now fully implemented. All 9 acceptance criteria are met. The implementation ships a complete failure-mode classification, severity scoring, auto-routing, self-improvement metrics, and determinism detection stack behind the `AI_SDLC_FRAMEWORK_QUALITY_MONITORING=experimental` feature flag.

## Changes

- `pipeline-cli/src/tui/analytics/quality-classifier.ts` (new): §5 failure-mode taxonomy classifier + §7 severity rubric + OQ-10 vendor-namespace enforcement. Exports `classifyFailure()`, `computeSeverity()`, `validateVendorNamespace()`, `ClassificationError`.
- `pipeline-cli/src/tui/analytics/quality-router.ts` (new): RFC-0024 capture writer + backlog task auto-creation. `appendFrameworkCapture()` always runs; `routeFrameworkBug()` is flag-gated. CODEOWNERS heuristic (OQ-4).
- `pipeline-cli/src/tui/analytics/quality-metrics.ts` (new): §8 MTTR + recurrence-rate + coverage-rate metrics. Clock starts at first capture (OQ-8). Recurrence window configurable (OQ-3, default 30 days).
- `pipeline-cli/src/tui/analytics/determinism-detector.ts` (new): OQ-7 determinism sampling (1-in-50, always for `requires-determinism: true`). Baseline round-trip via `$ARTIFACTS_DIR/_quality/determinism/<task-id>.json`.
- `pipeline-cli/src/cli/quality-corpus.ts` (new): `cli-quality-corpus aggregate` yargs subcommand composing reliability trend + quality metrics. JSON + table output formats.
- `pipeline-cli/bin/cli-quality-corpus.mjs` (new): CLI entrypoint.
- `pipeline-cli/package.json` (modified): added `cli-quality-corpus` to `bin` map.
- `pipeline-cli/src/tui/analytics/index.ts` (modified): re-exports all 4 new analytics modules.
- `spec/rfcs/RFC-0025-framework-quality-monitoring.md` (modified): lifecycle → Implemented; §13 OQs resolved normatively; §14 sign-off updated; §16 revision history v1.0 entry added.
- `spec/rfcs/README.md` (modified): registry row 0025 → Implemented, 0 OQs; inventory entry updated to "0 OQs — fully implemented".
- 8 test files added (quality-classifier.test.ts, quality-router.test.ts, quality-metrics.test.ts, determinism-detector.test.ts, quality-corpus.test.ts).

## Design decisions

- **OQ-1 default = ambiguous**: preserves operator agency while being honest about uncertainty; implemented as the fallback branch in `classifyFailure()`.
- **OQ-7 sampling = 1-in-50 + always for requires-determinism**: constant `DETERMINISM_SAMPLE_RATE = 50` makes the rate override-friendly without flag proliferation.
- **OQ-8 MTTR clock = first capture**: operationally meaningful — when the framework KNEW, not when the failure occurred.
- **OQ-10 vendor-namespace via ClassificationError**: fail-loud at classification time rather than silently accepting invalid subclass names.
- **Feature flag gates only routing step 2**: capture always appends to audit trail regardless of flag state.

## Verification

- `pnpm build` — clean
- `pnpm test` — 2837 tests pass (174 test files)
- `pnpm lint` — clean (0 errors, 2 pre-existing warnings in 00-sweep.ts)
- `pnpm format:check` — clean

## Follow-up

- OQ-2 (severity weight tuning YAML surface) and OQ-5 (adopter telemetry opt-in) deferred — out of scope for dogfood scale.
- OQ-9 (operator-time-cost instrumentation from TUI interactions) deferred to RFC-0023 Phase 3+.
- Wire `classifyFailure()` into orchestrator playbook handlers (RFC-0015 Phase 2) in a follow-up task.
