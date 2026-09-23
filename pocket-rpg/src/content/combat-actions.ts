import type { CombatAction } from "../game-core/combat/types";

export const combatActions: Record<string, CombatAction> = {
  "basic-attack": { id: "basic-attack", type: "attack", tags: ["attack", "physical"] },
  "staff-bolt": { id: "staff-bolt", type: "magic", damage: 8, manaCost: 0, tags: ["attack", "magic"] },
  "heavy-strike": { id: "heavy-strike", type: "attack", damage: 18, staminaCost: 25, cooldown: 2, telegraphed: true, tags: ["attack", "physical", "telegraphed"] }
};
