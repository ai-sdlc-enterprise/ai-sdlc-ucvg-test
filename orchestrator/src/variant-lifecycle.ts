/**
 * RFC-0017 Phase 3 — Variant deprecation lifecycle (G0 catalog-routed).
 *
 * Implements the OQ-3 lifecycle states per RFC-0017 §6.3 + OQ-3 resolution:
 *
 *   1. **Deprecation declared** (`'declared'`):
 *      Variant is marked for removal. Emits `Decision: variant-deprecation-declared`
 *      (non-blocking batch log; no operator interrupt per G0 contract).
 *
 *   2. **Approaching removal** (`'approaching'`):
 *      Default 7d before removalDate (per-Soul `approachingThresholdDays` override).
 *      Emits `Decision: variant-deprecation-approaching` → operator batch-surface.
 *
 *   3. **At removal date with consumers pending** (`'consumers-pending'`):
 *      removalDate passed AND consumers still reference the variant.
 *      Emits `Decision: variant-removal-consumers-pending` → **auto-action:**
 *      keep variant in degraded mode + emit migration tasks to consumer owners.
 *      Pipeline never halts (G0 non-blocking contract per OQ-3 resolution).
 *
 *   4. **Removed** (`'removed'`):
 *      removalDate passed AND no consumers remain. Clean removal.
 *
 * **30d default deprecation window** per OQ-3 resolution (internal-config cadence);
 * per-Soul `deprecationWindowDays` override via `variant-config.yaml`.
 *
 * This module ships as part of Phase 4 (AISDLC-355) to satisfy AC #8
 * (end-to-end deprecation lifecycle test on a ProductA variant). Phase 3
 * (AISDLC-354) will supersede this with the full Decision Catalog routing
 * integration; this implementation is the pure domain logic (no I/O).
 *
 * @see spec/rfcs/RFC-0017-in-soul-variant-pattern.md §6.3 + §10 OQ-3
 * @see spec/rfcs/RFC-0035-decision-catalog-operator-routing.md — G0 non-blocking
 */

// ── Lifecycle state machine ──────────────────────────────────────────────────

/**
 * The four states in the variant deprecation lifecycle.
 *
 * - `'declared'`           — variant is deprecated but removal date is still ≥ 7d away.
 * - `'approaching'`        — removal date is within the approaching threshold.
 * - `'consumers-pending'`  — removal date passed; consumers still reference variant.
 * - `'removed'`            — removal date passed; no consumers remain. Clean removal.
 */
export type VariantDeprecationStateKind =
  | 'declared'
  | 'approaching'
  | 'consumers-pending'
  | 'removed';

/**
 * Runtime state for a deprecated variant. Constructed by `declareVariantDeprecation`
 * and evolved by `transitionVariantLifecycle`.
 */
export interface VariantDeprecationState {
  /** Soul identifier the variant belongs to (kebab-case). */
  soulId: string;
  /** Variant identifier (kebab-case, unique within the soul). */
  variantId: string;
  /** ISO date when deprecation was declared (YYYY-MM-DD). */
  deprecationDeclaredAt: string;
  /** Deprecation window in calendar days. Default: 30 (OQ-3 resolution). */
  deprecationWindowDays: number;
  /** ISO date when the variant is scheduled for removal (computed). */
  removalDate: string;
  /** Current lifecycle state. */
  state: VariantDeprecationStateKind;
  /**
   * Work item IDs (or session IDs) still referencing the deprecated variant.
   * Present when `state === 'approaching'` or `state === 'consumers-pending'`.
   */
  consumerIds?: string[];
}

// ── Decision events ──────────────────────────────────────────────────────────

/**
 * A Decision event emitted at each lifecycle transition.
 *
 * These are the RFC-0035 G0 Decision records that route to the operator
 * batch surface (Stage A / B per catalog routing). The `kind` matches the
 * `Decision:` labels in the OQ-3 resolution.
 *
 * Phase 3 (AISDLC-354) will wire these into the Decision Catalog store;
 * Phase 4 (this module) returns them as plain objects for testability.
 */
