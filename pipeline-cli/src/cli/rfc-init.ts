/**
 * `cli-rfc-init` — RFC-0036 Phase 2: adopter RFC scaffold (AISDLC-327).
 *
 * Scaffolds a lightweight adopter RFC at `<rfcDir>/<slug>.md` using the
 * embedded `framework-rfc.md` template. Deliberately lighter than the
 * internal `spec/rfcs/RFC-0001-template.md`: no frontmatter schema, no
 * sign-off ceremony, no registry numbering. Adopters adapt the template
 * as their process matures (RFC-0036 §7.3).
 *
 * Configuration (all optional):
 *   `.ai-sdlc/adopter-authoring.yaml`
 *     adopter-authoring:
 *       rfc-scaffold:
 *         rfcDir: rfcs/    # default: rfcs/
 *
 * Feature flag: `AI_SDLC_ADOPTER_AUTHORING`. Truthy values: `1`, `true`,
 * `yes`, `on`, `experimental` (case-insensitive). When unset, the CLI
 * exits with a "not enabled" message and instructions to set the flag.
 *
 * Usage:
 *   node pipeline-cli/bin/cli-rfc-init.mjs <slug> [options]
 *   node pipeline-cli/bin/cli-rfc-init.mjs multi-tenancy-model
 *   node pipeline-cli/bin/cli-rfc-init.mjs postgres-vector-migration --rfc-dir decisions/
 *
 * Exit codes:
 *   0 — RFC file created (or would be, with --dry-run)
 *   1 — error (feature flag not set, invalid slug, file already exists, I/O failure)
 *
 * @module cli/rfc-init
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { load as yamlLoad } from 'js-yaml';
import yargs, { type Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';

// ── Feature flag ──────────────────────────────────────────────────────────────

const TRUTHY_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on', 'experimental']);

/** Returns true when AI_SDLC_ADOPTER_AUTHORING is set to a truthy value. */
export function isFeatureFlagEnabled(): boolean {
  const val = (process.env.AI_SDLC_ADOPTER_AUTHORING ?? '').toLowerCase();
  return TRUTHY_FLAG_VALUES.has(val);
}

// ── Slug validation ───────────────────────────────────────────────────────────

/**
 * Regex for valid RFC slugs.
 * Accepts lowercase alphanumeric characters and single hyphens (no consecutive).
 * Segments separated by hyphens must each be at least one char.
 * Enforces a maximum length of 80 characters separately via slugLength check.
 *
 * Pattern: one or more alphanumeric segments joined by single hyphens.
 * Examples: "multi-tenancy-model", "postgres-vector", "auth-redesign-2026"
 */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Maximum allowed slug length in characters. */
export const SLUG_MAX_LENGTH = 80;

// ── Embedded template ─────────────────────────────────────────────────────────

/**
 * The adopter RFC template (`framework-rfc.md`).
 *
 * Deliberately lighter than the internal `spec/rfcs/RFC-0001-template.md`:
 *   - No frontmatter schema or lifecycle fields
 *   - No sign-off ceremony or registry numbering
 *   - No requiresDocs gating
 *   - Focused on the decision at hand, not framework ceremony
 *
 * Per RFC-0036 OQ-5 resolution: one template in v1; variants are a future
 * Decision in the catalog if adopter demand signals warrant them.
 *
 * Template variables (substituted at scaffold time):
 *   {{title}}   — title-cased slug (e.g. "Multi Tenancy Model")
 *   {{author}}  — git config user.email or $USER
 *   {{date}}    — ISO-8601 date (YYYY-MM-DD)
 *   {{slug}}    — the raw slug (e.g. "multi-tenancy-model")
 */
