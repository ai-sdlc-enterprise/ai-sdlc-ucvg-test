/**
 * gh PR list cache — RFC-0023 §6.2 / AISDLC-178.2.
 *
 * Wraps `gh pr list --state open --json ...` with a 60s TTL cache so the
 * PRs pane (Phase 4) doesn't re-shell every render. Manual refresh on
 * the `r` keystroke (RFC §7.6) calls `invalidate()` to bust the cache
 * before the next poll.
 *
 * Per RFC §12 graceful-degradation:
 *  - `gh` not installed (ENOENT) → returns `[]` + `error: 'source-unavailable'`.
 *  - `gh` exits non-zero (auth, network) → returns `[]` + `error: 'source-unavailable'`.
 *  - JSON parse failure → returns `[]` + `error: 'source-corrupt'`.
 */

import { execFileSync } from 'node:child_process';
import { useEffect, useRef, useState } from 'react';

import type { SourceErrorKind, SourceState } from './types.js';

/** Default TTL — 60s per RFC §6.2. */
export const GH_PR_CACHE_TTL_MS = 60_000;

/** Default poll cadence — same as TTL so a cache miss aligns with the timer. */
export const GH_PR_POLL_INTERVAL_MS = 60_000;

/**
 * The fields the TUI consumes from `gh pr list --json`. Kept narrow so we
 * don't carry unused payload across re-renders. Phase 4 (PRs pane) may
 * extend this list; the fetcher then needs the matching `--json` flag.
 */
export interface GhPrSummary {
  number: number;
  title: string;
  state: string;
  url: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp. */
  updatedAt: string;
  /** Login of the PR author. Optional — `gh` may omit on bot-authored PRs. */
  author?: { login: string };
  /** Branch name (e.g. `feat/foo`). */
  headRefName?: string;
  /** Mergeability state ("MERGEABLE" / "CONFLICTING" / etc.) — string left open. */
  mergeable?: string;
  /** Aggregate status ("SUCCESS" / "FAILURE" / "PENDING") — string left open. */
  statusCheckRollup?: unknown;
  /** Labels — array of `{name}` objects. */
  labels?: Array<{ name: string }>;
}

/** The JSON fields requested from `gh pr list`. */
export const GH_PR_JSON_FIELDS = [
  'number',
  'title',
  'state',
  'url',
  'createdAt',
  'updatedAt',
  'author',
  'headRefName',
  'mergeable',
  'statusCheckRollup',
  'labels',
].join(',');

export type GhRunner = (args: readonly string[]) => string;

export interface FetchGhPrsOpts {
  /** Inject a runner (tests). Defaults to `execFileSync('gh', ...)`. */
  runner?: GhRunner;
  /** Working dir for the gh invocation. Defaults `process.cwd()`. */
  cwd?: string;
}

export interface FetchGhPrsResult {
  prs: GhPrSummary[];
  error: SourceErrorKind | null;
}

function defaultGhRunner(cwd: string): GhRunner {
  return (args): string =>
    execFileSync('gh', args as string[], {
      cwd,
      encoding: 'utf-8',
      // gh occasionally emits warnings on stderr we don't care about.
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 16 * 1024 * 1024,
    });
}

/**
 * Pure fetcher — invokes `gh pr list` once + parses the JSON. Does NOT
 * consult the cache; the hook owns TTL bookkeeping.
 *
 * Tolerates the four known-unhealthy modes per RFC §12:
 *  - `gh` missing (ENOENT) → `error: 'source-unavailable'`.
 *  - `gh` exits non-zero → `error: 'source-unavailable'`.
 *  - stdout is not JSON → `error: 'source-corrupt'`.
 *  - stdout is JSON but not an array → `error: 'source-corrupt'`.
 */
