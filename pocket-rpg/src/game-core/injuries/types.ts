export type InjurySeverity = 0 | 1 | 2 | 3;
export type BodyZone = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export const BODY_ZONES: BodyZone[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg'
];

export interface InjuryState {
  severity: Record<BodyZone, InjurySeverity>;
  unconsciousUntil: number | null;
  restUntil: number | null;
}

export interface InjuryPenaltySummary {
  accuracyPenalty: number;
  maxHpMultiplier: number;
  blockParryMultiplier: number;
  physicalAttackMultiplier: number;
  travelTimeMultiplier: number;
}