export const FRAMEWORK_RFC_TEMPLATE = `# RFC: {{title}}

**Status:** Draft
**Author:** {{author}}
**Created:** {{date}}

---

## Problem

What decision are we trying to make? Why now?

_Describe the current state, the pain point or opportunity, and what would
change if we don't make a decision._

---

## Options

### Option A — <name>

- **Description:** What does this approach look like?
- **Pros:** What does it do well?
- **Cons:** Where does it fall short?
- **Open questions:** What would we need to learn before committing?

### Option B — <name>

- **Description:**
- **Pros:**
- **Cons:**
- **Open questions:**

_(Add more options as needed. Remove this section if the decision is
 already obvious and you're documenting the rationale, not making a choice.)_

---

## Recommendation

Which option, and why? What was the deciding factor?

_If the team is still deliberating, leave this section as "TBD" and record
 the vote or async decision outcome here when it's made._

---

## Consequences

What changes downstream of this decision?

- **Immediate:** What must happen in the next sprint / PR?
- **Long-term:** What does this make easier or harder later?
- **Reversibility:** Can we change course if new information arrives?

---

## Open Questions

1. _Replace with your first open question._
2. _Replace with your second, or delete this line._

_Once questions are resolved, record the answer inline (e.g. "Resolved
 2026-05-20: we chose X because Y") so this document stays a living record._

---

_This RFC was scaffolded by \`ai-sdlc rfc init {{slug}}\`.
 See [RFC-0036](https://github.com/ai-sdlc-framework/ai-sdlc/blob/main/spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md)
 for the adopter-authoring altitude model._
`;

// ── Config reader ─────────────────────────────────────────────────────────────

export interface AdopterAuthoringConfig {
  rfcDir: string;
}

/**
 * Read `adopter-authoring['rfc-scaffold']['rfcDir']` from
 * `<workDir>/.ai-sdlc/adopter-authoring.yaml`. Returns defaults when the
 * file is absent or the key is missing.
 *
 * Failure modes:
 *   - File absent → silently return defaults (opt-in config).
 *   - File present but not parseable YAML → throw with a clear message.
 *   - File present, YAML parseable, key absent → return defaults.
 */
export function readAdopterAuthoringConfig(workDir: string): AdopterAuthoringConfig {
  const configPath = join(workDir, '.ai-sdlc', 'adopter-authoring.yaml');
  if (!existsSync(configPath)) {
    return { rfcDir: 'rfcs' };
  }

  const raw = readFileSync(configPath, 'utf8');
  try {
    const doc = yamlLoad(raw) as Record<string, unknown> | null;
    if (doc === null || typeof doc !== 'object') {
      return { rfcDir: 'rfcs' };
    }
    const authoring = (doc as Record<string, unknown>)['adopter-authoring'];
    if (typeof authoring !== 'object' || authoring === null) {
      return { rfcDir: 'rfcs' };
    }
    const scaffold = (authoring as Record<string, unknown>)['rfc-scaffold'];
    if (typeof scaffold !== 'object' || scaffold === null) {
      return { rfcDir: 'rfcs' };
    }
    const rfcDir = (scaffold as Record<string, unknown>)['rfcDir'];
    if (typeof rfcDir === 'string' && rfcDir.length > 0) {
      return { rfcDir: rfcDir.replace(/\/$/, '') };
    }
    return { rfcDir: 'rfcs' };
  } catch (err) {
    throw new Error(
      `[cli-rfc-init] failed to parse ${configPath}: ${(err as Error).message}\n` +
        `Ensure the file is valid YAML. See RFC-0036 §14.1 for the expected schema.`,
    );
  }
}

// ── Core helper ───────────────────────────────────────────────────────────────

