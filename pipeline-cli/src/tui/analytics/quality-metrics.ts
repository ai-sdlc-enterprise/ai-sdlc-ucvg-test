/**
 * RFC-0025 §8 self-improvement metrics — MTTR + recurrence rate
 * (AISDLC-270 / AC#5).
 *
 * Reads the `$ARTIFACTS_DIR/_quality/captures.jsonl` corpus alongside the
 * backlog (completed tasks) to compute:
 *
 *   - **MTTR** (Mean Time to Remediation): average time from first capture
 *     of a framework-bug subclass to the `Done` date of a task tagged
 *     `triage: framework-bug` for that subclass. Clock starts at first
 *     capture per OQ-8 recommendation (operationally meaningful — when the
 *     framework KNEW, not when it happened).
 *
 *   - **Recurrence rate**: fraction of fixed framework bugs (task moved to
 *     backlog/completed/) that have a new capture of the same subclass
 *     within 30 days of being closed. Configurable via `recurrenceWindowDays`
 *     (OQ-3 default: 30 days).
 *
 *   - **Coverage rate**: fraction of failures that got a class other than
 *     `ambiguous` vs total. High coverage = the classifier is confident;
 *     low = the corpus is generating ambiguous noise.
 *
 * The reader is pure I/O + computation — all date math is done against the
 * `now` override so tests can drive it without touching the wall clock.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { resolveArtifactsDir } from '../sources/types.js';
import { FRAMEWORK_QUALITY_CAPTURES_FILE, FRAMEWORK_QUALITY_DIRNAME } from './quality-reader.js';

// ── Capture record shape (structural, tolerant) ───────────────────────

interface RawCapture {
  ts?: unknown;
  class?: unknown;
  subclass?: unknown;
  severity?: unknown;
  triage?: unknown;
}

// ── MTTR and recurrence ───────────────────────────────────────────────

export interface MttrEntry {
  subclass: string;
  /** ISO-8601 timestamp of the first capture seen for this subclass. */
  firstCaptureAt: string;
  /** ISO-8601 timestamp of the remediation (Done date of the fix task), or null if unremediated. */
  remediatedAt: string | null;
  /** MTTR in milliseconds, or null when unremediated. */
  mttrMs: number | null;
}

export interface RecurrenceEntry {
  subclass: string;
  /** How many times this subclass was fixed and then recurred within the window. */
  recurrences: number;
  /** Total times this subclass was fixed. */
  fixes: number;
  /** `recurrences / fixes`. 0 when fixes === 0. */
  recurrenceRate: number;
}

export interface QualityMetrics {
  /**
   * MTTR entries, one per subclass that has been seen. Unremediated
   * subclasses are included with `remediatedAt: null, mttrMs: null`.
   */
  mttr: MttrEntry[];
  /**
   * Mean MTTR across all remediated subclasses (ms).
   * `null` when nothing has been remediated yet.
   */
  meanMttrMs: number | null;
  /**
   * Recurrence entries, one per subclass that was fixed ≥ 1 time.
   */
  recurrence: RecurrenceEntry[];
  /**
   * Fraction of captures classified as something other than `ambiguous`.
   * 0 when no captures exist.
   */
  coverageRate: number;
  /** Total captures observed. */
  totalCaptures: number;
  /** Total `framework-misbehaved` captures. */
  frameworkBugCaptures: number;
  /** Ambiguous captures (not classified confidently). */
  ambiguousCaptures: number;
}

export interface ComputeQualityMetricsOpts {
  artifactsDir?: string;
  /** Project root for backlog walk. Defaults `process.cwd()`. */
  workDir?: string;
  /** Wall-clock override for 'now'. Defaults `new Date()`. */
  now?: () => Date;
  /**
   * Recurrence window in days (OQ-3 default: 30). A fix that sees a new
   * capture of the same subclass within this window counts as a
   * recurrence.
   */
  recurrenceWindowDays?: number;
}

/**
 * Walk `backlog/completed/` and return tasks tagged with
 * `triage: framework-bug` along with their subclass (extracted from the
 * task title) and the file modification time as a proxy for the Done date.
 */
