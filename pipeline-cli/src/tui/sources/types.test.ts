/**
 * Tests for the shared TUI source helpers (RFC-0023 Phase 2 / AISDLC-178.2).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { classifyFsError, resolveArtifactsDir } from './types.js';

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
});

describe('resolveArtifactsDir', () => {
  it('honours explicit `artifactsDir` first', () => {
    process.env.ARTIFACTS_DIR = '/env/path';
    expect(resolveArtifactsDir({ artifactsDir: '/explicit', workDir: '/wd' })).toBe('/explicit');
  });

  it('falls back to $ARTIFACTS_DIR', () => {
    process.env.ARTIFACTS_DIR = '/env/path';
    expect(resolveArtifactsDir({ workDir: '/wd' })).toBe('/env/path');
  });

  it('falls back to <workDir>/artifacts when no env var', () => {
    delete process.env.ARTIFACTS_DIR;
    expect(resolveArtifactsDir({ workDir: '/wd' })).toBe('/wd/artifacts');
  });

  it('falls back to cwd when no workDir or env var', () => {
    delete process.env.ARTIFACTS_DIR;
    const result = resolveArtifactsDir();
    expect(result.endsWith('/artifacts')).toBe(true);
  });
});

describe('classifyFsError', () => {
  it('maps ENOENT → source-unavailable', () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    expect(classifyFsError(err)).toBe('source-unavailable');
  });

  it('maps EACCES → source-permission-denied', () => {
    const err = Object.assign(new Error('access'), { code: 'EACCES' });
    expect(classifyFsError(err)).toBe('source-permission-denied');
  });

  it('maps EPERM → source-permission-denied', () => {
    const err = Object.assign(new Error('perm'), { code: 'EPERM' });
    expect(classifyFsError(err)).toBe('source-permission-denied');
  });

  it('maps unknown code → source-unavailable', () => {
    const err = Object.assign(new Error('something'), { code: 'EWHAT' });
    expect(classifyFsError(err)).toBe('source-unavailable');
  });

  it('maps non-Error inputs → source-unavailable', () => {
    expect(classifyFsError(null)).toBe('source-unavailable');
    expect(classifyFsError('string error')).toBe('source-unavailable');
    expect(classifyFsError(undefined)).toBe('source-unavailable');
  });
});
