import {
  composeTopologicalFiligreeCrest,
  composeTopologicalTendril,
  composeTopologicalWingedStar,
} from './sigil-grammar';
import { composeModularUiJoin, type ISigilLabParams } from './sigil-math';
import type { ISigilStrategy } from './sigil-strategies';

/** Parameters with optional seed forwarded from the lab workbench. */
export type TopologicalSdfParams = ISigilLabParams & { readonly seed?: number };

/**
 * v2 Seeded Topological Venation + Implicit SDF strategy.
 * Drives `star`, `crest`, and `tendril` from the seeded graph grammar + smooth-union SDF solver.
 */
export const SIGIL_TOPOLOGICAL_SDF_STRATEGY: ISigilStrategy = {
  id: 'topological-sdf',
  label: 'Topological SDF (v2)',
  star: (raw) => composeTopologicalWingedStar(raw, (raw as TopologicalSdfParams).seed ?? 1),
  crest: (raw) => composeTopologicalFiligreeCrest(raw, (raw as TopologicalSdfParams).seed ?? 1),
  tendril: (raw) => composeTopologicalTendril(raw, (raw as TopologicalSdfParams).seed ?? 1),
  join: composeModularUiJoin,
};
