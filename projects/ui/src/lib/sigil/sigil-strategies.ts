import {
  composeFiligreeCrest,
  composeModularUiJoin,
  composeTendrilSCurve,
  composeWingedStar,
  type ISigilGeometry,
  type ISigilJoinGeometry,
  type ISigilLabParams,
} from './sigil-math';
import { SIGIL_CHITIN_FILIGREE_STRATEGY } from './sigil-strategy-chitin-filigree';

/**
 * One geometry composer per archetype slot. A competing strategy supplies its own functions and may
 * spread the baseline to keep the slots it did not rewrite.
 */
export interface ISigilStrategy {
  /** Stable key used by the lab's selects and tests. */
  readonly id: string;
  /** Name shown in the lab's selects. */
  readonly label: string;
  /** Winged star composer. */
  readonly star: (params: ISigilLabParams) => ISigilGeometry;
  /** Filigree crest composer. */
  readonly crest: (params: ISigilLabParams) => ISigilGeometry;
  /** S-curve tendril composer. */
  readonly tendril: (params: ISigilLabParams) => ISigilGeometry;
  /** Modular UI join composer, stretched to the given rail width. */
  readonly join: (params: ISigilLabParams, railWidth: number) => ISigilJoinGeometry;
}

/** The archetype slots a strategy fills. The lab picks one strategy per slot. */
export type SigilStrategySlot = Exclude<keyof ISigilStrategy, 'id' | 'label'>;

/** The shipped composers, used as the reference every competing strategy is compared against. */
export const SIGIL_BASELINE_STRATEGY: ISigilStrategy = {
  id: 'baseline',
  label: 'Baseline',
  star: composeWingedStar,
  crest: composeFiligreeCrest,
  tendril: composeTendrilSCurve,
  join: composeModularUiJoin,
};

/** Every strategy the lab offers. Competing agents add their entries here. */
export const SIGIL_STRATEGIES: readonly ISigilStrategy[] = [
  SIGIL_BASELINE_STRATEGY,
  SIGIL_CHITIN_FILIGREE_STRATEGY,
];
