---
name: rfc init
description: Scaffold a lightweight adopter RFC at <rfc-dir>/<slug>.md from the embedded framework-rfc template (RFC-0036 Phase 2, AISDLC-327). Feature flag AI_SDLC_ADOPTER_AUTHORING=experimental required.
argument-hint: <slug>
allowed-tools:
  - Bash
  - Read
model: inherit
---

Scaffold a new adopter RFC for slug `$ARGUMENTS`.

## What this does

Calls `node pipeline-cli/bin/cli-rfc-init.mjs` to:
1. Validate the slug (kebab-case, lowercase alphanumeric + hyphens).
2. Resolve the RFC output directory (`rfcs/` by default; reads `.ai-sdlc/adopter-authoring.yaml` for `rfcDir` override).
3. Write `<rfc-dir>/<slug>.md` from the embedded `framework-rfc.md` template with your author identity, today's date, and a title-cased title.
4. Print next steps so you know where to find and edit the file.

## Feature flag

This command requires `AI_SDLC_ADOPTER_AUTHORING=experimental` to be set. The flag gates all RFC-0036 adopter-authoring surfaces during the phased rollout.

## Usage

```
/ai-sdlc rfc init <slug>
/ai-sdlc rfc init multi-tenancy-model
/ai-sdlc rfc init postgres-vector-migration
/ai-sdlc rfc init auth-redesign-2026
```

## Implementation

```bash
# Resolve the pipeline-cli bin path (supports all worktree topologies per AISDLC-245.4).
PIPELINE_CLI_BIN=""
if [ -f "$(git rev-parse --show-toplevel 2>/dev/null)/pipeline-cli/bin/cli-rfc-init.mjs" ]; then
  PIPELINE_CLI_BIN="$(git rev-parse --show-toplevel)/pipeline-cli/bin/cli-rfc-init.mjs"
elif [ -f "./pipeline-cli/bin/cli-rfc-init.mjs" ]; then
  PIPELINE_CLI_BIN="./pipeline-cli/bin/cli-rfc-init.mjs"
fi

if [ -z "$PIPELINE_CLI_BIN" ]; then
  echo "[/ai-sdlc rfc init] ERROR: could not locate pipeline-cli/bin/cli-rfc-init.mjs."
  echo "  Ensure you are inside a repository with ai-sdlc installed."
  exit 1
fi

# Parse the slug from $ARGUMENTS (strip leading 'rfc init ' if the user
# included the subcommand prefix — the slash command already strips '/ai-sdlc').
SLUG="${ARGUMENTS#rfc init }"
SLUG="${SLUG#rfc-init }"
SLUG="$(echo "$SLUG" | xargs)"  # trim whitespace

if [ -z "$SLUG" ]; then
  echo "[/ai-sdlc rfc init] ERROR: a slug argument is required."
  echo "  Usage: /ai-sdlc rfc init <slug>"
  echo "  Example: /ai-sdlc rfc init multi-tenancy-model"
  exit 1
fi

# Run the CLI.
node "$PIPELINE_CLI_BIN" "$SLUG"
```

## After the RFC is created

The scaffold is intentionally lightweight — no ceremony, no registry number, no sign-off process. Edit the generated file and:

1. **Fill in the Problem section** — explain the decision and why it matters now.
2. **List your options** — Option A, B, etc. with pros, cons, and open questions.
3. **Circulate for alignment** — share via PR, Slack, or your team's usual review channel.
4. **Record the decision** — when the team converges, fill in the Recommendation and mark Status as `Decided`.
5. **Create backlog tasks** — from the Recommendation, author one task per deliverable and run them through `/ai-sdlc execute`.

## Template structure (framework-rfc.md)

```markdown
# RFC: <Title>

**Status:** Draft
**Author:** <your email>
**Created:** <today>

## Problem
## Options
  ### Option A
  ### Option B
## Recommendation
## Consequences
## Open Questions
```

Per RFC-0036 OQ-5 resolution: one template ships in Phase 2. If your team needs variants (architecture, product-decision, retrospective), file a backlog task — operator demand signals drive the catalog Decision.

## Configuration override (adopter-authoring.yaml)

By default, RFCs are written to `<repo-root>/rfcs/<slug>.md`. Multi-repo adopters who want a central RFC location can configure:

```yaml
# .ai-sdlc/adopter-authoring.yaml
adopter-authoring:
  rfc-scaffold:
    rfcDir: '../company-rfcs/rfcs'   # relative to repo root, or absolute
```

See [RFC-0036 §14.1](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#141-configuration-schema-per-org-defaults) for the full config schema.

## See also

- [RFC-0036 §7 — Adopter RFC Scaffold](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#7-adopter-rfc-scaffold)
- [Tutorial: Authoring an Adopter RFC](../../docs/tutorials/10-authoring-adopter-rfc.md)
- [Three-tier authoring altitude model](../../spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md#4-the-three-tier-adopter-authoring-model)
