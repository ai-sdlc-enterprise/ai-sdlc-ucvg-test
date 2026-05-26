/**
 * RFC-0017 Phase 4 — InternalAdopter three-product suite reference implementation.
 *
 * This module is the canonical practitioner-validation source for RFC-0017 §11.
 * It instantiates the three-product suite (ProductA, ProductB, ProductC) as
 * in-memory `VariantOverlay` declarations, confirms the v0.4 visual-token
 * surface holds (no variant requires a field outside the §6.1 closed enum),
 * and provides pre-computed variant scores for admission scoring spot-checks.
 *
 * **ProductD is deferred to RFC-0018 §11** per v0.4 Design-Authority editorial
 * pass: the proposed variants (annual-test, repair-event, regulatory-audit-mode)
 * are temporal-context-bound operational modes — same user, different operational
 * moment = Journey shape (RFC-0018), not Variant shape (RFC-0017).
 *
 * @see spec/rfcs/RFC-0017-in-soul-variant-pattern.md §11
 * @see orchestrator/src/variant-admission.ts — `VariantOverlay` type contract
 */

import type { VariantOverlay, VariantContext, VariantScores } from './variant-admission.js';

// ── ProductA: spry-engage ──────────────────────────────────────────────────
//
// Customer-facing portal for municipal utility operators.
// Audience segment: utility authorities (small, enterprise, county-regional).
// Validates: audience-segment specialization across the v0.4 visual-token surface.

/**
 * Soul identifier for ProductA.
 * Format follows RFC-0009 soul-id convention (kebab-case, no platform prefix).
 */
export const PRODUCT_A_SOUL_ID = 'product-a-spry-engage' as const;

/**
 * Substrate invariants shared by ALL ProductA variants.
 * Confirms AC #7 (Engineering review): substrate is genuinely shared;
 * no hidden divergence per variant. Variants inherit these via
 * `complianceFloor: 'inherit'` per RFC-0017 §5.3.
 *
 * These invariants are declared on the soul, not overridable by variants.
 */
export const PRODUCT_A_SUBSTRATE_INVARIANTS: readonly string[] = [
  'multi-tenant-rls',
  'wcag-2-1-aa',
  'accessible-color-contrast-ratio-4-5',
  'event-sourced-audit-trail',
] as const;

/**
 * ProductA variant declarations (AC #1: small-utility / enterprise / county-regional).
 *
 * v0.4 validation:
 * - All `designOverrides` fields are within the §6.1 closed framework enum
 *   (colorPaletteOverlay, densityProfile, typographyScale, motionProfile,
 *   radiusProfile). No variant requires `voiceRegister` (cut in v0.4) or any
 *   non-framework field.
 * - Each variant has ≤ 5 `designImperatives` (AC #5 validation criterion #1).
 */
export const PRODUCT_A_VARIANTS: VariantOverlay[] = [
  {
    id: 'small-utility',
    audienceCharacteristics: {
      segments: ['municipal-small', 'water-district-small'],
      sizeRange: { minStaff: 1, maxStaff: 50 },
    },
    designOverrides: {
      colorPaletteOverlay: 'small-utility-warm',
      densityProfile: 'comfortable',
      typographyScale: 'large-print',
      motionProfile: 'reduced',
      radiusProfile: 'rounded',
    },
    // AC #5: 3 imperatives (well under ≤ 5 ceiling)
    designImperatives: [
      'low-tech-fluency-tolerance',
      'single-task-focus-per-screen',
      'progressive-disclosure',
    ],
  },
  {
    id: 'enterprise',
    audienceCharacteristics: {
      segments: ['municipal-large', 'regional-utility'],
      sizeRange: { minStaff: 51, maxStaff: 5000 },
    },
    designOverrides: {
      colorPaletteOverlay: 'enterprise-cool',
      densityProfile: 'compact',
      typographyScale: 'default',
      motionProfile: 'full',
      radiusProfile: 'default',
    },
    // AC #5: 3 imperatives (well under ≤ 5 ceiling)
    designImperatives: [
      'bulk-operation-efficiency',
      'multi-tab-workflow-tolerance',
      'keyboard-shortcut-discoverability',
    ],
  },
  {
    id: 'county-regional',
    audienceCharacteristics: {
      segments: ['county-government', 'regional-coordinator'],
      sizeRange: { minStaff: 20, maxStaff: 200 },
    },
    designOverrides: {
      colorPaletteOverlay: 'county-neutral',
      densityProfile: 'comfortable',
      typographyScale: 'default',
      motionProfile: 'reduced',
      radiusProfile: 'default',
    },
    // AC #5: 3 imperatives (well under ≤ 5 ceiling)
    designImperatives: [
      'inter-agency-data-clarity',
      'cross-jurisdiction-workflow-support',
      'formal-document-print-readiness',
    ],
  },
];