export function fetchGhPrs(opts: FetchGhPrsOpts = {}): FetchGhPrsResult {
  const cwd = opts.cwd ?? process.cwd();
  const runner = opts.runner ?? defaultGhRunner(cwd);

  let raw: string;
  try {
    raw = runner(['pr', 'list', '--state', 'open', '--json', GH_PR_JSON_FIELDS, '--limit', '100']);
  } catch {
    // gh missing / non-zero exit / network down — all collapse to "source
    // unavailable". The pane surfaces this with a banner.
    return { prs: [], error: 'source-unavailable' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { prs: [], error: 'source-corrupt' };
  }

  if (!Array.isArray(parsed)) {
    return { prs: [], error: 'source-corrupt' };
  }

  // Trust the `gh --json` schema — fields the consumer doesn't care about
  // pass through unmolested. We only assert the array shape here.
  return { prs: parsed as GhPrSummary[], error: null };
}

/**
 * Tiny TTL cache scoped per hook instance. Exported so tests can drive
 * the cache+invalidate dance without a React render tree.
 */
export interface GhPrCache {
  /** Most-recent successful fetch (or last attempt if cache is cold). */
  result: FetchGhPrsResult;
  /** ms-epoch when `result` was recorded; -Infinity = never. */
  fetchedAt: number;
}

export function makeEmptyCache(): GhPrCache {
  return {
    result: { prs: [], error: null },
    fetchedAt: -Infinity,
  };
}

/**
 * Decide whether the cached entry is still fresh.
 * Pure — exported for unit tests.
 */
export function isFresh(cache: GhPrCache, ttlMs: number, now: number): boolean {
  return cache.fetchedAt + ttlMs > now;
}

export interface UseGhPrsOpts extends FetchGhPrsOpts {
  /** Polling cadence in ms. Defaults `GH_PR_POLL_INTERVAL_MS` (60s). */
  intervalMs?: number;
  /** TTL in ms. Defaults `GH_PR_CACHE_TTL_MS` (60s). */
  ttlMs?: number;
  /** Inject a fetcher (tests). Defaults `fetchGhPrs`. */
  fetcher?: (opts: FetchGhPrsOpts) => FetchGhPrsResult;
  /** Inject a clock (tests). Defaults `() => Date.now()`. */
  clock?: () => number;
}

export interface UseGhPrsState extends SourceState<GhPrSummary[]> {
  /** Bust the cache so the NEXT poll (or call to invalidate) re-fetches. */
  invalidate: () => void;
}

/**
 * React hook — fetches `gh pr list` with TTL caching.
 *
 * Mount: fetches immediately, then every `intervalMs`.
 * Unmount: clears the timer.
 * `invalidate()`: clears the cache + immediately re-fetches.
 *
 * Returns `{data, error, lastFetched, invalidate}` — `data` is the cached
 * PR array (empty + error sentinel on the unhealthy modes per RFC §12).
 */
export function useGhPrs(opts: UseGhPrsOpts = {}): UseGhPrsState {
  const intervalMs = opts.intervalMs ?? GH_PR_POLL_INTERVAL_MS;
  const ttlMs = opts.ttlMs ?? GH_PR_CACHE_TTL_MS;
  const fetcher = opts.fetcher ?? fetchGhPrs;
  const clock = opts.clock ?? ((): number => Date.now());

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const optsRef = useRef<FetchGhPrsOpts>(opts);
  optsRef.current = opts;
  const ttlRef = useRef(ttlMs);
  ttlRef.current = ttlMs;
  const cacheRef = useRef<GhPrCache>(makeEmptyCache());

  const [state, setState] = useState<SourceState<GhPrSummary[]>>({
    data: [],
    error: null,
    lastFetched: null,
  });

  const refetch = useRef((force: boolean): void => {
    const now = clockRef.current();
    if (!force && isFresh(cacheRef.current, ttlRef.current, now)) {
      // Still fresh — surface the cached state but don't re-fetch.
      const cached = cacheRef.current;
      setState({
        data: cached.result.prs,
        error: cached.result.error,
        lastFetched: new Date(cached.fetchedAt),
      });
      return;
    }
    const result = fetcherRef.current(optsRef.current);
    cacheRef.current = { result, fetchedAt: now };
    setState({
      data: result.prs,
      error: result.error,
      lastFetched: new Date(now),
    });
  });

  useEffect(() => {
    let cancelled = false;
    const run = (): void => {
      if (cancelled) return;
      refetch.current(false);
    };
    run();
    const handle = setInterval(run, intervalMs);
    return (): void => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [intervalMs]);

  const invalidate = (): void => {
    cacheRef.current = makeEmptyCache();
    refetch.current(true);
  };

  return { ...state, invalidate };
}
