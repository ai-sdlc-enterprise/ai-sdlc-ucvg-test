---
id: AISDLC-496
title: 'docs(marketing): whitepaper + framework docs + website page for zero-trust untrusted-contributor PR verification (RFC-0042 + RFC-0043)'
status: To Do
assignee: []
created_date: '2026-05-28'
labels:
  - marketing
  - docs
  - whitepaper
  - website
  - rfc-0042
  - rfc-0043
  - zero-trust
dependencies: []
references:
  - spec/rfcs/RFC-0042-proof-of-execution-attestation.md
  - spec/rfcs/RFC-0043-untrusted-contributor-pr-verification.md
dispatchable: false
dispatchableReason: 'Marketing / external-audience authoring requires operator-in-loop voice + positioning; not LLM-dispatchable as a one-shot.'
blocked:
  reason: 'RFC-0043 OQs acknowledged; operator decision pending on scope. Two viable scopes: (a) wait for RFC-0043 OQ walkthrough so the whitepaper describes the full RFC-0042 + RFC-0043 composite zero-trust path; (b) narrow scope to RFC-0042-only (already Implemented) and defer the RFC-0043 portions until that walkthrough completes. Operator chooses at dispatch time.'
priority: medium
permittedExternalPaths:
  - '../ai-sdlc-io/'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Author a marketing whitepaper + sync framework docs + add a website page describing the zero-trust verification path AI-SDLC provides for pull requests authored by untrusted contributors. Purpose is gaining external support for the project — positioning the cryptographic + sandbox + attestation story for a security/governance buyer audience.

## Scope

The work has three coordinated deliverables. Content is shared; each surface targets a different audience.

### Deliverable 1 — Whitepaper (marketing)

Long-form (~8-15 pages) PDF + HTML, written for security architects + engineering leadership at organizations evaluating AI-assisted development governance. Sections:

- **Problem framing** — why AI-assisted PR review creates a trust gap (operator-key forgery vector from the 2026-05-20 incident; per-machine signing-key onboarding; CI cost economics when LLM work shifts to API tokens); the specific shape of the "untrusted contributor" threat (fork-PR exfiltration, supply-chain injection via lockfile/workflow edits, prompt-injection of reviewers)
- **The composite zero-trust architecture** —
  - RFC-0042 layer: proof-of-execution Merkle attestation (in-repo, no external transparency log; v6 schema; per-patch-id leaf storage; head-binding relaxations that survive rebase + chore commits)
  - RFC-0043 layer (if in scope per `blocked.reason` precondition): deterministic pre-LLM diff/AST gate hard-blocking `.github/**` / deps / lockfiles / `.ai-sdlc/**`; NVIDIA OpenShell policy-enforced sandbox with credential withholding at the proxy layer + differential testing; prompt-injection-hardened 3-reviewer matrix; clean-room RFC-0042 attestation decoupled from the untrusted-eval environment
- **Forgery resistance analysis** — make-forgery-as-expensive-as-compliance property; transcript-hash binding; nonce-bound CI verification; cold-storage spot-check on demand
- **Cost economics** — subscription-tier LLM work happens locally on the operator's Claude Code Max; CI runs cheap cryptographic verification; no Rekor / OpenTimestamps runtime dependency
- **Comparison table** — vs Sigstore Rekor (public Merkle log, runtime dep on rekor.sigstore.dev), vs GitHub Attestations (CI-side OIDC, burns Actions minutes), vs Signed-off-by trailers (no crypto chain, no protection against operator-account compromise)
- **Deployment posture** — what an adopter must do (operator signing key, repo `.ai-sdlc/trusted-reviewers.yaml`, branch protection on `ai-sdlc/pr-ready`); what shifts to CI; what stays local
- **Audit trail story** — every PR ever merged remains independently verifiable via v3/v4/v5 verifier code retained read-only per RFC-0042 OQ-7; compliance evidence for SOC 2 / HIPAA / FedRAMP
- **Open questions + honest limitations** — RFC-0042 has 7 + 5 retrospective OQs; RFC-0043 has N OQs (whichever resolution state at scope-pick time); spot-check sampling is on-demand only per OQ-2 (no automated content-plausibility verification yet)
- **Call to action** — adoption guide pointer; contact for design conversations

### Deliverable 2 — Framework docs sync

Operator-facing runbook updates derived from whitepaper content but scoped to operational use, not marketing. Specifically:

