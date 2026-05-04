/**
 * dep-snapshot reader — RFC-0023 §6.2 / AISDLC-178.2.
 *
 * Reads the most-recent `$ARTIFACTS_DIR/_deps/snapshot.<iso>.<tag>.jsonl`
 * the deps composition layer writes (RFC-0014). Per RFC-0023 §6.2 this
 * source is **on-demand only** — no polling. Consumers call `refresh()`
 * from a keystroke handler or a parent-effect when they need fresh data.
 *
 * Per RFC §12 graceful-degradation:
 *  - Missing dir / no snapshots → `data: null` + `error: 'source-unavailable'`.
 *  - Permission errors → `data: null` + `error: 'source-permission-denied'`.
 *  - Corrupt JSONL line → SKIPPED silently; surrounding records returned.
 *  - Whole-file unreadable → `data: null` + `error` per the fs error code.
 */

import { readFileSync } from 'node:fs';
import { useCallback, useRef, useState } from 'react';

import { inspectSnapshots, type SnapshotRecord, type SnapshotTag } from '../../deps/snapshot.js';
import { classifyFsError } from './types.js';
import type { SourceErrorKind, SourceState } from './types.js';

export interface DepSnapshot {
  /** Absolute path of the file read. */
  path: string;
  /** Tag suffix (e.g. `rolling`, `dispatch`). */
  tag: SnapshotTag;
  /** ISO-8601 timestamp embedded in the filename. */
  isoTimestamp: string;
  /** Parsed snapshot rows; corrupt lines were dropped. */
  records: SnapshotRecord[];
}

export interface ReadLatestDepSnapshotOpts {
  /** Override artifacts dir. Defaults via `resolveArtifactsDir`. */
  artifactsDir?: string;
  /** Project root for snapshot dir resolution. Defaults `process.cwd()`. */
  workDir?: string;
  /** Filter on a specific tag (e.g. `rolling`). Defaults: any tag. */
  tag?: SnapshotTag;
}

export interface ReadLatestDepSnapshotResult {
  snapshot: DepSnapshot | null;
  error: SourceErrorKind | null;
}

/**
 * Pure reader — finds the lexically latest snapshot under `_deps/`,
 * parses its JSONL body. Exported so tests can drive without React.
 */
export function readLatestDepSnapshot(
  opts: ReadLatestDepSnapshotOpts = {},
): ReadLatestDepSnapshotResult {
  // `inspectSnapshots` already resolves the artifacts dir + sorts oldest-first.
  let entries;
  try {
    entries = inspectSnapshots({
      workDir: opts.workDir,
      artifactsDir: opts.artifactsDir,
      tag: opts.tag,
    });
  } catch (err) {
    return { snapshot: null, error: classifyFsError(err) };
  }
  if (entries.length === 0) {
    return { snapshot: null, error: 'source-unavailable' };
  }
  const latest = entries[entries.length - 1];

  let raw: string;
  try {
    raw = readFileSync(latest.path, 'utf8');
  } catch (err) {
    return { snapshot: null, error: classifyFsError(err) };
  }

  const records: SnapshotRecord[] = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as SnapshotRecord;
      if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
        records.push(parsed);
      }
    } catch {
      // Corrupt line — skip per RFC §12.
    }
  }

  return {
    snapshot: {
      path: latest.path,
      tag: latest.tag,
      isoTimestamp: latest.isoTimestamp,
      records,
    },
    error: null,
  };
}

export interface UseDepSnapshotOpts extends ReadLatestDepSnapshotOpts {
  /** Inject reader (tests). Defaults `readLatestDepSnapshot`. */
  reader?: (opts: ReadLatestDepSnapshotOpts) => ReadLatestDepSnapshotResult;
  /** Inject clock for `lastFetched`. Defaults `() => new Date()`. */
  clock?: () => Date;
}

export interface UseDepSnapshotState extends SourceState<DepSnapshot | null> {
  /** Trigger a fresh read. No-op while the previous read is in flight. */
  refresh: () => void;
}

/**
 * React hook — exposes the latest dep snapshot + a `refresh()` trigger.
 *
 * **No polling.** The hook reads on first call to `refresh()` (or when
 * the consumer explicitly invokes it on mount via a `useEffect`). This
 * matches RFC §6.2's "on-demand only" cadence — the dep snapshots
 * change only on dispatcher ticks, so polling them every N seconds would
 * waste cycles relative to a keystroke-driven view.
 */
export function useDepSnapshot(opts: UseDepSnapshotOpts = {}): UseDepSnapshotState {
  const reader = opts.reader ?? readLatestDepSnapshot;
  const clock = opts.clock ?? ((): Date => new Date());

  const [state, setState] = useState<SourceState<DepSnapshot | null>>({
    data: null,
    error: null,
    lastFetched: null,
  });

  // Stash opts + clock in refs so a render with a literal opts object
  // doesn't tear down/restart the callback identity.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const readerRef = useRef(reader);
  readerRef.current = reader;

  const refresh = useCallback((): void => {
    const result = readerRef.current(optsRef.current);
    setState({
      data: result.snapshot,
      error: result.error,
      lastFetched: clockRef.current(),
    });
  }, []);

  return { ...state, refresh };
}