export interface RfcInitOptions {
  slug: string;
  workDir?: string;
  rfcDirOverride?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface RfcInitResult {
  slug: string;
  outputPath: string;
  rfcDir: string;
  dryRun: boolean;
  alreadyExists: false;
}

export interface RfcInitAlreadyExistsResult {
  slug: string;
  outputPath: string;
  alreadyExists: true;
}

export type RfcInitOutcome = RfcInitResult | RfcInitAlreadyExistsResult;

/**
 * Scaffold an adopter RFC at `<rfcDir>/<slug>.md`.
 *
 * Priority for rfcDir (first wins):
 *   1. `opts.rfcDirOverride` (e.g. from --rfc-dir CLI flag)
 *   2. `.ai-sdlc/adopter-authoring.yaml` `rfcDir` field
 *   3. Hardcoded default: `rfcs`
 *
 * Template variable substitution:
 *   {{title}}  — title-cased slug
 *   {{author}} — git user.email (best-effort, falls back to $USER or "unknown")
 *   {{date}}   — today's date YYYY-MM-DD
 *   {{slug}}   — raw slug
 */
export function initAdopterRfc(opts: RfcInitOptions): RfcInitOutcome {
  const workDir = opts.workDir ?? process.cwd();

  // Determine rfcDir.
  let rfcDir: string;
  if (opts.rfcDirOverride) {
    rfcDir = opts.rfcDirOverride.replace(/\/$/, '');
  } else {
    const config = readAdopterAuthoringConfig(workDir);
    rfcDir = config.rfcDir;
  }

  const outputPath = resolve(workDir, rfcDir, `${opts.slug}.md`);

  // Detect existing file (not --force).
  if (!opts.force && existsSync(outputPath)) {
    return { slug: opts.slug, outputPath, alreadyExists: true };
  }

  if (opts.dryRun) {
    return { slug: opts.slug, outputPath, rfcDir, dryRun: true, alreadyExists: false };
  }

  // Resolve template variables.
  const title = opts.slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const author = resolveAuthor();
  const date = new Date().toISOString().slice(0, 10);

  const content = FRAMEWORK_RFC_TEMPLATE.replace(/\{\{title\}\}/g, title)
    .replace(/\{\{author\}\}/g, author)
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{slug\}\}/g, opts.slug);

  // Ensure directory exists.
  mkdirSync(resolve(workDir, rfcDir), { recursive: true });

  // Write the RFC file.
  writeFileSync(outputPath, content, 'utf8');

  return { slug: opts.slug, outputPath, rfcDir, dryRun: false, alreadyExists: false };
}

/**
 * Best-effort git user identity resolution.
 * Priority: git config user.email → $USER → "unknown".
 */
function resolveAuthor(): string {
  try {
    const r = spawnSync('git', ['config', 'user.email'], { encoding: 'utf8', stdio: 'pipe' });
    const email = r.stdout?.trim();
    if (email) return email;
  } catch {
    // ignore
  }
  return process.env.USER ?? 'unknown';
}

// ── yargs CLI router ──────────────────────────────────────────────────────────

