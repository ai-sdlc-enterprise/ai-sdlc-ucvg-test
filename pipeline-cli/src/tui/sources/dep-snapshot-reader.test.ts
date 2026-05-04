/**
 * Tests for the dep-snapshot reader source (RFC-0023 Phase 2 / AISDLC-178.2).
 *
 * Covers:
 *   - Pure reader: missing dir, no snapshots, healthy snapshot, corrupt
 *     line skipping, file unreadable.
 *   - React hook: refresh() drives a read; no automatic polling.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';

import {
  readLatestDepSnapshot,
  useDepSnapshot,
  type ReadLatestDepSnapshotResult,
} from './dep-snapshot-reader.js';

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'tui-dep-snapshot-'));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
  cleanup();
  vi.useRealTimers();
});

function flushEffects(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function writeSnapshotFile(name: string, lines: string[]): string {
  const dir = join(workdir, '_deps');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
  return path;
}

describe('readLatestDepSnapshot (pure)', () => {
  it('returns source-unavailable when no snapshots exist', () => {
    const result = readLatestDepSnapshot({ artifactsDir: workdir });
    expect(result.snapshot).toBeNull();
    expect(result.error).toBe('source-unavailable');
  });

  it('reads + parses the most-recent snapshot by ISO timestamp', () => {
    writeSnapshotFile('snapshot.2026-05-04T10-00-00.000Z.rolling.jsonl', [
      JSON.stringify({
        id: 'AISDLC-1',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);
    writeSnapshotFile('snapshot.2026-05-04T11-00-00.000Z.rolling.jsonl', [
      JSON.stringify({
        id: 'AISDLC-2',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);

    const result = readLatestDepSnapshot({ artifactsDir: workdir });
    expect(result.error).toBeNull();
    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot!.records).toHaveLength(1);
    expect(result.snapshot!.records[0].id).toBe('AISDLC-2');
    expect(result.snapshot!.tag).toBe('rolling');
  });

  it('skips corrupt JSONL lines', () => {
    writeSnapshotFile('snapshot.2026-05-04T11-00-00.000Z.rolling.jsonl', [
      JSON.stringify({
        id: 'AISDLC-1',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
      '{not json',
      JSON.stringify({
        id: 'AISDLC-3',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);

    const result = readLatestDepSnapshot({ artifactsDir: workdir });
    expect(result.error).toBeNull();
    expect(result.snapshot!.records.map((r) => r.id)).toEqual(['AISDLC-1', 'AISDLC-3']);
  });

  it('filters by tag when provided', () => {
    writeSnapshotFile('snapshot.2026-05-04T10-00-00.000Z.rolling.jsonl', [
      JSON.stringify({
        id: 'A',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);
    writeSnapshotFile('snapshot.2026-05-04T11-00-00.000Z.dispatch.jsonl', [
      JSON.stringify({
        id: 'B',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);

    const rolling = readLatestDepSnapshot({ artifactsDir: workdir, tag: 'rolling' });
    expect(rolling.snapshot!.records[0].id).toBe('A');
    expect(rolling.snapshot!.tag).toBe('rolling');

    const dispatch = readLatestDepSnapshot({ artifactsDir: workdir, tag: 'dispatch' });
    expect(dispatch.snapshot!.records[0].id).toBe('B');
    expect(dispatch.snapshot!.tag).toBe('dispatch');
  });

  it('returns source-unavailable when filtered tag has no entries', () => {
    writeSnapshotFile('snapshot.2026-05-04T10-00-00.000Z.rolling.jsonl', [
      JSON.stringify({
        id: 'A',
        dependencies: [],
        dependents: [],
        depth: 0,
        criticalPathLength: 0,
        externalDependencies: [],
        lastModified: '',
      }),
    ]);
    const result = readLatestDepSnapshot({ artifactsDir: workdir, tag: 'calibration' });
    expect(result.snapshot).toBeNull();
    expect(result.error).toBe('source-unavailable');
  });
});

// ── Hook ──────────────────────────────────────────────────────────────

function HookProbe({
  capture,
  reader,
}: {
  capture: (state: ReturnType<typeof useDepSnapshot>) => void;
  reader: () => ReadLatestDepSnapshotResult;
}): React.ReactElement {
  const state = useDepSnapshot({ reader });
  React.useEffect(() => {
    capture(state);
  });
  return React.createElement(Text, null, state.data ? 'loaded' : 'none');
}

describe('useDepSnapshot (hook)', () => {
  it('does NOT auto-fetch on mount (on-demand only)', async () => {
    let callCount = 0;
    const reader = (): ReadLatestDepSnapshotResult => {
      callCount += 1;
      return { snapshot: null, error: null };
    };
    const { unmount } = render(React.createElement(HookProbe, { capture: () => {}, reader }));
    await flushEffects();
    // Per RFC §6.2 the dep snapshot is on-demand only — refresh() is the
    // only way to drive a read.
    expect(callCount).toBe(0);
    unmount();
  });

  it('refresh() triggers exactly one read', async () => {
    let callCount = 0;
    let captured: ReturnType<typeof useDepSnapshot> | null = null;
    const reader = (): ReadLatestDepSnapshotResult => {
      callCount += 1;
      return {
        snapshot: {
          path: '/x',
          tag: 'rolling',
          isoTimestamp: '2026-05-04T11-00-00.000Z',
          records: [],
        },
        error: null,
      };
    };
    const { unmount } = render(
      React.createElement(HookProbe, {
        capture: (s) => {
          captured = s;
        },
        reader,
      }),
    );
    await flushEffects();
    expect(callCount).toBe(0);

    captured!.refresh();
    await flushEffects();
    await flushEffects();
    expect(callCount).toBe(1);
    expect(captured!.data).not.toBeNull();
    expect(captured!.lastFetched).toBeInstanceOf(Date);

    captured!.refresh();
    await flushEffects();
    await flushEffects();
    expect(callCount).toBe(2);

    unmount();
  });

  it('surfaces error sentinel from the reader', async () => {
    let captured: ReturnType<typeof useDepSnapshot> | null = null;
    const { unmount } = render(
      React.createElement(HookProbe, {
        capture: (s) => {
          captured = s;
        },
        reader: () => ({ snapshot: null, error: 'source-unavailable' as const }),
      }),
    );
    await flushEffects();
    captured!.refresh();
    await flushEffects();
    expect(captured!.error).toBe('source-unavailable');
    expect(captured!.data).toBeNull();
    unmount();
  });
});
