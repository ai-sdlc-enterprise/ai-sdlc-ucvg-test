# Project Glasswing — Outreach Draft

> Status: **draft, not sent.** Internal positioning note + ready-to-paste contact-form
> message for reaching Anthropic's Project Glasswing about AI-SDLC's zero-trust
> untrusted-contributor PR verification (RFC-0042 + RFC-0043).
>
> Owner: dominique@reliablegenius.io

## Strategic framing — the wedge

Glasswing's expansion is about scaling vulnerability **discovery** and **patching** in
open-source software. Per Anthropic's own numbers, Claude Mythos Preview has found
~6,202 high/critical vulnerabilities across 1,000+ OSS projects, and Anthropic is "in
active discussions to substantially scale up the review and patching of vulnerabilities
in open-source software, including… standardized best practices for disclosing findings
to open-source maintainers."

That creates a downstream choke point they've publicly named: once you find 6,202 fixes,
someone has to **land** 6,202 patches — as PRs, into repos, past maintainers who can't
manually review a flood of machine-generated contributions from outside their trust
boundary. **Discovery is now AI-speed; merge is still human-speed.**

That gap is exactly what RFC-0043 closes. We are not pitching "a tool" — we are offering
the **patch-delivery layer** that makes their patch-discovery program reach production.
A complement, not a sale.

## Contact-form message (ready to paste)

**Topic:** Closing the patch-delivery bottleneck for Glasswing's OSS vulnerability findings

---

Hi Project Glasswing team,

Congratulations on the expansion. The 6,202 high/critical findings across 1,000+ OSS
projects make a downstream problem urgent: discovery is now AI-speed, but **merge is
still human-speed**. Every fix has to land as a PR past a maintainer who can't manually
review a flood of patches from contributors outside their trust boundary — and your own
note about "standardized best practices for disclosing findings to maintainers" points
at exactly this gap.

I lead **AI-SDLC**, an open-source autonomous-SDLC framework, and we've shipped the
missing layer: a **zero-trust verification gate for untrusted-contributor PRs**. It lets
a maintainer accept fork/agent-authored patches at automation throughput without
weakening their trust boundary:

- **Stage 1 — AST gate:** hard-blocks protected-path and lifecycle-script edits
  deterministically, zero LLM/sandbox spend.
- **Stage 2/3 — sandbox:** runs reviewers + differential tests with credentials stripped
  and network denied — contributor code never touches secrets.
- **Stage 4 — clean-room signer:** mints a forgery-resistant, operator-keyed
  **Merkle-transcript attestation** (RFC-0042) — a cryptographic record of *what* was
  reviewed, stable across rebases. The signing key never shares an environment with
  untrusted code.

The result: prompt-injection, credential exfiltration, privilege escalation, and approval
forgery are each closed by the stage best placed to stop them — and the maintainer gets a
verifiable provenance record per patch.

RFC-0042 is implemented and default-on in our framework today; RFC-0043 (the gate) is in
active rollout. Whitepaper and threat model:
https://ai-sdlc.io/whitepapers/untrusted-contributor-verification

I'd love 20 minutes to explore whether this could serve as a verification/disclosure
standard for the patches Glasswing partners are generating. Happy to send the threat
model and a live demo on any repo you choose.

Dominique · dominique@reliablegenius.io · AI-SDLC

---

## Tactical notes

1. **The form's stated intent is bug-reporting, not partnerships.** Leading with *their*
   findings problem (not our tool) is what keeps this out of the "thanks, we'll log it"
   bucket. The first paragraph is entirely about their bottleneck — keep it that way.
2. **Verify claims before sending.** RFC-0042 status ("Implemented / default-on") and
   RFC-0043 status ("Ready for Review, in rollout") are accurate as of this draft.
   Confirm the whitepaper URL resolves publicly before pasting — that link is the
   credibility anchor.
3. **Lead with candor if they engage technically.** Our concept doc is deliberately honest
   ("we don't claim proof of the absence of all vectors"). A security org will trust the
   pitch *more* for it, not less.

## Sources

- Expanding Project Glasswing — https://www.anthropic.com/news/expanding-project-glasswing
- Glasswing initial update — https://www.anthropic.com/research/glasswing-initial-update
- Project Glasswing — https://www.anthropic.com/glasswing

## Internal cross-references

- `docs/concepts/zero-trust-untrusted-pr-verification.md` — positioning/concept page
- `spec/rfcs/RFC-0042-proof-of-execution-attestation.md` — Merkle-transcript attestation substrate
- `spec/rfcs/RFC-0043-untrusted-contributor-pr-verification.md` — 4-stage verification gate
- `backlog/tasks/aisdlc-496 ...` — whitepaper / marketing positioning task