export function buildRfcInitCli(): Argv {
  return yargs(hideBin(process.argv))
    .scriptName('cli-rfc-init')
    .usage(
      'Usage: $0 <slug> [options]\n\n' +
        '  Scaffold a lightweight adopter RFC at <rfc-dir>/<slug>.md.\n\n' +
        '  Examples:\n' +
        '    node pipeline-cli/bin/cli-rfc-init.mjs multi-tenancy-model\n' +
        '    node pipeline-cli/bin/cli-rfc-init.mjs auth-redesign --rfc-dir decisions/\n' +
        '    node pipeline-cli/bin/cli-rfc-init.mjs postgres-migration --dry-run\n\n' +
        '  Feature flag: set AI_SDLC_ADOPTER_AUTHORING=experimental to enable.',
    )
    .option('work-dir', {
      alias: 'w',
      type: 'string',
      describe: 'Repo root (default: cwd).',
      default: process.cwd(),
    })
    .option('rfc-dir', {
      alias: 'd',
      type: 'string',
      describe:
        'Directory to write the RFC into (relative to --work-dir). Overrides adopter-authoring.yaml.',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Show what would be created without writing anything.',
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      default: false,
      describe: 'Overwrite an existing RFC file.',
    })
    .option('format', {
      type: 'string',
      choices: ['text', 'json'] as const,
      default: 'text' as const,
      describe: 'Output format.',
    })
    .command(
      '$0 <slug>',
      'Scaffold a new adopter RFC',
      (y) =>
        y.positional('slug', {
          type: 'string',
          describe: 'RFC slug (kebab-case, e.g. "multi-tenancy-model").',
          demandOption: true,
        }),
      (argv) => {
        // Feature flag gate.
        if (!isFeatureFlagEnabled()) {
          const msg =
            '[cli-rfc-init] adopter authoring is not enabled.\n' +
            'Set AI_SDLC_ADOPTER_AUTHORING=experimental to enable.\n' +
            'See spec/rfcs/RFC-0036-spec-kit-bridge-adopter-authoring.md §7 for details.';
          const format = String(argv.format) as 'text' | 'json';
          if (format === 'json') {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
          } else {
            process.stderr.write(msg + '\n');
          }
          process.exit(1);
        }

        const slug = String(argv.slug);
        const format = String(argv.format) as 'text' | 'json';

        // Validate slug.
        if (!SLUG_RE.test(slug) || slug.length > SLUG_MAX_LENGTH) {
          const msg =
            `[cli-rfc-init] Invalid slug: "${slug}"\n` +
            `  Expected: lowercase alphanumeric + single hyphens, max ${SLUG_MAX_LENGTH} chars.\n` +
            `  Must start and end with alphanumeric. No consecutive hyphens.\n` +
            `  Examples: "multi-tenancy-model", "postgres-migration", "auth-redesign-2026"\n` +
            `  Regex: ${SLUG_RE.toString()}`;
          if (format === 'json') {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
          } else {
            process.stderr.write(msg + '\n');
          }
          process.exit(1);
        }

        let result: RfcInitOutcome;
        try {
          result = initAdopterRfc({
            slug,
            workDir: String(argv['work-dir']),
            rfcDirOverride: argv['rfc-dir'] as string | undefined,
            dryRun: Boolean(argv['dry-run']),
            force: Boolean(argv.force),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (format === 'json') {
            process.stdout.write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
          } else {
            process.stderr.write(msg + '\n');
          }
          process.exit(1);
        }

        if (result.alreadyExists) {
          const msg =
            `[cli-rfc-init] ${result.outputPath} already exists.\n` + `  Use --force to overwrite.`;
          if (format === 'json') {
            process.stdout.write(
              JSON.stringify(
                { ok: false, alreadyExists: true, outputPath: result.outputPath },
                null,
                2,
              ) + '\n',
            );
          } else {
            process.stderr.write(msg + '\n');
          }
          process.exit(1);
        }

        // Success.
        if (format === 'json') {
          process.stdout.write(
            JSON.stringify(
              {
                ok: true,
                slug: result.slug,
                outputPath: result.outputPath,
                rfcDir: result.rfcDir,
                dryRun: result.dryRun,
              },
              null,
              2,
            ) + '\n',
          );
        } else {
          if (result.dryRun) {
            process.stdout.write(
              `[cli-rfc-init] dry-run: would create ${result.outputPath}\n` +
                `  rfc-dir: ${result.rfcDir}/\n`,
            );
          } else {
            process.stdout.write(
              `[cli-rfc-init] created ${result.outputPath}\n` +
                `  slug: ${result.slug}\n` +
                `  rfc-dir: ${result.rfcDir}/\n\n` +
                `  Next steps:\n` +
                `    1. Open ${result.outputPath} and fill in the Problem section.\n` +
                `    2. Share with your team for alignment.\n` +
                `    3. When decided, create backlog tasks from the Recommendation.\n`,
            );
          }
        }
        process.exit(0);
      },
    )
    .strict()
    .help()
    .alias('h', 'help')
    .version(false);
}

export async function runRfcInitCli(): Promise<void> {
  await buildRfcInitCli().parseAsync();
}