// ── ProductB: spry-field ───────────────────────────────────────────────────
//
// Mobile-first field operations suite (crews, trucks, handheld devices).
// Validates: density profile + form-factor specialization.

/**
 * Soul identifier for ProductB.
 */
export const PRODUCT_B_SOUL_ID = 'product-b-spry-field' as const;

/**
 * Substrate invariants shared by ALL ProductB variants.
 * Engineering review (AC #7): offline-capable + multi-tenant RLS are
 * shared substrate; no variant diverges from these.
 */
export const PRODUCT_B_SUBSTRATE_INVARIANTS: readonly string[] = [
  'multi-tenant-rls',
  'wcag-2-1-aa',
  'offline-capable-pwa',
  'event-sourced-audit-trail',
] as const;

/**
 * ProductB variant declarations (AC #2: field-tech-on-truck / field-tech-handheld / supervisor-tablet).
 *
 * Validates:
 * - Density profile specialization (compact for supervisor; comfortable for field)
 * - Form-factor constraints surface as `designImperatives` (gloved-hand, sunlight)
 * - `motionProfile: 'none'` for handheld (extreme battery / accessibility)
 */
export const PRODUCT_B_VARIANTS: VariantOverlay[] = [
  {
    id: 'field-tech-on-truck',
    audienceCharacteristics: {
      segments: ['field-technician-vehicle-mounted'],
    },
    designOverrides: {
      colorPaletteOverlay: 'high-vis-utility',
      densityProfile: 'comfortable',
      typographyScale: 'large-print',
      motionProfile: 'reduced',
      radiusProfile: 'rounded',
    },
    // AC #5: 4 imperatives (under ≤ 5 ceiling)
    designImperatives: [
      'gloved-hand-touch-target',
      'sunlight-readability',
      'one-handed-operation',
      'minimal-data-entry',
    ],
  },
  {
    id: 'field-tech-handheld',
    audienceCharacteristics: {
      segments: ['field-technician-handheld'],
    },
    designOverrides: {
      colorPaletteOverlay: 'high-vis-utility',
      densityProfile: 'comfortable',
      typographyScale: 'large-print',
      motionProfile: 'none',
      radiusProfile: 'rounded',
    },
    // AC #5: 3 imperatives (under ≤ 5 ceiling)
    // motionProfile: 'none' validates the extreme battery-conservation path from OQ-5
    designImperatives: [
      'gloved-hand-touch-target',
      'sunlight-readability',
      'battery-conservation-ux',
    ],
  },
  {
    id: 'supervisor-tablet',
    audienceCharacteristics: {
      segments: ['field-supervisor-tablet'],
    },
    designOverrides: {
      colorPaletteOverlay: 'supervisor-neutral',
      densityProfile: 'compact',
      typographyScale: 'default',
      motionProfile: 'full',
      radiusProfile: 'default',
    },
    // AC #5: 3 imperatives (under ≤ 5 ceiling)
    designImperatives: [
      'multi-crew-coordination-overview',
      'route-density-clarity',
      'dispatch-action-prominence',
    ],
  },
];

// ── ProductC: spry-billing ─────────────────────────────────────────────────
//
// Billing + customer-portal suite (internal billing staff, customers, CSRs).
// Validates: role-based audience + workflow-density specialization.
// Note: billing-clerk uses 'data-dense' typographyScale — exercises the
//   data-dense enum path that enterprise surfaces require.

/**
 * Soul identifier for ProductC.
 */
export const PRODUCT_C_SOUL_ID = 'product-c-spry-billing' as const;

/**
 * Substrate invariants shared by ALL ProductC variants.
 * Engineering review (AC #7): PCI-DSS compliance floor + multi-tenant RLS
 * are soul-level; no variant escapes these per §5.3 `complianceFloor: inherit`.
 */
export const PRODUCT_C_SUBSTRATE_INVARIANTS: readonly string[] = [
  'multi-tenant-rls',
  'wcag-2-1-aa',
  'pci-dss-payment-surface',
  'event-sourced-audit-trail',
] as const;

/**
 * ProductC variant declarations (AC #3: billing-clerk / customer-portal / csr-dashboard).
 *
 * Validates:
 * - billing-clerk: `typographyScale: 'data-dense'` + `radiusProfile: 'sharp'`
 *   (the clerk surface is a compact, data-heavy operator UI — validates both
 *   the data-dense scale path and the sharp-corner utility aesthetic)
 * - customer-portal: `densityProfile: 'spacious'` + trust-signal imperatives
 *   (consumer surface — validates the spacious density path)
 * - csr-dashboard: `densityProfile: 'comfortable'` + role-based imperatives
 */
