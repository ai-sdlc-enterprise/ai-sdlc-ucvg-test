#!/usr/bin/env node
/**
 * Bin shim for `cli-rfc-init` (AISDLC-327).
 *
 * Scaffolds a lightweight adopter RFC at <rfc-dir>/<slug>.md from the
 * embedded `framework-rfc.md` template. Part of RFC-0036 Phase 2.
 *
 * Usage: node pipeline-cli/bin/cli-rfc-init.mjs <slug> [options]
 *
 * Examples:
 *   node pipeline-cli/bin/cli-rfc-init.mjs multi-tenancy-model
 *   node pipeline-cli/bin/cli-rfc-init.mjs auth-redesign --rfc-dir decisions/
 *   node pipeline-cli/bin/cli-rfc-init.mjs postgres-migration --dry-run
 *
 * Feature flag: AI_SDLC_ADOPTER_AUTHORING=experimental
 * Compiled entry lives in `dist/cli/rfc-init.js` after `pnpm build`.
 */
import { runRfcInitCli } from '../dist/cli/rfc-init.js';

runRfcInitCli().catch((err) => {
  process.stderr.write(`[cli-rfc-init] error: ${err?.message ?? String(err)}\n`);
  process.exit(1);
});