- `docs/operations/zero-trust-untrusted-contributor-verification.md` — the operator runbook for the composite path; cross-links to RFC-0042 + RFC-0043 + `docs/operations/emergency-bypass.md`
- Update `docs/operations/merge-queue-rebase-recovery.md` (or successor) to reference the v6 head-binding relaxations from RFC-0042 OQ-9 retrospective
- Add a forward-pointer in `CLAUDE.md`'s attestation section: "See the whitepaper at `<URL>` for the buyer-audience walkthrough of this architecture."
- `docs/concepts/zero-trust-verification.md` — adopter explainer (when to use, how it composes with their existing CI security)

### Deliverable 3 — Website page (in `../ai-sdlc-io/`)

New marketing page on the project website describing the zero-trust value proposition for external audiences:

- Hero section + 1-paragraph value prop
- Architecture diagram (composite RFC-0042 + RFC-0043 surfaces)
- Use-case scenarios (open-source maintainer accepting fork PRs; internal team with consultants / contractors; security-regulated org)
- Whitepaper download CTA
- "See it in production" pointer to the AI-SDLC dogfood corpus

This deliverable writes to `../ai-sdlc-io/` (sibling repo) — `permittedExternalPaths` allowlist set.

## Precondition (load-bearing)

**RFC-0043 has 6 unresolved OQs as of 2026-05-28.** Two viable scopes for this task:

1. **Wait for RFC-0043 OQ walkthrough first** — whitepaper describes the full RFC-0042 + RFC-0043 composite. Higher marketing impact (the zero-trust story is more complete) but blocks on RFC-0043 walkthrough timing.
2. **Scope to RFC-0042-only now** — whitepaper covers proof-of-execution attestation (which IS implemented and has audit-trail continuity); narrate fork-PR security through the AISDLC-445 + AISDLC-419 + AISDLC-448 lens; defer the deterministic-gate + sandbox-isolation + prompt-injection-hardened-reviewer-matrix story to a v2 whitepaper after RFC-0043 walks. Smaller marketing surface but unblocked today.

Operator picks scope at dispatch time. The `blocked.reason` field documents this for the upstream-OQ gate; the dispatcher should clear the block via operator authorization with the chosen scope captured in the verdict.

## References to existing material to draw from

- RFC-0042 §"Background" — the 2026-05-20 forgery incident framing; the AISDLC-380 partial-fix story
- RFC-0042 §"Architecture: in-repo Merkle proof-of-execution" — Layers 1-6 + the per-patch-id amendment
- RFC-0042 §"Alternatives considered" — A1-A5 already provides the comparison-table content
- RFC-0042 §"Forgery resistance" — the "make forgery as expensive as compliance" framing
- RFC-0043 (whatever sections are written) — for the RFC-0043-layer content
- CLAUDE.md attestation section — operator-facing operational reality
- AISDLC-419/421/422/445/448 task bodies — the production-incident framing for "this design was forged in fire"
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Operator confirms scope at dispatch (full RFC-0042+0043 composite vs RFC-0042-only); choice captured in verdict + reflected in whitepaper content
- [ ] #2 Whitepaper authored as PDF + HTML; ~8-15 pages; positioned for security architects + engineering leadership audience; all sections from Description present
- [ ] #3 Forgery-resistance analysis cites the make-forgery-as-expensive-as-compliance property with concrete numeric framing (transcript size, token cost, etc. from RFC-0042 §Forgery resistance)
- [ ] #4 Comparison table covers Sigstore Rekor + GitHub Attestations + Signed-off-by trailers (sourced from RFC-0042 Alternatives A1-A5)
- [ ] #5 Honest-limitations section lists the unresolved OQs at time of writing (no marketing-gloss over open design questions)
- [ ] #6 `docs/operations/zero-trust-untrusted-contributor-verification.md` published; cross-links to RFC-0042 + RFC-0043 + emergency-bypass runbook
- [ ] #7 `docs/concepts/zero-trust-verification.md` adopter explainer published
- [ ] #8 CLAUDE.md attestation section gains a forward-pointer to the whitepaper URL
- [ ] #9 Website page added in `../ai-sdlc-io/` with hero + value prop + architecture diagram + use-case scenarios + whitepaper download CTA
- [ ] #10 Architecture diagram shows the composite surface (RFC-0042 layer + RFC-0043 layer if in scope) — single canonical diagram referenced from whitepaper + website + docs (not three different diagrams)
- [ ] #11 Three-deliverable content is internally consistent (same architecture diagram; same comparison framing; same forgery-resistance argument)
- [ ] #12 No claim in the whitepaper that isn't traceable to an RFC section, AISDLC implementer task, or production incident — every assertion has a verifiable source
<!-- AC:END -->
