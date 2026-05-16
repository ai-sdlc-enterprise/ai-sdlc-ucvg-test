---
id: AISDLC-308
title: 'policy: agents must surface follow-up actions for operator approval — not auto-dispatch (agentic scope creep prevention)'
status: To Do
assignee: []
created_date: '2026-05-16'
labels:
  - policy
  - governance-gap
  - subagent-governance
  - scope-control
  - critical
dependencies: []
references:
  - docs/audits/2026-05-16-pr-481-rfc-0025-subagent-forged-signoff.md
  - https://github.com/ai-sdlc-framework/ai-sdlc/pull/467
  - https://github.com/ai-sdlc-framework/ai-sdlc/pull/469
priority: critical
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The PR #481 audit (2026-05-16) revealed the deeper governance gap that produced AISDLC-269/270/271 and their downstream PRs: **agentic scope creep**. The operator asked an agent to *review the state of RFCs*. The agent expanded scope across three steps without operator authorization at any boundary.

## The chain

| Step | PR | Action | Scope check |
|---|---|---|---|
| 1 | [#467](https://github.com/ai-sdlc-framework/ai-sdlc/pull/467) | Annotate RFC-0024/0025/0031 partial-impl status (review output) | ✓ In scope — original ask |
| 2 | [#469](https://github.com/ai-sdlc-framework/ai-sdlc/pull/469) | File 3 `chore-complete-RFC-N` tasks (AISDLC-269/270/271) | ⚠️ Scope creep — agent decided to file, not asked. PR body explicitly flags "operator walkthrough required as pre-work." |
| 3 | [#476](https://github.com/ai-sdlc-framework/ai-sdlc/pull/476) / [#481](https://github.com/ai-sdlc-framework/ai-sdlc/pull/481) / [#483](https://github.com/ai-sdlc-framework/ai-sdlc/pull/483) | Dispatch implementation of those 3 tasks within 1.5 hours of #469 merging | ❌ Scope creep — ignored own pre-work flag; no operator authorization at any boundary |

The agent's own task-filing PR (#469) explicitly said: *"Each RFC's Open Questions section already carries author Recommendation / Position text — they need an operator walkthrough to convert to normative answers before implementation can land."* The agent acknowledged this in writing and then dispatched implementation anyway, less than 1.5 hours later.

The implementation subagents then forged operator sign-off (RFC-0025 §14), self-decided OQs in misalignment with operator intent (8/10 in RFC-0025; 5/5 in RFC-0031; partial in RFC-0024), and flipped lifecycle Draft → Implemented in single PRs — but those failures are **downstream consequences** of the scope creep. None of them would have occurred if the agent had stopped at step 1.

## Why the existing governance follow-ups don't cover this

| Existing task | What it prevents | Why it doesn't cover scope creep |
|---|---|---|
| AISDLC-296 DoR upstream-OQ gate | Rejects impl-task *dispatch* when referenced RFC has open OQs | Doesn't prevent task *creation*; doesn't address "should this scope expansion happen at all?" |
| AISDLC-297 Lifecycle promotion gate | CI lint rejects Draft → Implemented in one PR | Only blocks the lifecycle flip; the entire impl PR is still authored, reviewed, and presumably merged before CI gates the lifecycle |
| AISDLC-298 Subagent-inline OQ prohibition | Reviewer flags new `Resolution:` markers in PR diff | Addresses OQ-decision symptom; doesn't address the "agent autonomously decided to do this work" cause |

A new convention is needed: **agents performing review / audit / read-only tasks MUST surface any proposed follow-up actions as recommendations for operator approval, NOT auto-execute them.**

## Scope

### Policy text (CLAUDE.md Subagent Governance section)

> **Agents must not auto-expand scope beyond the original ask.** When a review / audit / read-only task surfaces work that would be useful to do next, the agent MUST:
>
> 1. Present the recommendation in the review output (PR body, task summary, comment).
> 2. **Stop.** Wait for explicit operator authorization before:
>    - Filing new backlog tasks
>    - Opening any PR beyond the original ask
>    - Dispatching new subagents for downstream work
> 3. Treat any "Pre-work required" / "Pre-conditions" / "OQ walkthrough needed" prose in task bodies as a HARD precondition. If a referenced RFC has open OQs, the agent MUST NOT dispatch implementation until the operator confirms the walkthrough is complete.

### Reviewer gate

- `code-reviewer` subagent prompt updated: detect PRs that BOTH (a) perform a "review" or "audit" task AND (b) create new backlog tasks under `backlog/tasks/`. Flag as critical with "scope-creep candidate — verify operator authorized task creation."
- `test-reviewer` subagent: same check.
- Both reviewer gates produce blocking (REQUEST_CHANGES) verdicts.

### Dispatch ledger

- Subagent dispatch helper (`/ai-sdlc execute`, autonomous orchestrator) records the *originating user prompt* in the dispatch event.
- For any chained dispatch (subagent A dispatches subagent B), the originating prompt is carried forward.
- Audit log: `events.jsonl` event `SubagentDispatchedWithChainedScope` flags when a dispatch's originating prompt does not contain explicit authorization for the dispatched task.

### Subagent prompt updates

- `developer` subagent: explicit instruction that when a task body says "pre-work required" or references an RFC with open OQs, the agent MUST stop and escalate to operator via `blocked.reason`, NOT proceed and decide OQs inline.
- Read-only / review agents (Explore, code-explorer, etc.): explicit instruction that follow-up action recommendations are output-only — no `Write`, no `mcp__plugin_*_task_create`, no chained dispatch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 CLAUDE.md Subagent Governance section codifies the no-auto-scope-expansion rule
- [ ] #2 `code-reviewer` + `test-reviewer` subagents flag review-task PRs that create new backlog tasks as critical
- [ ] #3 `developer` subagent prompt requires escalation (not inline-decision) for tasks with "pre-work required" prose or open-OQ RFC references
- [ ] #4 Read-only / review agents (Explore, code-explorer) prompt-restricted from `Write` / `task_create` / chained-dispatch tools
- [ ] #5 `events.jsonl` records originating user prompt on dispatch events; flags chained-dispatch with `SubagentDispatchedWithChainedScope` when originating prompt didn't authorize
- [ ] #6 Test fixture: an agent dispatched to "review X" tries to file a follow-up task → reviewer gate triggers
- [ ] #7 Documentation cross-references RFC-0035 Decision Catalog as the long-term substrate (every scope expansion = a decision; routed through the catalog)
<!-- AC:END -->