function readCompletedFrameworkBugTasks(
  workDir: string,
): Array<{ subclass: string; doneAt: string }> {
  const completedDir = join(workDir, 'backlog', 'completed');
  if (!existsSync(completedDir)) return [];

  const results: Array<{ subclass: string; doneAt: string }> = [];
  let entries: string[];
  try {
    entries = readdirSync(completedDir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const filePath = join(completedDir, entry);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    // Check for framework-bug triage label
    if (!/triage:\s*framework-bug/i.test(content)) continue;

    // Extract subclass from title: "chore: investigate framework bug — <subclass>"
    const titleMatch =
      /title:\s*['"]?chore:\s*investigate\s*framework\s*bug\s*[-—]\s*([^'"]+?)['"]?\s*$/im.exec(
        content,
      );
    if (!titleMatch || !titleMatch[1]) continue;
    const subclass = titleMatch[1].trim();

    // Use file mtime as Done date proxy
    let doneAt: string;
    try {
      const s = statSync(filePath);
      doneAt = s.mtime.toISOString();
    } catch {
      continue;
    }
    results.push({ subclass, doneAt });
  }
  return results;
}

/**
 * Compute MTTR + recurrence + coverage metrics from the captures corpus.
 */
export function computeQualityMetrics(opts: ComputeQualityMetricsOpts = {}): QualityMetrics {
  const recurrenceWindowMs = (opts.recurrenceWindowDays ?? 30) * 24 * 60 * 60 * 1000;
  const workDir = opts.workDir ?? process.cwd();
  const artifactsDir = resolveArtifactsDir({ artifactsDir: opts.artifactsDir });
  const capturesPath = join(
    artifactsDir,
    FRAMEWORK_QUALITY_DIRNAME,
    FRAMEWORK_QUALITY_CAPTURES_FILE,
  );

  // Read captures
  const capturesBySubclass = new Map<string, string[]>(); // subclass → sorted ts list
  let totalCaptures = 0;
  let frameworkBugCaptures = 0;
  let ambiguousCaptures = 0;
  let classifiedCaptures = 0;

  if (existsSync(capturesPath)) {
    let raw: string;
    try {
      raw = readFileSync(capturesPath, 'utf8');
    } catch {
      raw = '';
    }
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      const record = parsed as RawCapture;
      if (!record || typeof record !== 'object') continue;
      if (typeof record.ts !== 'string') continue;

      totalCaptures += 1;

      if (record.class === 'framework-misbehaved' && typeof record.subclass === 'string') {
        frameworkBugCaptures += 1;
        classifiedCaptures += 1;
        const list = capturesBySubclass.get(record.subclass) ?? [];
        list.push(record.ts);
        capturesBySubclass.set(record.subclass, list);
      } else if (record.class === 'ambiguous') {
        ambiguousCaptures += 1;
      } else if (record.class) {
        classifiedCaptures += 1;
      }
    }
  }

  // Sort each subclass's timestamps ascending
  for (const [subclass, tsList] of capturesBySubclass.entries()) {
    capturesBySubclass.set(subclass, tsList.sort());
  }

  // Read completed framework-bug tasks for MTTR computation
  const completedTasks = readCompletedFrameworkBugTasks(workDir);

  // Build MTTR entries
  const mttrEntries: MttrEntry[] = [];
  for (const [subclass, tsList] of capturesBySubclass.entries()) {
    const firstCaptureAt = tsList[0]!;
    // Find the earliest remediation for this subclass
    const remediations = completedTasks
      .filter((t) => t.subclass === subclass)
      .sort((a, b) => a.doneAt.localeCompare(b.doneAt));

    if (remediations.length === 0) {
      mttrEntries.push({ subclass, firstCaptureAt, remediatedAt: null, mttrMs: null });
    } else {
      const remediatedAt = remediations[0]!.doneAt;
      const firstMs = new Date(firstCaptureAt).getTime();
      const remMs = new Date(remediatedAt).getTime();
      const mttrMs =
        Number.isNaN(firstMs) || Number.isNaN(remMs) ? null : Math.max(0, remMs - firstMs);
      mttrEntries.push({ subclass, firstCaptureAt, remediatedAt, mttrMs });
    }
  }

  // Mean MTTR
  const remediatedEntries = mttrEntries.filter((e) => e.mttrMs !== null);
  const meanMttrMs =
    remediatedEntries.length === 0
      ? null
      : Math.round(remediatedEntries.reduce((s, e) => s + e.mttrMs!, 0) / remediatedEntries.length);

  // Recurrence rate: for each completed task of a subclass, check if
  // a NEW capture of the same subclass appeared within recurrenceWindowMs
  // after the fix's done date.
  const recurrenceMap = new Map<string, { fixes: number; recurrences: number }>();
  for (const task of completedTasks) {
    const { subclass, doneAt } = task;
    const entry = recurrenceMap.get(subclass) ?? { fixes: 0, recurrences: 0 };
    entry.fixes += 1;

    const doneMs = new Date(doneAt).getTime();
    const windowEnd = doneMs + recurrenceWindowMs;
    const captures = capturesBySubclass.get(subclass) ?? [];
    // Any capture after the fix and within the window counts as a recurrence
    const recurred = captures.some((ts) => {
      const tsMs = new Date(ts).getTime();
      return tsMs > doneMs && tsMs <= windowEnd;
    });
    if (recurred) entry.recurrences += 1;

    recurrenceMap.set(subclass, entry);
  }

  const recurrenceEntries: RecurrenceEntry[] = Array.from(recurrenceMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subclass, { fixes, recurrences }]) => ({
      subclass,
      fixes,
      recurrences,
      recurrenceRate: fixes === 0 ? 0 : recurrences / fixes,
    }));

  // Coverage rate: classified (non-ambiguous) / total
  const coverageRate = totalCaptures === 0 ? 0 : classifiedCaptures / totalCaptures;

  return {
    mttr: mttrEntries,
    meanMttrMs,
    recurrence: recurrenceEntries,
    coverageRate,
    totalCaptures,
    frameworkBugCaptures,
    ambiguousCaptures,
  };
}

// ── Formatters ────────────────────────────────────────────────────────

import { formatDurationCompact } from './metrics.js';

/**
 * Format MTTR for TUI display: `<subclass>: <duration>` or `—` for null.
 */
export function formatMttr(entry: MttrEntry): string {
  const duration = formatDurationCompact(entry.mttrMs);
  return `${entry.subclass}: ${duration}`;
}

/**
 * Format the coverage rate as a percentage string for TUI display.
 */
export function formatCoverageRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
