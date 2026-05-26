/**
 * RFC-0017 Phase 4 — InternalAdopter three-product suite reference impl tests.
 *
 * Covers acceptance criteria from AISDLC-355:
 *
 *   AC #1: ProductA variant declarations ship with small-utility / enterprise /
 *          county-regional
 *   AC #2: ProductB variant declarations ship with field-tech-on-truck /
 *          field-tech-handheld / supervisor-tablet
 *   AC #3: ProductC variant declarations ship with billing-clerk /
 *          customer-portal / csr-dashboard
 *   AC #4: ProductD scope removed from this task (no ProductD exports present)
 *   AC #5: Each variant has ≤ 5 designImperatives strings
 *   AC #6: Admission scoring spot-check: variant-routed score differs from
 *          soul-aggregate by ≥ 15% on a representative work item
 *   AC #7: Engineering review confirms substrate shared across all products'
 *          variants (no hidden divergence)
 *   AC #8: End-to-end deprecation lifecycle test on one ProductA variant
 *
 * @see orchestrator/src/internal-adopter-variants.ts — reference implementation
 * @see orchestrator/src/variant-lifecycle.ts — deprecation lifecycle
 * @see spec/rfcs/RFC-0017-in-soul-variant-pattern.md §11 — validation criteria
 */

import { describe, it, expect } from 'vitest';

import {
  PRODUCT_A_SOUL_ID,
  PRODUCT_A_VARIANTS,
  PRODUCT_A_SUBSTRATE_INVARIANTS,
  PRODUCT_A_SOUL_AGGREGATE_SCORES,
  PRODUCT_A_VARIANT_SCORES,
  PRODUCT_B_SOUL_ID,
  PRODUCT_B_VARIANTS,
  PRODUCT_B_SUBSTRATE_INVARIANTS,
  PRODUCT_C_SOUL_ID,
  PRODUCT_C_VARIANTS,
  PRODUCT_C_SUBSTRATE_INVARIANTS,
  buildInternalAdopterVariantContext,
} from './internal-adopter-variants.js';

import {
  computeVariantScopedScores,
  type VariantDesignOverridesFramework,
} from './variant-admission.js';

import {
  declareVariantDeprecation,
  transitionVariantLifecycle,
  runFullDeprecationLifecycle,
} from './variant-lifecycle.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * The v0.4 framework-owned designOverrides field names per RFC-0017 §6.1.
 * Used to validate that no variant declares a field outside the closed enum.
 */
const FRAMEWORK_OVERRIDE_KEYS: ReadonlyArray<keyof VariantDesignOverridesFramework> = [
  'colorPaletteOverlay',
  'densityProfile',
  'typographyScale',
  'motionProfile',
  'radiusProfile',
];

// ── AC #1: ProductA ───────────────────────────────────────────────────────────

