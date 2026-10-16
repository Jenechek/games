import type { SeededRng } from '../rng.js';
import {
  BODY_ZONES,
  type BodyZone,
  type InjuryPenaltySummary,
  type InjurySeverity,
  type InjuryState
} from './types.js';

export function cleanInjuryState(): InjuryState {
  return {
    severity: {
      head: 0,
      torso: 0,
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0
    },
    unconsciousUntil: null,
    restUntil: null
  };
}

function cloneInjuryState(state: InjuryState): InjuryState {
  return {
    severity: { ...state.severity },
    unconsciousUntil: state.unconsciousUntil,
    restUntil: state.restUntil
  };
}

export function applyInjuryRoll(state: InjuryState, rng: SeededRng): InjuryState {
  const eligible = BODY_ZONES.filter(zone => state.severity[zone] < 3);
  if (eligible.length === 0) return cloneInjuryState(state);

  const zone = eligible[rng.int(0, eligible.length - 1)];
  const next = cloneInjuryState(state);
  next.severity[zone] = Math.min(3, next.severity[zone] + 1) as InjurySeverity;
  return next;
}

export function applyInjuryRolls(state: InjuryState, count: number, rng: SeededRng): InjuryState {
  let next = cloneInjuryState(state);
  for (let index = 0; index < Math.max(0, count); index += 1) {
    next = applyInjuryRoll(next, rng);
  }
  return next;
}

export function healInjuries(state: InjuryState, levels: number, rng: SeededRng): InjuryState {
  let next = cloneInjuryState(state);
  let remaining = Math.max(0, Math.floor(levels));

  while (remaining > 0) {
    const injured = BODY_ZONES.filter(zone => next.severity[zone] > 0);
    if (injured.length === 0) break;

    const zone = injured[rng.int(0, injured.length - 1)];
    next.severity[zone] = (next.severity[zone] - 1) as InjurySeverity;
    remaining -= 1;
  }

  return next;
}

export function clearAllInjuries(state: InjuryState): InjuryState {
  const next = cloneInjuryState(state);
  for (const zone of BODY_ZONES) next.severity[zone] = 0;
  return next;
}

export function injuryPenaltySummary(state: InjuryState): InjuryPenaltySummary {
  const { head, torso, leftArm, rightArm, leftLeg, rightLeg } = state.severity;
  return {
    accuracyPenalty: head * 0.03,
    maxHpMultiplier: Math.max(0, 1 - torso * 0.05),
    blockParryMultiplier: Math.max(0, 1 - leftArm * 0.05),
    physicalAttackMultiplier: Math.max(0, 1 - rightArm * 0.05),
    travelTimeMultiplier: 1 + (leftLeg + rightLeg) * 0.05
  };
}

export function totalInjurySeverity(state: InjuryState): number {
  return BODY_ZONES.reduce((sum, zone) => sum + state.severity[zone], 0);
}

export function injuredZoneCount(state: InjuryState): number {
  return BODY_ZONES.reduce((sum, zone) => sum + (state.severity[zone] > 0 ? 1 : 0), 0);
}