export interface VariantLifecycleDecision {
  /**
   * RFC-0035 Decision kind (matches RFC-0017 §10 OQ-3 resolution labels).
   *
   * - `'variant-deprecation-declared'`    — initial deprecation declaration
   * - `'variant-deprecation-approaching'` — within approaching threshold
   * - `'variant-removal-consumers-pending'` — at removal date; consumers remain
   * - `'variant-removed'`                 — clean removal; no consumers
   */
  kind:
    | 'variant-deprecation-declared'
    | 'variant-deprecation-approaching'
    | 'variant-removal-consumers-pending'
    | 'variant-removed';
  /** Snapshot of the lifecycle state at time of emission. */
  state: VariantDeprecationState;
  /**
   * Auto-action triggered at `consumers-pending` transition.
   * OQ-3: "keep variant in degraded mode + emit migration tasks".
   * Present ONLY when `kind === 'variant-removal-consumers-pending'`.
   */
  autoAction?: 'degraded-mode-and-migration-tasks';
  /**
   * Consumer IDs for which migration tasks should be emitted.
   * Present ONLY when `kind === 'variant-removal-consumers-pending'`.
   */
  migrationTasksFor?: string[];
}

// ── Domain helpers ────────────────────────────────────────────────────────────

/**
 * Add `days` calendar days to an ISO date string (YYYY-MM-DD) and return the
 * result as an ISO date string. Uses UTC to avoid DST hazards.
 */
function addDays(isoDate: string, days: number): string {
  const ms = new Date(isoDate + 'T00:00:00Z').getTime() + days * 86_400_000;
  return new Date(ms).toISOString().split('T')[0];
}

/**
 * Return the fractional number of calendar days between two ISO date strings.
 * Positive when `to` is after `from`.
 */
