/**
 * Tests for the orchestrator status poller (RFC-0023 Phase 2 / AISDLC-178.2).
 *
 * Covers:
 *   - Pure async fetcher: success path returns the status payload;
 *     thrown errors are caught + collapsed to source-unavailable.
 *   - React hook: mount fetch, interval polling, unmount clears the
 *     timer, error surfacing.
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';

import {
  fetchOrchestratorStatus,
  ORCHESTRATOR_STATUS_POLL_INTERVAL_MS,
  useOrchestratorStatus,
  type FetchOrchestratorStatusResult,
} from './orchestrator-status.js';
import type { OrchestratorStatus } from '../../orchestrator/index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function flushEffects(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

describe('fetchOrchestratorStatus (pure)', () => {
  it('returns the status payload via the injected frontier adapter', async () => {
    const result = await fetchOrchestratorStatus({
      adapters: { frontier: () => [{ id: 'AISDLC-1', title: 'one' }] },
    });
    expect(result.error).toBeNull();
    expect(result.status).not.toBeNull();
    expect(result.status!.queueDepth).toBe(1);
    expect(result.status!.frontier[0].id).toBe('AISDLC-1');
  });

  it('collapses a thrown frontier into source-unavailable', async () => {
    const result = await fetchOrchestratorStatus({
      adapters: {
        frontier: () => {
          throw new Error('graph corrupt');
        },
      },
    });
    expect(result.status).toBeNull();
    expect(result.error).toBe('source-unavailable');
  });
});

// ── Hook ──────────────────────────────────────────────────────────────

function HookProbe({
  capture,
  fetcher,
  intervalMs,
}: {
  capture: (state: ReturnType<typeof useOrchestratorStatus>) => void;
  fetcher: () => Promise<FetchOrchestratorStatusResult>;
  intervalMs?: number;
}): React.ReactElement {
  const state = useOrchestratorStatus({ fetcher, intervalMs });
  React.useEffect(() => {
    capture(state);
  });
  return React.createElement(Text, null, state.data ? 'ok' : 'pending');
}

describe('useOrchestratorStatus (hook)', () => {
  it('exposes the default 10s cadence per RFC-0023 §6.2', () => {
    expect(ORCHESTRATOR_STATUS_POLL_INTERVAL_MS).toBe(10_000);
  });

  it('fetches on mount + polls every intervalMs', async () => {
    vi.useFakeTimers({
      now: 0,
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    let callCount = 0;
    const stubStatus: OrchestratorStatus = {
      frontier: [],
      queueDepth: 0,
      lastTick: null,
      config: {
        workDir: '/tmp',
        tickIntervalSec: 30,
        maxConcurrent: 1,
        maxTicks: null,
        dryRun: true,
      },
      enabled: false,
    };
    const fetcher = async (): Promise<FetchOrchestratorStatusResult> => {
      callCount += 1;
      return { status: stubStatus, error: null };
    };

    const { unmount } = render(
      React.createElement(HookProbe, { capture: () => {}, fetcher, intervalMs: 100 }),
    );
    // Mount fetch is async — yield twice to let the await + setState resolve.
    await flushEffects();
    await flushEffects();
    expect(callCount).toBe(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(callCount).toBe(2);

    await vi.advanceTimersByTimeAsync(200);
    expect(callCount).toBe(4);

    unmount();
  });

  it('clears the polling timer on unmount', async () => {
    vi.useFakeTimers({
      now: 0,
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    let callCount = 0;
    const fetcher = async (): Promise<FetchOrchestratorStatusResult> => {
      callCount += 1;
      return { status: null, error: 'source-unavailable' };
    };

    const { unmount } = render(
      React.createElement(HookProbe, { capture: () => {}, fetcher, intervalMs: 100 }),
    );
    await flushEffects();
    await flushEffects();
    expect(callCount).toBe(1);
    unmount();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(callCount).toBe(1);
  });

  it('surfaces fetcher errors via state.error', async () => {
    let captured: ReturnType<typeof useOrchestratorStatus> | null = null;
    const fetcher = async (): Promise<FetchOrchestratorStatusResult> => ({
      status: null,
      error: 'source-unavailable',
    });

    const { unmount } = render(
      React.createElement(HookProbe, {
        capture: (s) => {
          captured = s;
        },
        fetcher,
      }),
    );
    await flushEffects();
    await flushEffects();
    expect(captured!.error).toBe('source-unavailable');
    expect(captured!.data).toBeNull();
    unmount();
  });
});
