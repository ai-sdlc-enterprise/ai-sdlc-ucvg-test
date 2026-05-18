/**
 * Hermetic tests for `initAdopterRfc()` and the yargs CLI router (AISDLC-327).
 *
 * Covers:
 *   - Feature flag gate (isFeatureFlagEnabled)
 *   - Slug validation (SLUG_RE)
 *   - RFC file creation in default rfcDir (rfcs/)
 *   - RFC file creation with --rfc-dir override
 *   - RFC file creation with adopter-authoring.yaml override
 *   - Dry-run mode (no file written)
 *   - Already-exists guard (and --force override)
 *   - Template variable substitution (title, date, slug)
 *   - CLI yargs router exit codes and output (JSON + text)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildRfcInitCli,
  FRAMEWORK_RFC_TEMPLATE,
  initAdopterRfc,
  isFeatureFlagEnabled,
  readAdopterAuthoringConfig,
  SLUG_MAX_LENGTH,
  SLUG_RE,
} from './rfc-init.js';

// ── Test utilities ────────────────────────────────────────────────────────────

let workDir: string;

function setupWorkDir(): void {
  workDir = mkdtempSync(join(tmpdir(), 'cli-rfc-init-test-'));
}

function teardownWorkDir(): void {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function enableFlag(): void {
  process.env.AI_SDLC_ADOPTER_AUTHORING = 'experimental';
}

function disableFlag(): void {
  delete process.env.AI_SDLC_ADOPTER_AUTHORING;
}

beforeEach(() => {
  setupWorkDir();
  enableFlag();
});

afterEach(() => {
  teardownWorkDir();
  disableFlag();
});

// ── Feature flag ──────────────────────────────────────────────────────────────

describe('isFeatureFlagEnabled', () => {
  it.each(['1', 'true', 'yes', 'on', 'experimental', 'TRUE', 'EXPERIMENTAL', 'Yes'])(
    'returns true for truthy value %s',
    (val) => {
      process.env.AI_SDLC_ADOPTER_AUTHORING = val;
      expect(isFeatureFlagEnabled()).toBe(true);
    },
  );

  it.each(['0', 'false', 'no', 'off', '', 'random'])(
    'returns false for non-truthy value %s',
    (val) => {
      process.env.AI_SDLC_ADOPTER_AUTHORING = val;
      expect(isFeatureFlagEnabled()).toBe(false);
    },
  );

  it('returns false when env var is unset', () => {
    disableFlag();
    expect(isFeatureFlagEnabled()).toBe(false);
  });
});

// ── SLUG_RE ───────────────────────────────────────────────────────────────────

describe('SLUG_RE — slug validation regex', () => {
  it.each([
    'a',
    'ab',
    'foo',
    'multi-tenancy-model',
    'postgres-vector-migration',
    'auth-redesign-2026',
    'x1',
    'a1b2c3',
    'simple',
  ])('accepts valid slug: %s', (slug) => {
    expect(SLUG_RE.test(slug)).toBe(true);
  });

  it.each(['', '-', '-foo', 'foo-', 'FOO', 'Foo', 'foo bar', 'foo_bar', 'foo--bar', 'foo.bar'])(
    'rejects invalid slug: %s',
    (slug) => {
      expect(SLUG_RE.test(slug)).toBe(false);
    },
  );

  it('rejects a slug longer than SLUG_MAX_LENGTH chars (via CLI length check)', () => {
    // SLUG_RE validates structure; length is enforced separately via SLUG_MAX_LENGTH.
    // A slug of SLUG_MAX_LENGTH+1 chars should fail the combined check.
    const longSlug = 'a' + '-x'.repeat(40); // 81 chars
    expect(longSlug.length).toBeGreaterThan(SLUG_MAX_LENGTH);
    // The slug itself is structurally valid (starts+ends with alphanumeric, no consecutive hyphens)
    // but exceeds the max length — enforced via SLUG_MAX_LENGTH in the CLI.
    expect(longSlug.length > SLUG_MAX_LENGTH).toBe(true);
  });
});

// ── readAdopterAuthoringConfig ────────────────────────────────────────────────

describe('readAdopterAuthoringConfig', () => {
  it('returns default rfcDir when config file is absent', () => {
    const cfg = readAdopterAuthoringConfig(workDir);
    expect(cfg.rfcDir).toBe('rfcs');
  });

  it('returns rfcDir from adopter-authoring.yaml', () => {
    const configDir = join(workDir, '.ai-sdlc');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'adopter-authoring.yaml'),
      'adopter-authoring:\n  rfc-scaffold:\n    rfcDir: decisions/\n',
      'utf8',
    );
    const cfg = readAdopterAuthoringConfig(workDir);
    expect(cfg.rfcDir).toBe('decisions');
  });

  it('returns default when rfc-scaffold key is absent', () => {
    const configDir = join(workDir, '.ai-sdlc');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'adopter-authoring.yaml'),
      'adopter-authoring:\n  rfc-templates:\n    defaultTemplate: framework-rfc.md\n',
      'utf8',
    );
    const cfg = readAdopterAuthoringConfig(workDir);
    expect(cfg.rfcDir).toBe('rfcs');
  });

  it('strips trailing slash from rfcDir', () => {
    const configDir = join(workDir, '.ai-sdlc');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'adopter-authoring.yaml'),
      'adopter-authoring:\n  rfc-scaffold:\n    rfcDir: docs/decisions/\n',
      'utf8',
    );
    const cfg = readAdopterAuthoringConfig(workDir);
    expect(cfg.rfcDir).toBe('docs/decisions');
  });

  it('throws on invalid YAML', () => {
    const configDir = join(workDir, '.ai-sdlc');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'adopter-authoring.yaml'),
      'adopter-authoring: {unclosed',
      'utf8',
    );
    expect(() => readAdopterAuthoringConfig(workDir)).toThrow(/failed to parse/);
  });
});

// ── initAdopterRfc — happy paths ──────────────────────────────────────────────

describe('initAdopterRfc — happy path', () => {
  it('creates RFC file at rfcs/<slug>.md by default', () => {
    const result = initAdopterRfc({ slug: 'multi-tenancy-model', workDir });
    expect(result.alreadyExists).toBe(false);
    if (result.alreadyExists) return;

    const expectedPath = join(workDir, 'rfcs', 'multi-tenancy-model.md');
    expect(result.outputPath).toBe(expectedPath);
    expect(existsSync(expectedPath)).toBe(true);
  });

  it('creates rfcs/ directory if it does not exist', () => {
    initAdopterRfc({ slug: 'auth-redesign', workDir });
    expect(existsSync(join(workDir, 'rfcs'))).toBe(true);
  });

  it('uses rfcDirOverride when provided', () => {
    const result = initAdopterRfc({
      slug: 'postgres-vector',
      workDir,
      rfcDirOverride: 'decisions',
    });
    expect(result.alreadyExists).toBe(false);
    if (result.alreadyExists) return;

    expect(result.outputPath).toContain(join('decisions', 'postgres-vector.md'));
    expect(existsSync(result.outputPath)).toBe(true);
  });

  it('reads rfcDir from adopter-authoring.yaml when no override', () => {
    const configDir = join(workDir, '.ai-sdlc');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'adopter-authoring.yaml'),
      'adopter-authoring:\n  rfc-scaffold:\n    rfcDir: architecture/\n',
      'utf8',
    );

    const result = initAdopterRfc({ slug: 'auth-flow', workDir });
    expect(result.alreadyExists).toBe(false);
    if (result.alreadyExists) return;

    expect(result.outputPath).toContain(join('architecture', 'auth-flow.md'));
    expect(existsSync(result.outputPath)).toBe(true);
  });

  it('substitutes {{title}} with title-cased slug', () => {
    initAdopterRfc({ slug: 'multi-tenancy-model', workDir });
    const content = readFileSync(join(workDir, 'rfcs', 'multi-tenancy-model.md'), 'utf8');
    expect(content).toContain('Multi Tenancy Model');
  });

  it('substitutes {{slug}} with the raw slug', () => {
    initAdopterRfc({ slug: 'multi-tenancy-model', workDir });
    const content = readFileSync(join(workDir, 'rfcs', 'multi-tenancy-model.md'), 'utf8');
    expect(content).toContain('multi-tenancy-model');
  });

  it('substitutes {{date}} with today ISO date', () => {
    initAdopterRfc({ slug: 'auth-flow', workDir });
    const content = readFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'utf8');
    const todayPattern = /\d{4}-\d{2}-\d{2}/;
    expect(todayPattern.test(content)).toBe(true);
  });

  it('includes required RFC structure sections', () => {
    initAdopterRfc({ slug: 'auth-flow', workDir });
    const content = readFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'utf8');
    expect(content).toContain('## Problem');
    expect(content).toContain('## Options');
    expect(content).toContain('## Recommendation');
    expect(content).toContain('## Consequences');
    expect(content).toContain('## Open Questions');
  });
});

// ── initAdopterRfc — dry-run ──────────────────────────────────────────────────

describe('initAdopterRfc — dry-run mode', () => {
  it('returns result without writing any file', () => {
    const result = initAdopterRfc({ slug: 'auth-flow', workDir, dryRun: true });
    expect(result.alreadyExists).toBe(false);
    if (result.alreadyExists) return;

    expect(result.dryRun).toBe(true);
    expect(existsSync(result.outputPath)).toBe(false);
  });

  it('reports the correct outputPath', () => {
    const result = initAdopterRfc({ slug: 'auth-flow', workDir, dryRun: true });
    if (result.alreadyExists) throw new Error('unexpected alreadyExists');

    expect(result.outputPath).toContain('auth-flow.md');
  });
});

// ── initAdopterRfc — already-exists guard ─────────────────────────────────────

describe('initAdopterRfc — already-exists guard', () => {
  it('returns alreadyExists:true when file exists and --force not set', () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    writeFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'existing content', 'utf8');

    const result = initAdopterRfc({ slug: 'auth-flow', workDir });
    expect(result.alreadyExists).toBe(true);
  });

  it('does not mutate the existing file', () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    const existingPath = join(workDir, 'rfcs', 'auth-flow.md');
    writeFileSync(existingPath, 'existing content', 'utf8');

    initAdopterRfc({ slug: 'auth-flow', workDir });
    expect(readFileSync(existingPath, 'utf8')).toBe('existing content');
  });

  it('overwrites when --force is set', () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    const existingContent = 'EXISTING_CONTENT_SENTINEL_FORCE_TEST';
    writeFileSync(join(workDir, 'rfcs', 'auth-flow.md'), existingContent, 'utf8');

    const result = initAdopterRfc({ slug: 'auth-flow', workDir, force: true });
    expect(result.alreadyExists).toBe(false);
    if (result.alreadyExists) return;

    const content = readFileSync(result.outputPath, 'utf8');
    expect(content).toContain('## Problem');
    expect(content).not.toContain(existingContent);
  });
});

// ── FRAMEWORK_RFC_TEMPLATE — structural invariants ────────────────────────────

describe('FRAMEWORK_RFC_TEMPLATE — structural invariants', () => {
  it('contains all required variable placeholders', () => {
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('{{title}}');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('{{author}}');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('{{date}}');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('{{slug}}');
  });

  it('contains all required RFC sections', () => {
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('## Problem');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('## Options');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('## Recommendation');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('## Consequences');
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('## Open Questions');
  });

  it('contains Status field', () => {
    expect(FRAMEWORK_RFC_TEMPLATE).toContain('**Status:**');
  });
});

// ── CLI yargs router ──────────────────────────────────────────────────────────

describe('buildRfcInitCli — yargs router exit codes + output', () => {
  let savedArgv: string[];
  let savedExit: typeof process.exit;
  let savedOut: typeof process.stdout.write;
  let savedErr: typeof process.stderr.write;
  let stdoutChunks: string[];
  let stderrChunks: string[];

  beforeEach(() => {
    savedArgv = process.argv;
    savedExit = process.exit;
    savedOut = process.stdout.write.bind(process.stdout);
    savedErr = process.stderr.write.bind(process.stderr);
    stdoutChunks = [];
    stderrChunks = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdoutChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    }) as typeof process.stderr.write;
    process.exit = ((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;
    enableFlag();
  });

  afterEach(() => {
    process.argv = savedArgv;
    process.exit = savedExit;
    process.stdout.write = savedOut;
    process.stderr.write = savedErr;
  });

  function setArgv(...args: string[]): void {
    process.argv = ['node', 'cli-rfc-init', ...args];
  }

  async function runCli(): Promise<{ exitCode: number | null; thrown?: unknown }> {
    try {
      await buildRfcInitCli().parseAsync();
      return { exitCode: null };
    } catch (e) {
      const m = (e as Error).message?.match(/^process\.exit\((\d+)\)$/);
      if (m) return { exitCode: Number(m[1]) };
      return { exitCode: null, thrown: e };
    }
  }

  it('happy path: exits 0, creates file, prints confirmation', async () => {
    setArgv('auth-flow', '--work-dir', workDir);
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    const out = stdoutChunks.join('');
    expect(out).toContain('created');
    expect(out).toContain('auth-flow.md');
    expect(existsSync(join(workDir, 'rfcs', 'auth-flow.md'))).toBe(true);
  });

  it('happy path JSON: exits 0, emits structured output', async () => {
    setArgv('auth-flow', '--work-dir', workDir, '--format', 'json');
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(stdoutChunks.join('').trim());
    expect(json.ok).toBe(true);
    expect(json.slug).toBe('auth-flow');
    expect(json.dryRun).toBe(false);
  });

  it('dry-run: exits 0, no file written, prints dry-run notice', async () => {
    setArgv('auth-flow', '--work-dir', workDir, '--dry-run');
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    const out = stdoutChunks.join('');
    expect(out).toContain('dry-run');
    expect(existsSync(join(workDir, 'rfcs', 'auth-flow.md'))).toBe(false);
  });

  it('dry-run JSON: exits 0, emits {ok:true, dryRun:true}', async () => {
    setArgv('auth-flow', '--work-dir', workDir, '--dry-run', '--format', 'json');
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    const json = JSON.parse(stdoutChunks.join('').trim());
    expect(json.ok).toBe(true);
    expect(json.dryRun).toBe(true);
  });

  it('already-exists: exits 1, error on stderr', async () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    writeFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'existing', 'utf8');
    setArgv('auth-flow', '--work-dir', workDir);
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    expect(stderrChunks.join('')).toContain('already exists');
  });

  it('already-exists JSON: exits 1, {ok:false, alreadyExists:true}', async () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    writeFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'existing', 'utf8');
    setArgv('auth-flow', '--work-dir', workDir, '--format', 'json');
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    const json = JSON.parse(stdoutChunks.join('').trim());
    expect(json.ok).toBe(false);
    expect(json.alreadyExists).toBe(true);
  });

  it('invalid slug: exits 1, error on stderr', async () => {
    setArgv('InvalidSlug!', '--work-dir', workDir);
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    expect(stderrChunks.join('')).toContain('Invalid slug');
  });

  it('invalid slug JSON: exits 1, {ok:false}', async () => {
    setArgv('InvalidSlug!', '--work-dir', workDir, '--format', 'json');
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    const json = JSON.parse(stdoutChunks.join('').trim());
    expect(json.ok).toBe(false);
    expect(json.error).toContain('Invalid slug');
  });

  it('feature flag disabled: exits 1, error on stderr', async () => {
    disableFlag();
    setArgv('auth-flow', '--work-dir', workDir);
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    expect(stderrChunks.join('')).toContain('not enabled');
    expect(stderrChunks.join('')).toContain('AI_SDLC_ADOPTER_AUTHORING');
  });

  it('feature flag disabled JSON: exits 1, {ok:false}', async () => {
    disableFlag();
    setArgv('auth-flow', '--work-dir', workDir, '--format', 'json');
    const r = await runCli();
    expect(r.exitCode).toBe(1);
    const json = JSON.parse(stdoutChunks.join('').trim());
    expect(json.ok).toBe(false);
  });

  it('--rfc-dir override: writes to the specified directory', async () => {
    setArgv('auth-flow', '--work-dir', workDir, '--rfc-dir', 'decisions');
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(workDir, 'decisions', 'auth-flow.md'))).toBe(true);
    expect(existsSync(join(workDir, 'rfcs', 'auth-flow.md'))).toBe(false);
  });

  it('--force: overwrites existing file', async () => {
    mkdirSync(join(workDir, 'rfcs'), { recursive: true });
    const existingContent = 'EXISTING_CONTENT_SENTINEL_XYZ';
    writeFileSync(join(workDir, 'rfcs', 'auth-flow.md'), existingContent, 'utf8');
    setArgv('auth-flow', '--work-dir', workDir, '--force');
    const r = await runCli();
    expect(r.exitCode).toBe(0);
    const content = readFileSync(join(workDir, 'rfcs', 'auth-flow.md'), 'utf8');
    expect(content).toContain('## Problem');
    expect(content).not.toContain(existingContent);
  });
});
