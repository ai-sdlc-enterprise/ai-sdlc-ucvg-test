# Tutorial 10: Authoring an Adopter RFC

> **Spec reference:** See [RFC-0036 §7 — Adopter RFC Scaffold](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#7-adopter-rfc-scaffold)
> for the normative design and [§4 — The Three-Tier Adopter Authoring Model](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#4-the-three-tier-adopter-authoring-model)
> for the altitude rubric that guides when an RFC is the right artifact.

Ai-sdlc's default authoring path is the **backlog task**: a single deliverable,
one PR, run through the DoR Gate, executed end-to-end by `/ai-sdlc execute`.
That path handles the vast majority of day-to-day feature work.

Occasionally, though, a team faces a **cross-cutting decision** that doesn't fit
the task altitude:

- "Should we move to Postgres as our vector store?"
- "How do we model multi-tenancy across three services?"
- "What's our strategy for migrating to the new auth provider?"

These questions benefit from a written decision record before anyone writes code.
The adopter RFC scaffold (`ai-sdlc rfc init`) provides a lightweight template
calibrated for this tier: no sign-off ceremony, no registry numbering, no
lifecycle frontmatter — just a clear structure for capturing options, tradeoffs,
and the final recommendation.

---

## Prerequisites

- ai-sdlc installed and initialized (`ai-sdlc init` complete).
- Feature flag enabled: `AI_SDLC_ADOPTER_AUTHORING=experimental` (see Step 1).
- Node.js 18+ and pnpm installed.

---

## Step 1: Enable the Feature Flag

The adopter-authoring surfaces ship behind a feature flag during the phased
rollout (mirrors the RFC-0015 / RFC-0014 promotion convention):

```bash
export AI_SDLC_ADOPTER_AUTHORING=experimental
```

Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) or your team's
`.env` / direnv configuration to persist it across sessions.

---

## Step 2: Scaffold the RFC

Run the scaffold command with a kebab-case slug that identifies the decision:

```bash
# CLI form
node pipeline-cli/bin/cli-rfc-init.mjs multi-tenancy-model

# Slash command form (inside Claude Code)
/ai-sdlc rfc init multi-tenancy-model
```

Both forms are equivalent; the CLI form is useful in CI or scripts, the slash
command form is convenient when you're already working inside Claude Code.

### What the scaffold creates

```
rfcs/
└── multi-tenancy-model.md    ← new RFC file
```

The generated file includes your author identity (from `git config user.email`),
today's date, and a title-cased title derived from the slug:

```markdown
# RFC: Multi Tenancy Model

**Status:** Draft
**Author:** you@example.com
**Created:** 2026-05-18

---

## Problem
...
## Options
...
## Recommendation
...
## Consequences
...
## Open Questions
...
```

---

## Step 3: Configure the Output Directory (Optional)

By default, RFCs are written to `<repo-root>/rfcs/`. Multi-repo teams or teams
with existing RFC directories can override this via `.ai-sdlc/adopter-authoring.yaml`:

```yaml
# .ai-sdlc/adopter-authoring.yaml
adopter-authoring:
  rfc-scaffold:
    rfcDir: docs/decisions    # relative to repo root
```

After saving this file, future `rfc init` calls write to `docs/decisions/<slug>.md`
without any additional flags.

You can also override per-invocation using `--rfc-dir`:

```bash
node pipeline-cli/bin/cli-rfc-init.mjs auth-redesign --rfc-dir architecture/rfcs
```

---

## Step 4: Fill in the RFC

Open the generated file and work through each section:

### Problem

Explain the decision context in 2-4 sentences:

- What is the current state?
- What pain or opportunity is driving this decision?
- What would happen if you don't decide?

**Example:**
> Our three services each have their own tenant-id column added ad hoc.
> As we add a fourth service, we need a consistent model before tech debt
> compounds. A decision now prevents three more months of divergent patterns.

### Options

List concrete options (typically 2-4). For each:

- **Description**: what the option looks like in practice.
- **Pros**: where it excels.
- **Cons**: where it falls short.
- **Open questions**: what you'd need to learn before committing.

Keep options concrete. "Do nothing" is a valid option if the status quo
is defensible — name it explicitly so the team can evaluate it.

### Recommendation

State which option you recommend and the deciding factor:

> **Recommendation: Option B — shared tenant context table.**
> Selected because it is the only option that works with our existing
> multi-region deployment without a cross-service migration. The 2-week
> migration cost is offset by eliminating the per-service tenant-id
> maintenance burden.

If the team is still deliberating, leave this as `TBD` and record the
final decision here when it arrives.

### Consequences

Describe what changes downstream:

- **Immediate:** What must happen in the next sprint?
- **Long-term:** What does this make easier or harder?
- **Reversibility:** Can you course-correct if new information arrives?

### Open Questions

List questions that are still unresolved. As each is answered, record
the resolution inline:

```
1. Which services need migration in Phase 1?
   **Resolved 2026-05-22:** auth, billing, and notifications; analytics deferred.
```

---

## Step 5: Circulate for Alignment

Commit the RFC file and open a PR (or share the file directly):

```bash
git add rfcs/multi-tenancy-model.md
git commit -m "docs: draft RFC — multi-tenancy model"
git push
gh pr create --title "RFC: Multi Tenancy Model" --body "Draft for team review."
```

The RFC is a decision-alignment artifact, not a pipeline artifact — it does not
go through DoR or `/ai-sdlc execute`. Review happens through your team's usual
PR or design-review process.

---

## Step 6: Record the Decision

When the team converges on a recommendation:

1. Update **Status** from `Draft` to `Decided`.
2. Fill in the **Recommendation** section with the final choice and rationale.
3. Record resolutions for each **Open Question**.
4. Merge the PR.

The RFC is now a persistent, searchable decision record that future team
members can reference when they ask "why did we model multi-tenancy this way?"

---

## Step 7: Create Backlog Tasks

From the Recommendation section, identify the concrete deliverables:

```bash
# Create one task per deliverable.
/ai-sdlc execute AISDLC-NNN   # the task for "implement shared tenant table"
/ai-sdlc execute AISDLC-NNN   # the task for "migrate auth service"
```

Each task references the RFC in its `references:` frontmatter so the DoR Gate
can trace the decision that produced it:

```yaml
---
id: AISDLC-NNN
title: 'Implement shared tenant context table'
references:
  - rfcs/multi-tenancy-model.md
---
```

---

## Dry-Run Mode

To preview what would be created without writing any file:

```bash
node pipeline-cli/bin/cli-rfc-init.mjs multi-tenancy-model --dry-run
```

Output:
```
[cli-rfc-init] dry-run: would create /path/to/rfcs/multi-tenancy-model.md
  rfc-dir: rfcs/
```

---

## JSON Output (for scripting)

Both the CLI and slash command support `--format json` for machine-readable output:

```bash
node pipeline-cli/bin/cli-rfc-init.mjs auth-redesign --format json
```

```json
{
  "ok": true,
  "slug": "auth-redesign",
  "outputPath": "/path/to/rfcs/auth-redesign.md",
  "rfcDir": "rfcs",
  "dryRun": false
}
```

---

## When NOT to Write an RFC

The RFC altitude is for cross-cutting decisions. Most day-to-day work does
not need one:

| Situation | Right artifact |
|---|---|
| "Add pagination to the `/users` endpoint" | Backlog task |
| "Fix the token expiry bug" | Backlog task |
| "Implement the spec-kit bridge import" | Backlog task (or Spec if multi-PR) |
| "Should we adopt event sourcing?" | RFC → then tasks |
| "How should we handle multi-tenancy?" | RFC → then tasks |
| "What's our database migration strategy for v2?" | RFC → then tasks |

The rubric: if the decision is cross-cutting (affects multiple features or
services), controversial (reasonable people disagree), or architectural (hard
to reverse), an RFC earns its weight. If it's a bounded implementation choice
within a single PR, go straight to a backlog task.

---

## See Also

- [RFC-0036 — Spec-Kit Bridge and Adopter Spec-Authoring Surface](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md)
- [Tutorial 1: Setting Up a Basic Pipeline](./01-basic-pipeline.md)
- [`cli-rfc-init` man page](../../pipeline-cli/src/cli/rfc-init.ts) (inline docs)
- [Three-tier authoring model (RFC-0036 §4)](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#4-the-three-tier-adopter-authoring-model)