describe('AC #1: ProductA variants (small-utility / enterprise / county-regional)', () => {
  it('declares all three required variant IDs', () => {
    const ids = PRODUCT_A_VARIANTS.map((v) => v.id);
    expect(ids).toContain('small-utility');
    expect(ids).toContain('enterprise');
    expect(ids).toContain('county-regional');
    expect(ids).toHaveLength(3);
  });

  it('each variant has required fields (id + audienceCharacteristics)', () => {
    for (const v of PRODUCT_A_VARIANTS) {
      expect(v.id).toBeTruthy();
      expect(v.audienceCharacteristics).toBeDefined();
      expect(v.audienceCharacteristics?.segments?.length).toBeGreaterThan(0);
    }
  });

  it('small-utility has comfortable density + large-print typography (low-tech fluency)', () => {
    const su = PRODUCT_A_VARIANTS.find((v) => v.id === 'small-utility')!;
    expect(su.designOverrides?.densityProfile).toBe('comfortable');
    expect(su.designOverrides?.typographyScale).toBe('large-print');
    expect(su.designOverrides?.motionProfile).toBe('reduced');
    expect(su.designOverrides?.radiusProfile).toBe('rounded');
  });

  it('enterprise has compact density (bulk-operation power-user surface)', () => {
    const ent = PRODUCT_A_VARIANTS.find((v) => v.id === 'enterprise')!;
    expect(ent.designOverrides?.densityProfile).toBe('compact');
    expect(ent.designOverrides?.typographyScale).toBe('default');
    expect(ent.designOverrides?.motionProfile).toBe('full');
  });

  it('county-regional has comfortable density (inter-agency coordination)', () => {
    const cr = PRODUCT_A_VARIANTS.find((v) => v.id === 'county-regional')!;
    expect(cr.designOverrides?.densityProfile).toBe('comfortable');
  });

  it('soul ID follows RFC-0009 kebab-case convention', () => {
    expect(PRODUCT_A_SOUL_ID).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});

// ── AC #2: ProductB ───────────────────────────────────────────────────────────

describe('AC #2: ProductB variants (field-tech-on-truck / field-tech-handheld / supervisor-tablet)', () => {
  it('declares all three required variant IDs', () => {
    const ids = PRODUCT_B_VARIANTS.map((v) => v.id);
    expect(ids).toContain('field-tech-on-truck');
    expect(ids).toContain('field-tech-handheld');
    expect(ids).toContain('supervisor-tablet');
    expect(ids).toHaveLength(3);
  });

  it('field-tech-on-truck uses comfortable density + large-print + reduced motion', () => {
    const truck = PRODUCT_B_VARIANTS.find((v) => v.id === 'field-tech-on-truck')!;
    expect(truck.designOverrides?.densityProfile).toBe('comfortable');
    expect(truck.designOverrides?.typographyScale).toBe('large-print');
    expect(truck.designOverrides?.motionProfile).toBe('reduced');
  });

  it('field-tech-handheld uses motionProfile none (extreme battery constraint)', () => {
    const handheld = PRODUCT_B_VARIANTS.find((v) => v.id === 'field-tech-handheld')!;
    // Exercises the motionProfile: 'none' path from the v0.4 closed enum.
    expect(handheld.designOverrides?.motionProfile).toBe('none');
  });

  it('supervisor-tablet uses compact density + full motion (coordination overview)', () => {
    const super_ = PRODUCT_B_VARIANTS.find((v) => v.id === 'supervisor-tablet')!;
    expect(super_.designOverrides?.densityProfile).toBe('compact');
    expect(super_.designOverrides?.motionProfile).toBe('full');
  });

  it('soul ID follows RFC-0009 kebab-case convention', () => {
    expect(PRODUCT_B_SOUL_ID).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});

// ── AC #3: ProductC ───────────────────────────────────────────────────────────

describe('AC #3: ProductC variants (billing-clerk / customer-portal / csr-dashboard)', () => {
  it('declares all three required variant IDs', () => {
    const ids = PRODUCT_C_VARIANTS.map((v) => v.id);
    expect(ids).toContain('billing-clerk');
    expect(ids).toContain('customer-portal');
    expect(ids).toContain('csr-dashboard');
    expect(ids).toHaveLength(3);
  });

  it('billing-clerk uses data-dense typography + sharp radii (clerk data surface)', () => {
    const clerk = PRODUCT_C_VARIANTS.find((v) => v.id === 'billing-clerk')!;
    // Exercises typographyScale: 'data-dense' — the compact data-heavy clerk path.
    expect(clerk.designOverrides?.typographyScale).toBe('data-dense');
    expect(clerk.designOverrides?.radiusProfile).toBe('sharp');
    expect(clerk.designOverrides?.densityProfile).toBe('compact');
  });

  it('customer-portal uses spacious density + rounded radii (consumer trust surface)', () => {
    const portal = PRODUCT_C_VARIANTS.find((v) => v.id === 'customer-portal')!;
    // Validates the spacious density path (consumer-facing with payment anxiety reduction).
    expect(portal.designOverrides?.densityProfile).toBe('spacious');
    expect(portal.designOverrides?.radiusProfile).toBe('rounded');
    expect(portal.designOverrides?.motionProfile).toBe('reduced');
  });

  it('csr-dashboard uses comfortable density + default typography', () => {
    const csr = PRODUCT_C_VARIANTS.find((v) => v.id === 'csr-dashboard')!;
    expect(csr.designOverrides?.densityProfile).toBe('comfortable');
    expect(csr.designOverrides?.typographyScale).toBe('default');
  });

  it('soul ID follows RFC-0009 kebab-case convention', () => {
    expect(PRODUCT_C_SOUL_ID).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});

// ── AC #4: ProductD scope removed ────────────────────────────────────────────

describe('AC #4: ProductD scope removed from this task', () => {
  it('no PRODUCT_D_* exports exist in internal-adopter-variants module', async () => {
    // Dynamic import to inspect the module's exports programmatically.
    const mod = await import('./internal-adopter-variants.js');
    expect('PRODUCT_D_SOUL_ID' in mod).toBe(false);
    expect('PRODUCT_D_VARIANTS' in mod).toBe(false);
    expect('PRODUCT_D_SUBSTRATE_INVARIANTS' in mod).toBe(false);
  });

  it('total product count is three (A, B, C)', () => {
    const ctx = buildInternalAdopterVariantContext();
    expect(Object.keys(ctx.variantsBySoul)).toHaveLength(3);
    expect(Object.keys(ctx.variantsBySoul)).toContain(PRODUCT_A_SOUL_ID);
    expect(Object.keys(ctx.variantsBySoul)).toContain(PRODUCT_B_SOUL_ID);
    expect(Object.keys(ctx.variantsBySoul)).toContain(PRODUCT_C_SOUL_ID);
  });
});

// ── AC #5: ≤ 5 designImperatives per variant ─────────────────────────────────

describe('AC #5: each variant has ≤ 5 designImperatives (closed-enum discipline)', () => {
  const allVariants = [...PRODUCT_A_VARIANTS, ...PRODUCT_B_VARIANTS, ...PRODUCT_C_VARIANTS];

  it('no variant exceeds 5 designImperatives', () => {
    for (const v of allVariants) {
      const imperatives = v.designImperatives ?? [];
      expect(imperatives.length).toBeLessThanOrEqual(5);
    }
  });

  it('each variant has at least 1 designImperative', () => {
    for (const v of allVariants) {
      const imperatives = v.designImperatives ?? [];
      expect(imperatives.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('no variant uses a designOverrides field outside the v0.4 closed framework enum', () => {
    for (const v of allVariants) {
      if (!v.designOverrides) continue;
      for (const key of Object.keys(v.designOverrides)) {
        // All keys must be in the framework enum OR follow vendor-prefix convention.
        const isFrameworkKey = FRAMEWORK_OVERRIDE_KEYS.includes(
          key as keyof VariantDesignOverridesFramework,
        );
        const isVendorPrefixed = key.includes('/'); // reverse-DNS prefix pattern
        expect(
          isFrameworkKey || isVendorPrefixed,
          `variant '${v.id}' uses unknown designOverrides key: '${key}'`,
        ).toBe(true);
      }
    }
  });

  it('voiceRegister is NOT declared on any variant (cut in v0.4)', () => {
    // Regression guard: voiceRegister was in the pre-v0.4 enum but Mo's
    // editorial pass cut it (6/6 leading design systems treat content register
    // outside the visual token surface).
    for (const v of allVariants) {
      expect('voiceRegister' in (v.designOverrides ?? {})).toBe(false);
    }
  });
});

// ── AC #6: Admission scoring spot-check ──────────────────────────────────────

describe('AC #6: admission scoring spot-check — variant-routed score differs from soul-aggregate', () => {
  /**
   * Spot-check scenario:
   *   Work item: "small-utility onboarding improvement" (AISDLC-SU-1)
   *   Soul-aggregate Sα₁/Sα₂ = 0.55 (cross-audience average)
   *   Variant-scoped (small-utility) Sα₁ = 0.91, Sα₂ = 0.88
   *
   * The small-utility variant is a highly resonant match for this work item.
   * The soul-aggregate collapses the per-variant signal, understating the
   * value of this variant-specific work — exactly the misallocation pattern
   * RFC-0017 §2 documents.
   */
  const WORK_ITEM_ID = 'AISDLC-SU-1';
  const soulAgg = PRODUCT_A_SOUL_AGGREGATE_SCORES;

  it('variant-routed Sα₁ for small-utility exceeds soul-aggregate by ≥ 15%', () => {
    const ctx = buildInternalAdopterVariantContext([
      {
        id: WORK_ITEM_ID,
        targetedVariants: [`${PRODUCT_A_SOUL_ID}/small-utility`],
      },
    ]);
    const result = computeVariantScopedScores(WORK_ITEM_ID, soulAgg.sa1, soulAgg.sa2, ctx);
    expect(result.routingPath).toBe('single-variant');
    const delta = Math.abs(result.sa1 - soulAgg.sa1) / soulAgg.sa1;
    expect(delta).toBeGreaterThanOrEqual(0.15); // ≥ 15% relative difference
    // Pin expected values for regression detection.
    expect(result.sa1).toBeCloseTo(PRODUCT_A_VARIANT_SCORES['small-utility'].sa1, 6);
    expect(result.sa2).toBeCloseTo(PRODUCT_A_VARIANT_SCORES['small-utility'].sa2, 6);
  });

  it('variant-routed Sα₂ for small-utility exceeds soul-aggregate by ≥ 15%', () => {
    const ctx = buildInternalAdopterVariantContext([
      {
        id: WORK_ITEM_ID,
        targetedVariants: [`${PRODUCT_A_SOUL_ID}/small-utility`],
      },
    ]);
    const result = computeVariantScopedScores(WORK_ITEM_ID, soulAgg.sa1, soulAgg.sa2, ctx);
    const delta = Math.abs(result.sa2 - soulAgg.sa2) / soulAgg.sa2;
    expect(delta).toBeGreaterThanOrEqual(0.15);
  });

  it('enterprise variant scores LOWER than soul-aggregate for small-utility work item', () => {
    // Validates that variant routing correctly surfaces MISALIGNMENT too.
    // The enterprise audience is a poor match for a small-utility-targeted feature.
    const ctx = buildInternalAdopterVariantContext([
      {
        id: WORK_ITEM_ID,
        targetedVariants: [`${PRODUCT_A_SOUL_ID}/enterprise`],
      },
    ]);
    const result = computeVariantScopedScores(WORK_ITEM_ID, soulAgg.sa1, soulAgg.sa2, ctx);
    expect(result.routingPath).toBe('single-variant');
    // enterprise sa1=0.28, soul-aggregate sa1=0.55 → enterprise is clearly worse.
    expect(result.sa1).toBeLessThan(soulAgg.sa1);
    expect(result.sa1).toBeCloseTo(PRODUCT_A_VARIANT_SCORES['enterprise'].sa1, 6);
  });

  it('soul-aggregate fallback applies when no targetedVariants declared', () => {
    // Work item with no variant targeting → soul-aggregate passthrough (RFC-0017 §7).
    const ctx = buildInternalAdopterVariantContext([]); // empty targeting
    const result = computeVariantScopedScores(WORK_ITEM_ID, soulAgg.sa1, soulAgg.sa2, ctx);
    expect(result.routingPath).toBe('no-variant-routing');
    expect(result.sa1).toBeCloseTo(soulAgg.sa1, 6);
    expect(result.sa2).toBeCloseTo(soulAgg.sa2, 6);
  });

  it('multi-variant aggregation: targeting small-utility + enterprise yields min (conservative)', () => {
    const ctx = buildInternalAdopterVariantContext([
      {
        id: WORK_ITEM_ID,
        targetedVariants: [`${PRODUCT_A_SOUL_ID}/small-utility`, `${PRODUCT_A_SOUL_ID}/enterprise`],
      },
    ]);
    const result = computeVariantScopedScores(WORK_ITEM_ID, soulAgg.sa1, soulAgg.sa2, ctx);
    expect(result.routingPath).toBe('multi-variant');
    expect(result.aggregationRule).toBe('min');
    // min(0.91, 0.28) = 0.28 — conservative cross-variant aggregation surfaces the weaker match.
    expect(result.sa1).toBeCloseTo(
      Math.min(
        PRODUCT_A_VARIANT_SCORES['small-utility'].sa1,
        PRODUCT_A_VARIANT_SCORES['enterprise'].sa1,
      ),
      6,
    );
  });

  it('ProductB field-tech variants correctly route for a field-operations work item', () => {
    const ctx = buildInternalAdopterVariantContext([
      {
        id: 'AISDLC-FT-1',
        targetedVariants: [`${PRODUCT_B_SOUL_ID}/field-tech-on-truck`],
      },
    ]);
    const result = computeVariantScopedScores('AISDLC-FT-1', 0.6, 0.6, ctx);
    expect(result.routingPath).toBe('single-variant');
    expect(result.sa1).toBeGreaterThan(0.7); // field-tech-on-truck: 0.87
  });

  it('ProductC billing-clerk routes correctly for an account-lookup work item', () => {
    const ctx = buildInternalAdopterVariantContext([
      {
        id: 'AISDLC-BC-1',
        targetedVariants: [`${PRODUCT_C_SOUL_ID}/billing-clerk`],
      },
    ]);
    const result = computeVariantScopedScores('AISDLC-BC-1', 0.55, 0.55, ctx);
    expect(result.routingPath).toBe('single-variant');
    expect(result.sa1).toBeGreaterThan(0.8); // billing-clerk: 0.88
  });
});

// ── AC #7: Engineering review — substrate shared across all variants ───────────

describe('AC #7: Engineering review — substrate shared across all products (no hidden divergence)', () => {
  /**
   * Engineering vertex criterion (RFC-0017 §11 #4):
   * Substrate is genuinely shared across all variants of each soul.
   * Validation approach:
   *   - Each product's substrate invariants are declared at SOUL level
   *   - Variants declare `complianceFloor: inherit` (type-level enforcement)
   *   - No variant overrides substrate-invariant fields (§5.3 inheritance table)
   */

  it('ProductA substrate invariants include WCAG 2.1 AA + RLS (shared compliance floor)', () => {
    expect(PRODUCT_A_SUBSTRATE_INVARIANTS).toContain('wcag-2-1-aa');
    expect(PRODUCT_A_SUBSTRATE_INVARIANTS).toContain('multi-tenant-rls');
    expect(PRODUCT_A_SUBSTRATE_INVARIANTS).toContain('event-sourced-audit-trail');
  });

  it('ProductB substrate invariants include offline-capable (field-operations requirement)', () => {
    expect(PRODUCT_B_SUBSTRATE_INVARIANTS).toContain('offline-capable-pwa');
    expect(PRODUCT_B_SUBSTRATE_INVARIANTS).toContain('wcag-2-1-aa');
    expect(PRODUCT_B_SUBSTRATE_INVARIANTS).toContain('multi-tenant-rls');
  });

  it('ProductC substrate invariants include PCI-DSS (billing compliance floor)', () => {
    expect(PRODUCT_C_SUBSTRATE_INVARIANTS).toContain('pci-dss-payment-surface');
    expect(PRODUCT_C_SUBSTRATE_INVARIANTS).toContain('wcag-2-1-aa');
    expect(PRODUCT_C_SUBSTRATE_INVARIANTS).toContain('multi-tenant-rls');
  });

  it('all three product substrates share WCAG + RLS + event-sourced-audit (framework baseline)', () => {
    const allSubstrates = [
      PRODUCT_A_SUBSTRATE_INVARIANTS,
      PRODUCT_B_SUBSTRATE_INVARIANTS,
      PRODUCT_C_SUBSTRATE_INVARIANTS,
    ];
    const sharedInvariants = ['wcag-2-1-aa', 'multi-tenant-rls', 'event-sourced-audit-trail'];
    for (const invariant of sharedInvariants) {
      for (const substrate of allSubstrates) {
        expect(substrate).toContain(invariant);
      }
    }
  });

  it('no variant in any product overrides substrate-invariant fields (§5.3 compliance)', () => {
    // The bounded-inheritance model: variants can only override designOverrides,
    // designImperatives, and targetAudience. They CANNOT override:
    //   complianceRegimes, substrateInvariants, tenantQuotaShare,
    //   engineering.performanceBudgets, engineering.observabilityRequirements.
    //
    // Structural validation: the VariantOverlay type does NOT include any
    // substrate field — the type constraint enforces the boundary.
    const allVariants = [...PRODUCT_A_VARIANTS, ...PRODUCT_B_VARIANTS, ...PRODUCT_C_VARIANTS];
    for (const v of allVariants) {
      expect('substrateInvariants' in v).toBe(false);
      expect('complianceRegimes' in v).toBe(false);
      expect('tenantQuotaShare' in v).toBe(false);
      expect('engineering' in v).toBe(false);
      // complianceFloor is the ONLY compliance field on VariantOverlay, and it
      // is defined by schema as `const: 'inherit'` — no escape hatch possible.
    }
  });

  it('variant count for each soul is below the soft-warn threshold (5 variants)', () => {
    // RFC-0017 OQ-1: soft-warn at 5 variants; hard-limit at 20.
    // Each product has exactly 3 variants — well within the soft-warn threshold.
    expect(PRODUCT_A_VARIANTS.length).toBeLessThan(5);
    expect(PRODUCT_B_VARIANTS.length).toBeLessThan(5);
    expect(PRODUCT_C_VARIANTS.length).toBeLessThan(5);
  });

  it('all variant IDs within each soul are unique (no duplicate IDs)', () => {
    const checkUnique = (variants: typeof PRODUCT_A_VARIANTS) => {
      const ids = variants.map((v) => v.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    };
    checkUnique(PRODUCT_A_VARIANTS);
    checkUnique(PRODUCT_B_VARIANTS);
    checkUnique(PRODUCT_C_VARIANTS);
  });

  it('variant IDs follow kebab-case convention (RFC-0017 §6.1 id pattern)', () => {
    const KEBAB_RE = /^[a-z][a-z0-9-]*$/;
    const allVariants = [...PRODUCT_A_VARIANTS, ...PRODUCT_B_VARIANTS, ...PRODUCT_C_VARIANTS];
    for (const v of allVariants) {
      expect(v.id).toMatch(KEBAB_RE);
    }
  });
});

// ── AC #8: End-to-end deprecation lifecycle on ProductA / county-regional ────

describe('AC #8: end-to-end deprecation lifecycle on ProductA county-regional variant', () => {
  /**
   * Scenario:
   *   - Operator decides to deprecate the 'county-regional' variant of ProductA
   *     (e.g., the county-government segment is migrating to the enterprise tier).
   *   - Deprecation window: 30 days (OQ-3 default).
   *   - Consumers: ['AISDLC-100', 'AISDLC-107'] — two open work items reference
   *     this variant.
   *
   * Validates all four lifecycle transitions per OQ-3 resolution.
   */
  const soulId = PRODUCT_A_SOUL_ID;
  const variantId = 'county-regional';
  const declaredAt = '2026-05-01';
  const windowDays = 30;
  const consumers = ['AISDLC-100', 'AISDLC-107'];

  it('declareVariantDeprecation: initializes state with 30d window + correct removalDate', () => {
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    expect(state.soulId).toBe(soulId);
    expect(state.variantId).toBe(variantId);
    expect(state.state).toBe('declared');
    expect(state.deprecationDeclaredAt).toBe(declaredAt);
    expect(state.deprecationWindowDays).toBe(30);
    expect(state.removalDate).toBe('2026-05-31'); // 30 days from 2026-05-01
  });

  it('mid-window transition: state remains declared (no operator interrupt)', () => {
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    // 2026-05-16 = 15 days before removal; well outside approaching threshold.
    const { updatedState, decision } = transitionVariantLifecycle(state, {
      asOfDate: '2026-05-16',
      approachingThresholdDays: 7,
      consumerIds: [],
    });
    expect(updatedState.state).toBe('declared');
    expect(decision.kind).toBe('variant-deprecation-declared');
    // G0 non-blocking: no autoAction at declared state.
    expect(decision.autoAction).toBeUndefined();
  });

  it('approaching transition: state = approaching, Decision emitted for operator batch-surface', () => {
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    // 2026-05-28 = 3 days before removal; within 7d approaching threshold.
    const { updatedState, decision } = transitionVariantLifecycle(state, {
      asOfDate: '2026-05-28',
      approachingThresholdDays: 7,
      consumerIds: consumers,
    });
    expect(updatedState.state).toBe('approaching');
    expect(decision.kind).toBe('variant-deprecation-approaching');
    expect(updatedState.consumerIds).toEqual(consumers);
    // No autoAction yet (approaching doesn't trigger degraded-mode).
    expect(decision.autoAction).toBeUndefined();
  });

  it('consumers-pending transition: autoAction fires + migration tasks emitted', () => {
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    // 2026-05-31 = removalDate; consumers still referencing.
    const { updatedState, decision } = transitionVariantLifecycle(state, {
      asOfDate: '2026-05-31',
      approachingThresholdDays: 7,
      consumerIds: consumers,
    });
    expect(updatedState.state).toBe('consumers-pending');
    expect(decision.kind).toBe('variant-removal-consumers-pending');
    // Auto-action: degraded-mode (variant stays accessible but marked deprecated).
    expect(decision.autoAction).toBe('degraded-mode-and-migration-tasks');
    // Migration tasks should be emitted to ALL consumers.
    expect(decision.migrationTasksFor).toEqual(consumers);
    expect(decision.migrationTasksFor).toContain('AISDLC-100');
    expect(decision.migrationTasksFor).toContain('AISDLC-107');
  });

  it('removed transition: state = removed when no consumers remain', () => {
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    // 2026-05-31 = removalDate; consumers cleared before removal.
    const { updatedState, decision } = transitionVariantLifecycle(state, {
      asOfDate: '2026-05-31',
      approachingThresholdDays: 7,
      consumerIds: [], // consumers migrated — clean removal path
    });
    expect(updatedState.state).toBe('removed');
    expect(decision.kind).toBe('variant-removed');
    expect(decision.autoAction).toBeUndefined();
    expect(decision.migrationTasksFor).toBeUndefined();
  });

  it('pipeline never halts — lifecycle transitions are all non-blocking (G0 contract)', () => {
    // RFC-0017 OQ-3 resolution: pipeline never halts on any lifecycle transition.
    // Structural validation: all Decision kinds are non-blocking (no error throw,
    // no composite gating like Eρ₅). Each transition returns a Decision without
    // throwing or side-effecting the admission pipeline.
    const state = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
    });
    const dates = ['2026-05-16', '2026-05-28', '2026-05-31', '2026-06-05'];
    for (const asOfDate of dates) {
      expect(() =>
        transitionVariantLifecycle(state, { asOfDate, consumerIds: consumers }),
      ).not.toThrow();
    }
  });

  it('per-Soul deprecationWindowDays override respected (15d window)', () => {
    // OQ-3 resolution: per-Soul override via variant-config.yaml (in-memory here).
    const state15 = declareVariantDeprecation(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: 15, // per-Soul override
    });
    expect(state15.deprecationWindowDays).toBe(15);
    expect(state15.removalDate).toBe('2026-05-16'); // 15 days from 2026-05-01
    // 2026-05-16 = removalDate; transition at removalDate with consumers → consumers-pending.
    const { updatedState } = transitionVariantLifecycle(state15, {
      asOfDate: '2026-05-16',
      consumerIds: ['AISDLC-100'],
    });
    expect(updatedState.state).toBe('consumers-pending');
  });

  it('runFullDeprecationLifecycle drives all four transitions in order', () => {
    const trail = runFullDeprecationLifecycle(soulId, variantId, {
      declaredAt,
      deprecationWindowDays: windowDays,
      consumerIds: consumers,
    });
    expect(trail).toHaveLength(4);

    const [stageA, stageB, stageC, stageD] = trail;

    // Stage A: mid-window → declared
    expect(stageA.stage).toBe('mid-window-declared');
    expect(stageA.updatedState.state).toBe('declared');
    expect(stageA.decision.kind).toBe('variant-deprecation-declared');

    // Stage B: approaching
    expect(stageB.stage).toBe('approaching');
    expect(stageB.updatedState.state).toBe('approaching');
    expect(stageB.decision.kind).toBe('variant-deprecation-approaching');

    // Stage C: consumers-pending (G0 degraded-mode auto-action)
    expect(stageC.stage).toBe('consumers-pending');
    expect(stageC.updatedState.state).toBe('consumers-pending');
    expect(stageC.decision.kind).toBe('variant-removal-consumers-pending');
    expect(stageC.decision.autoAction).toBe('degraded-mode-and-migration-tasks');
    expect(stageC.decision.migrationTasksFor).toEqual(consumers);

    // Stage D: clean removal
    expect(stageD.stage).toBe('removed');
    expect(stageD.updatedState.state).toBe('removed');
    expect(stageD.decision.kind).toBe('variant-removed');
  });
});
