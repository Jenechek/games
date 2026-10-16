import type { SeededRng } from '../rng.js';
import { applyInjuryRolls, injuredZoneCount, totalInjurySeverity } from './injuries.js';
import type { InjuryState } from './types.js';

export type DefeatKind = 'ordinary' | 'boss' | 'miniboss';

function clone(state: InjuryState): InjuryState {
  return {
    severity: { ...state.severity },
    unconsciousUntil: state.unconsciousUntil,
    restUntil: state.restUntil
  };
}

export function applyDefeatConsequences(
  state: InjuryState,
  kind: DefeatKind,
  now: number,
  rng: SeededRng
): InjuryState {
  const rolls = kind === 'ordinary' ? 1 : 3;
  const injured = applyInjuryRolls(state, rolls, rng);
  const unconsciousUntil = now + 15_000;
  const restUntil = injuredZoneCount(injured) > 5
    ? unconsciousUntil + totalInjurySeverity(injured) * 30_000
    : null;

  return {
    ...injured,
    unconsciousUntil,
    restUntil
  };
}

export function reconstructRecovery(state: InjuryState, now: number): InjuryState {
  const next = clone(state);
  if (next.unconsciousUntil !== null && now >= next.unconsciousUntil) {
    next.unconsciousUntil = null;
  }
  if (next.restUntil !== null && now >= next.restUntil) {
    next.restUntil = null;
  }
  return next;
}

export function isUnconscious(state: InjuryState, now: number): boolean {
  return state.unconsciousUntil !== null && now < state.unconsciousUntil;
}

export function isForcedRest(state: InjuryState, now: number): boolean {
  if (isUnconscious(state, now)) return false;
  return state.restUntil !== null && now < state.restUntil;
}

export function isRecoveryLocked(state: InjuryState, now: number): boolean {
  return isUnconscious(state, now) || isForcedRest(state, now);
}
