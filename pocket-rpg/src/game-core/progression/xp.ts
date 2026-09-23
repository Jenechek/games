import type { SeededRng } from "../rng";

export interface ActionXpInput {
  baseXp?: number;
  difficulty?: number;
  effectiveness?: number;
  success?: boolean;
  randomSpread?: number;
}

export function calculateActionXp(input: ActionXpInput, rng: SeededRng): number {
  const base = input.baseXp ?? 20;
  const difficulty = Math.max(0, input.difficulty ?? 1);
  const spread = Math.max(0, input.randomSpread ?? 0.05);
  const random = 1 - spread + rng.next() * spread * 2;
  if (input.success === false) return base * difficulty * 0.25 * random;
  const effectivenessRatio = Math.max(0, input.effectiveness ?? 1);
  const effectiveness = Math.min(1.4, Math.max(0.7, Math.sqrt(effectivenessRatio)));
  return base * difficulty * effectiveness * random;
}
