/**
 * events.jsonl tail — RFC-0023 §6.2 / AISDLC-178.2.
 *
 * Tails the date-rotated events file the orchestrator writes
 * (`$ARTIFACTS_DIR/_orchestrator/events-YYYY-MM-DD.jsonl` — see
 * `pipeline-cli/src/orchestrator/events.ts`). Polls every 5s by default
 * (RFC §6.2). Date-rotation aware: when the day flips, the next poll
 * automatically reopens the new file without losing the running
 * in-memory buffer.
 *
 * In-memory cap: 200 events (RFC §7.5 — the Events pane is a
 * scrollback view, not an unbounded log). Older entries fall out
 * FIFO as new ones arrive.
 *
 * Per RFC §12 graceful-degradation:
 *  - Missing dir / file → returns `[]` + `error: 'source-unavailable'`.
 *  - Permission errors → returns `[]` + `error: 'source-permission-denied'`.
 *  - A malformed JSONL line → SKIPPED silently; the surrounding lines
 *    still flow through. The events file is append-only so a partial
 *    last-line read at the tail is normal.
 */

import { existsSync, readFileSync } from 'node:fs';
import { useEffect, useRef, useState } from 'react';

import { eventsDirPath, eventsFilePath } from '../../orchestrator/events.js';
import type { OrchestratorEvent } from '../../orchestrator/events.js';
import { classifyFsError, resolveArtifactsDir } from './types.js';
import type { SourceErrorKind, SourceState } from './types.js';

/** Default poll cadence (5s per RFC §6.2). */
export const EVENTS_POLL_INTERVAL_MS = 5_000;

/** Default cap on retained events (matches the Events pane RFC §7.5 scrollback target). */
export const EVENTS_BUFFER_CAP = 200;

export interface ReadEventsTailOpts {
  /** Override artifacts dir (defaults via `resolveArtifactsDir`). */
  artifactsDir?: string;
  /** Override the rotation date used to derive the file path. Defaults `new Date()`. */
  now?: () => Date;
  /** Cap on returned events (defaults `EVENTS_BUFFER_CAP`). */
  cap?: number;
}

export interface EventsTailReadResult {
  /** Parsed events oldest-first, capped to `cap` entries. */
  events: OrchestratorEvent[];
  /** Error sentinel; null when the read succeeded (even if 0 events). */
  error: SourceErrorKind | null;
  /** Path the read targeted (useful for tests + debug). */
  path: string;
}

/**
 * Pure read of the current day's events file. No state retention — the
 * caller (hook) handles the rolling cap + cross-poll merge. Exported so
 * tests can drive it without a React render tree.
 */
export function readEventsTail(opts: ReadEventsTailOpts = {}): EventsTailReadResult {
  const artifactsDir = resolveArtifactsDir({ artifactsDir: opts.artifactsDir });
  const now = (opts.now ?? (() => new Date()))();
  const path = eventsFilePath(artifactsDir, now);
  const cap = Math.max(0, opts.cap ?? EVENTS_BUFFER_CAP);

  if (!existsSync(eventsDirPath(artifactsDir))) {
    return { events: [], error: 'source-unavailable', path };
  }
  if (!existsSync(path)) {
    // Dir exists but today's file hasn't been written yet — not an error,
    // just no events yet. Surface as `null` so the pane shows the empty
    // state rather than an alarming banner.
    return { events: [], error: null, path };
  }

  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    return { events: [], error: classifyFsError(err), path };
  }

  const events: OrchestratorEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as OrchestratorEvent;
      if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
        events.push(parsed);
      }
      // Lines that parse but lack `type` are silently dropped — the file's
      // append-only contract means a half-written final line could parse
      // as a partial object; better to skip than to render garbage.
    } catch {
      // Malformed JSON — skip silently per RFC §12. Don't throw.
    }
  }

  // Cap to last `cap` entries (file is oldest-first, so slice the tail).
  const capped = events.length > cap ? events.slice(events.length - cap) : events;
  return { events: capped, error: null, path };
}

export interface UseEventsOpts extends ReadEventsTailOpts {
  /** Polling cadence in ms. Defaults `EVENTS_POLL_INTERVAL_MS` (5s). */
  intervalMs?: number;
  /**
   * Inject a fetcher (tests). Defaults `readEventsTail`. Lets the hook
   * be exercised without touching the filesystem.
   */
  fetcher?: (opts: ReadEventsTailOpts) => EventsTailReadResult;
  /**
   * Inject a clock for the `lastFetched` timestamp. Defaults `() => new Date()`.
   * The fetcher's own `now` controls which date-rotated file is read.
   */
  clock?: () => Date;
}

/**
 * React hook — tails the events file with `intervalMs` cadence (default 5s).
 *
 * Calls the fetcher once on mount + every interval; returns `{data, error,
 * lastFetched}` in the uniform `SourceState<T>` shape so consumer panes can
 * render a banner when `error !== null`.
 *
 * Cleanup on unmount: clears the interval. Safe to mount/unmount repeatedly.
 */
export function useEvents(opts: UseEventsOpts = {}): SourceState<OrchestratorEvent[]> {
  const intervalMs = opts.intervalMs ?? EVENTS_POLL_INTERVAL_MS;
  const fetcher = opts.fetcher ?? readEventsTail;
  const clock = opts.clock ?? ((): Date => new Date());

  // Stash mutable args in refs so changing them doesn't tear down/restart
  // the polling timer. Production callers usually pass stable opts anyway,
  // but tests benefit from the stability guarantee.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const optsRef = useRef<ReadEventsTailOpts>(opts);
  optsRef.current = opts;

  const [state, setState] = useState<SourceState<OrchestratorEvent[]>>({
    data: [],
    error: null,
    lastFetched: null,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = (): void => {
      const result = fetcherRef.current(optsRef.current);
      if (cancelled) return;
      setState({
        data: result.events,
        error: result.error,
        lastFetched: clockRef.current(),
      });
    };
    tick();
    const handle = setInterval(tick, intervalMs);
    return (): void => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [intervalMs]);

  return state;
}
