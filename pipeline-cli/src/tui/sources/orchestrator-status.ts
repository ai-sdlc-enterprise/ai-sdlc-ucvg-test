/**
 * cli-orchestrator status poller — RFC-0023 §6.2 / AISDLC-178.2.
 *
 * Polls `buildOrchestratorStatus` (the same in-process function the
 * `cli-orchestrator status` subcommand wraps) every 10s. We import the
 * function directly rather than shelling out — same package, no need to
 * pay subprocess + JSON-roundtrip cost on every tick.
 *
 * Per RFC §12 graceful-degradation:
 *  - The frontier walker throws (corrupt backlog) → `data: null` + `error`.
 *  - The status function rejects → `data: null` + `error: 'source-unavailable'`.
 *
 * Phase 1 of RFC-0015 (the orchestrator) ships the underlying status
 * function with `enabled: false` when the feature flag is off; that's
 * still a valid status payload, NOT an error — the pane renders the
 * "orchestrator disabled" hint instead of a banner.
 */

import { useEffect, useRef, useState } from 'react';

import {
  buildOrchestratorStatus,
  defaultOrchestratorConfig,
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_TICK_INTERVAL_SEC,
  type OrchestratorAdapters,
  type OrchestratorConfig,
  type OrchestratorStatus,
} from '../../orchestrator/index.js';
import type { SourceErrorKind, SourceState } from './types.js';

/** Default poll cadence (10s per RFC §6.2). */
export const ORCHESTRATOR_STATUS_POLL_INTERVAL_MS = 10_000;

export interface FetchOrchestratorStatusOpts {
  /** Project root (defaults `process.cwd()`). */
  workDir?: string;
  /** Adapters (tests inject fakes). Production passes nothing. */
  adapters?: OrchestratorAdapters;
  /** Override the config. Defaults via `defaultOrchestratorConfig`. */
  config?: OrchestratorConfig;
}

export interface FetchOrchestratorStatusResult {
  status: OrchestratorStatus | null;
  error: SourceErrorKind | null;
}

/**
 * Pure async fetcher — wraps `buildOrchestratorStatus` with the RFC §12
 * error-as-value contract. Exported for tests.
 */
export async function fetchOrchestratorStatus(
  opts: FetchOrchestratorStatusOpts = {},
): Promise<FetchOrchestratorStatusResult> {
  const config =
    opts.config ??
    defaultOrchestratorConfig({
      workDir: opts.workDir ?? process.cwd(),
      tickIntervalSec: DEFAULT_TICK_INTERVAL_SEC,
      maxConcurrent: DEFAULT_MAX_CONCURRENT,
      maxTicks: null,
      dryRun: true,
    });
  try {
    const status = await buildOrchestratorStatus(config, opts.adapters ?? {});
    return { status, error: null };
  } catch {
    // Builder throws when the dependency-graph walker can't read backlog/
    // (missing dir, unreadable task file, etc.). Surface as unavailable
    // rather than crashing the TUI.
    return { status: null, error: 'source-unavailable' };
  }
}

export interface UseOrchestratorStatusOpts extends FetchOrchestratorStatusOpts {
  /** Polling cadence in ms. Defaults `ORCHESTRATOR_STATUS_POLL_INTERVAL_MS` (10s). */
  intervalMs?: number;
  /** Inject fetcher (tests). Defaults `fetchOrchestratorStatus`. */
  fetcher?: (opts: FetchOrchestratorStatusOpts) => Promise<FetchOrchestratorStatusResult>;
  /** Inject clock for `lastFetched`. Defaults `() => new Date()`. */
  clock?: () => Date;
}

/**
 * React hook — polls orchestrator status with `intervalMs` cadence.
 *
 * Mount: kicks off an immediate fetch + schedules subsequent polls.
 * Unmount: clears the timer + cancels any in-flight setState.
 *
 * Returns `{data, error, lastFetched}`:
 *  - `data` is the latest `OrchestratorStatus` (frontier, queueDepth,
 *    lastTick, config, enabled).
 *  - `error` is `null` on success, the SourceErrorKind sentinel on failure.
 *  - `lastFetched` updates on every successful refresh.
 */
export function useOrchestratorStatus(
  opts: UseOrchestratorStatusOpts = {},
): SourceState<OrchestratorStatus | null> {
  const intervalMs = opts.intervalMs ?? ORCHESTRATOR_STATUS_POLL_INTERVAL_MS;
  const fetcher = opts.fetcher ?? fetchOrchestratorStatus;
  const clock = opts.clock ?? ((): Date => new Date());

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const optsRef = useRef<FetchOrchestratorStatusOpts>(opts);
  optsRef.current = opts;

  const [state, setState] = useState<SourceState<OrchestratorStatus | null>>({
    data: null,
    error: null,
    lastFetched: null,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = async (): Promise<void> => {
      const result = await fetcherRef.current(optsRef.current);
      if (cancelled) return;
      setState({
        data: result.status,
        error: result.error,
        lastFetched: clockRef.current(),
      });
    };
    void tick();
    const handle = setInterval(() => {
      void tick();
    }, intervalMs);
    return (): void => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [intervalMs]);

  return state;
}
