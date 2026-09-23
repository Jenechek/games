import type { CombatStyle } from "./types";

export function combineDiminishingPercentages(values: number[]): number {
  return 1 - values
    .map((value) => Math.max(0, Math.min(0.999999, value)))
    .reduce((remaining, value) => remaining * (1 - value), 1);
}

export function shieldBlockChance(shieldStat: number, style: CombatStyle): number {
  const capped = Math.min(0.6, Math.max(0, shieldStat));
  return Math.min(1, capped + (style === "defensive" ? 0.2 : 0));
}

export function parryChance(base: number, hasShield: boolean, style: CombatStyle): number {
  if (hasShield) return 0;
  const capped = Math.min(0.35, Math.max(0, base));
  return Math.min(1, capped + (style === "parrying" ? 0.2 : 0));
}

export function effectiveEvasion(rawEvasion: number, attackerAccuracy: number): number {
  const opposed = Math.max(0, rawEvasion) / (1 + Math.max(0, attackerAccuracy) * 2);
  return Math.min(0.9, opposed);
}

export function effectiveHitChance(rawAccuracy: number, targetEvasion: number, style: CombatStyle): number {
  const styleAccuracy = Math.min(1, Math.max(0, rawAccuracy) + (style === "aggressive" ? 0.2 : 0));
  const evasion = effectiveEvasion(targetEvasion, styleAccuracy);
  return Math.min(1, Math.max(0, styleAccuracy * (1 - evasion)));
}

export function applyProportionalPenetration(defense: number, penetration: number): number {
  return Math.max(0, defense) * (1 - Math.max(0, Math.min(1, penetration)));
}