function daysBetween(from: string, to: string): number {
  const fromMs = new Date(from + 'T00:00:00Z').getTime();
  const toMs = new Date(to + 'T00:00:00Z').getTime();
  return (toMs - fromMs) / 86_400_000;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Declare a variant deprecated.
 *
 * Returns an initial `VariantDeprecationState` with `state: 'declared'`,
 * `deprecationDeclaredAt` set to today (or `opts.declaredAt` if provided),
 * and `removalDate` computed as `declaredAt + deprecationWindowDays`.
 *
 * @example
 * ```ts
 * const state = declareVariantDeprecation(PRODUCT_A_SOUL_ID, 'county-regional');
 * // state.state === 'declared'
 * // state.removalDate === 30 days from today
 * ```
 */
export function declareVariantDeprecation(
  soulId: string,
  variantId: string,
  opts?: {
    /** ISO date string (YYYY-MM-DD). Defaults to today's UTC date. */
    declaredAt?: string;
    /** Deprecation window in calendar days. Defaults to 30 (OQ-3). */
    deprecationWindowDays?: number;
  },
): VariantDeprecationState {
  const declaredAt = opts?.declaredAt ?? new Date().toISOString().split('T')[0];
  const windowDays = opts?.deprecationWindowDays ?? 30;
  const removalDate = addDays(declaredAt, windowDays);
  return {
    soulId,
    variantId,
    deprecationDeclaredAt: declaredAt,
    deprecationWindowDays: windowDays,
    removalDate,
    state: 'declared',
  };
}

/**
 * Advance a `VariantDeprecationState` to the appropriate lifecycle state
 * given the current date and consumer set.
 *
 * The transition logic mirrors RFC-0017 OQ-3:
 *
 *   - `daysUntilRemoval <= 0 AND consumers.length > 0`
 *       → `'consumers-pending'` + `autoAction: 'degraded-mode-and-migration-tasks'`
 *   - `daysUntilRemoval <= 0 AND consumers.length == 0`
 *       → `'removed'`
 *   - `daysUntilRemoval <= approachingThresholdDays`
 *       → `'approaching'`
 *   - otherwise
 *       → `'declared'` (no-op; already at initial state)
 *
 * Returns both the updated state and the Decision event to emit.
 *
 * @param deprecationState - The current lifecycle state (from `declareVariantDeprecation`
 *   or a previous `transitionVariantLifecycle` call).
 * @param opts.asOfDate             - ISO date string for "now". Defaults to today's UTC date.
 * @param opts.approachingThresholdDays - Days-before-removal threshold for `'approaching'`.
 *   Defaults to 7 (one week notice).
 * @param opts.consumerIds          - Work item / session IDs still referencing the variant.
 *   Defaults to [].
 */
export function transitionVariantLifecycle(
  deprecationState: VariantDeprecationState,
  opts?: {
    asOfDate?: string;
    approachingThresholdDays?: number;
    consumerIds?: string[];
  },
): { updatedState: VariantDeprecationState; decision: VariantLifecycleDecision } {
  const asOfDate = opts?.asOfDate ?? new Date().toISOString().split('T')[0];
  const approachingThresholdDays = opts?.approachingThresholdDays ?? 7;
  const consumerIds = opts?.consumerIds ?? [];

  const daysUntilRemoval = daysBetween(asOfDate, deprecationState.removalDate);

  if (daysUntilRemoval <= 0) {
    if (consumerIds.length > 0) {
      // At removal date with consumers still referencing — degraded-mode path.
      const updatedState: VariantDeprecationState = {
        ...deprecationState,
        state: 'consumers-pending',
        consumerIds,
      };
      return {
        updatedState,
        decision: {
          kind: 'variant-removal-consumers-pending',
          state: updatedState,
          autoAction: 'degraded-mode-and-migration-tasks',
          migrationTasksFor: consumerIds,
        },
      };
    } else {
      // Clean removal — no consumers remaining.
      const updatedState: VariantDeprecationState = {
        ...deprecationState,
        state: 'removed',
        consumerIds: [],
      };
      return {
        updatedState,
        decision: {
          kind: 'variant-removed',
          state: updatedState,
        },
      };
    }
  } else if (daysUntilRemoval <= approachingThresholdDays) {
    // Within approaching threshold — surface to operator batch.
    const updatedState: VariantDeprecationState = {
      ...deprecationState,
      state: 'approaching',
      consumerIds,
    };
    return {
      updatedState,
      decision: {
        kind: 'variant-deprecation-approaching',
        state: updatedState,
      },
    };
  } else {
    // Still within the deprecation window — declared state (no-op transition).
    const updatedState: VariantDeprecationState = {
      ...deprecationState,
      state: 'declared',
      consumerIds,
    };
    return {
      updatedState,
      decision: {
        kind: 'variant-deprecation-declared',
        state: updatedState,
      },
    };
  }
}

/**
 * Walk the full deprecation lifecycle from `declaredAt` through to removal.
 *
 * Convenience function for test/spot-check: drives the state machine through
 * all four transitions and returns the decision trail. Validates that:
 *
 *   1. declared → still declared (midway through window)
 *   2. declared → approaching (within 7d of removal)
 *   3. declared → consumers-pending (past removal, consumers remain)
 *   4. consumers-pending → removed (past removal, consumers cleared)
 *
 * @returns An ordered array of `{ stage, updatedState, decision }` entries.
 */
export function runFullDeprecationLifecycle(
  soulId: string,
  variantId: string,
  opts?: {
    declaredAt?: string;
    deprecationWindowDays?: number;
    approachingThresholdDays?: number;
    /** Consumers present at approaching + consumers-pending stages. */
    consumerIds?: string[];
  },
): Array<{
  stage: string;
  updatedState: VariantDeprecationState;
  decision: VariantLifecycleDecision;
}> {
  const windowDays = opts?.deprecationWindowDays ?? 30;
  const declaredAt = opts?.declaredAt ?? '2026-05-01';
  const approachingThresholdDays = opts?.approachingThresholdDays ?? 7;
  const consumerIds = opts?.consumerIds ?? ['AISDLC-100'];

  const initial = declareVariantDeprecation(soulId, variantId, {
    declaredAt,
    deprecationWindowDays: windowDays,
  });
  const removalDate = initial.removalDate;

  const trail: Array<{
    stage: string;
    updatedState: VariantDeprecationState;
    decision: VariantLifecycleDecision;
  }> = [];

  // Stage A: mid-window (15 days before removal) → 'declared'
  const midDate = addDays(removalDate, -(windowDays / 2));
  const stageA = transitionVariantLifecycle(initial, {
    asOfDate: midDate,
    approachingThresholdDays,
    consumerIds: [],
  });
  trail.push({ stage: 'mid-window-declared', ...stageA });

  // Stage B: within approaching threshold (3 days before removal) → 'approaching'
  const approachDate = addDays(removalDate, -3);
  const stageB = transitionVariantLifecycle(stageA.updatedState, {
    asOfDate: approachDate,
    approachingThresholdDays,
    consumerIds,
  });
  trail.push({ stage: 'approaching', ...stageB });

  // Stage C: at removal date with consumers → 'consumers-pending'
  const stageC = transitionVariantLifecycle(stageB.updatedState, {
    asOfDate: removalDate,
    approachingThresholdDays,
    consumerIds,
  });
  trail.push({ stage: 'consumers-pending', ...stageC });

  // Stage D: consumers cleared → 'removed'
  const stageD = transitionVariantLifecycle(stageC.updatedState, {
    asOfDate: removalDate,
    approachingThresholdDays,
    consumerIds: [],
  });
  trail.push({ stage: 'removed', ...stageD });

  return trail;
}
