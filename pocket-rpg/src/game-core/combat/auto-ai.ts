import type { SeededRng } from "../rng";
import type { CombatAction, CombatState, CombatStyle } from "./types";

export interface AutoChoice {
  action: CombatAction;
  style: CombatStyle;
}

export function chooseAutoAction(state: CombatState, actorId: "player" | "enemy", rng: SeededRng): AutoChoice {
  const actor = state[actorId];
  const opponent = actorId === "player" ? state.enemy : state.player;
  let style: CombatStyle = actor.style;
  if (actor.health / actor.maxHealth < 0.35) style = actor.hasShield ? "defensive" : "evasive";
  else if (opponent.health / opponent.maxHealth < 0.3) style = "aggressive";
  else if (actor.canParry && !actor.hasShield && rng.chance(0.2)) style = "parrying";
  return { style, action: { id: "basic-attack", type: "attack", damage: actor.baseDamage, hitChance: actor.accuracy, tags: ["attack", "physical"] } };
}