export const PRODUCT_C_VARIANTS: VariantOverlay[] = [
  {
    id: 'billing-clerk',
    audienceCharacteristics: {
      segments: ['internal-billing-staff'],
    },
    designOverrides: {
      densityProfile: 'compact',
      typographyScale: 'data-dense',
      motionProfile: 'full',
      radiusProfile: 'sharp',
    },
    // AC #5: 3 imperatives (under ≤ 5 ceiling)
    designImperatives: [
      'account-lookup-speed',
      'bulk-billing-operation-efficiency',
      'transaction-audit-visibility',
    ],
  },
  {
    id: 'customer-portal',
    audienceCharacteristics: {
      segments: ['end-customer-residential', 'end-customer-commercial'],
    },
    designOverrides: {
      colorPaletteOverlay: 'customer-trust-green',
      densityProfile: 'spacious',
      typographyScale: 'default',
      motionProfile: 'reduced',
      radiusProfile: 'rounded',
    },
    // AC #5: 3 imperatives (under ≤ 5 ceiling)
    designImperatives: [
      'trust-signal-prominence',
      'bill-clarity-over-density',
      'payment-anxiety-reduction',
    ],
  },
  {
    id: 'csr-dashboard',
    audienceCharacteristics: {
      segments: ['customer-service-representative'],
    },
    designOverrides: {
      densityProfile: 'comfortable',
      typographyScale: 'default',
      motionProfile: 'full',
      radiusProfile: 'default',
    },
    // AC #5: 3 imperatives (under ≤ 5 ceiling)
    designImperatives: [
      'customer-context-at-a-glance',
      'call-script-integration-clarity',
      'dispute-workflow-efficiency',
    ],
  },
];

// ── Pre-computed variant scores for admission scoring spot-check ────────────
//
// These scores represent the Sα₁ (audience resonance) + Sα₂ (vibe coherence)
// values for a representative work item: "small-utility onboarding improvement"
// (soul-aggregate Sα₁ + Sα₂ ≈ 0.55 — the average audience-resonance across
// all three ProductA audience segments).
//
// AC #6 spot-check: variant-routed score (small-utility = 0.91 / 0.88) vs
// soul-aggregate score (0.55 / 0.55) — well above ≥15% delta threshold.

/** Representative soul-aggregate scores for the ProductA soul. */
export const PRODUCT_A_SOUL_AGGREGATE_SCORES = {
  sa1: 0.55,
  sa2: 0.55,
} as const;

/** Pre-computed per-variant scores for a "small-utility onboarding improvement" work item. */
export const PRODUCT_A_VARIANT_SCORES: Record<string, VariantScores> = {
  // High alignment: the work item targets exactly this audience segment.
  'small-utility': { sa1: 0.91, sa2: 0.88 },
  // Low alignment: enterprise audience is mismatched with a small-utility-focused feature.
  enterprise: { sa1: 0.28, sa2: 0.35 },
  // Medium alignment: county-regional shares some overlap with small-utility.
  'county-regional': { sa1: 0.62, sa2: 0.58 },
};

/** Pre-computed per-variant scores for ProductB. */
export const PRODUCT_B_VARIANT_SCORES: Record<string, VariantScores> = {
  'field-tech-on-truck': { sa1: 0.87, sa2: 0.82 },
  'field-tech-handheld': { sa1: 0.84, sa2: 0.8 },
  'supervisor-tablet': { sa1: 0.45, sa2: 0.5 },
};

/** Pre-computed per-variant scores for ProductC. */
export const PRODUCT_C_VARIANT_SCORES: Record<string, VariantScores> = {
  'billing-clerk': { sa1: 0.88, sa2: 0.85 },
  'customer-portal': { sa1: 0.3, sa2: 0.38 },
  'csr-dashboard': { sa1: 0.72, sa2: 0.68 },
};

// ── Assembled VariantContext (utility for test + admission pipeline wiring) ─

/**
 * Full `VariantContext` for the InternalAdopter three-product suite.
 *
 * Pass this as `variantContext` to `computeAdmissionComposite` to exercise
 * variant-routed scoring across all three products. Callers wire the
 * `workItemTargeting` array with the specific work items they are scoring.
 *
 * @see orchestrator/src/internal-adopter-variants.test.ts — admission scoring
 *      spot-check (AC #6) and substrate-sharing test (AC #7)
 */
export function buildInternalAdopterVariantContext(
  workItemTargeting?: VariantContext['workItemTargeting'],
  configBySoul?: VariantContext['configBySoul'],
): VariantContext {
  return {
    variantsBySoul: {
      [PRODUCT_A_SOUL_ID]: PRODUCT_A_VARIANTS,
      [PRODUCT_B_SOUL_ID]: PRODUCT_B_VARIANTS,
      [PRODUCT_C_SOUL_ID]: PRODUCT_C_VARIANTS,
    },
    variantScores: {
      [PRODUCT_A_SOUL_ID]: PRODUCT_A_VARIANT_SCORES,
      [PRODUCT_B_SOUL_ID]: PRODUCT_B_VARIANT_SCORES,
      [PRODUCT_C_SOUL_ID]: PRODUCT_C_VARIANT_SCORES,
    },
    workItemTargeting,
    configBySoul,
  };
}
