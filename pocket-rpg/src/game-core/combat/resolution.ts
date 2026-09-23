import type { SeededRng } from "../rng";
import { combineDiminishingPercentages, effectiveHitChance, parryChance, shieldBlockChance } from "./mitigation";
import type { CombatAction, CombatLogEntry, CombatState, CombatantState, CombatPhase, RoundSelections } from "./types";

export function createCombatant(id: string, health = 100, baseDamage = 8): CombatantState {
  return {
    id,
    health,
    maxHealth: health,
    mana: 100,
    maxMana: 100,
    stamina: 100,
    maxStamina: 100,
    baseDamage,
    accuracy: 0.8,
    evasion: 0,
    physicalMitigation: [],
    shieldFullBlockChance: 0,
    hasShield: false,
    canParry: true,
    parryChance: 0,
    style: "balanced",
    statuses: [],
    cooldowns: {}
  };
}

function cloneCombatant(value: CombatantState): CombatantState {
  return { ...value, physicalMitigation: [...value.physicalMitigation], statuses: value.statuses.map((s) => ({ ...s })), cooldowns: { ...value.cooldowns } };
}

function disabled(actor: CombatantState, action: CombatAction): boolean {
  if (actor.statuses.some((status) => status.id === "stunned")) return true;
  if ((action.type === "magic") && actor.statuses.some((status) => status.id === "silenced")) return true;
  return false;
}

function spendResources(actor: CombatantState, action: CombatAction): boolean {
  const mana = action.manaCost ?? 0;
  const stamina = action.staminaCost ?? 0;
  if (actor.mana < mana || actor.stamina < stamina) return false;
  actor.mana -= mana;
  actor.stamina -= stamina;
  if (action.cooldown) actor.cooldowns[action.id] = action.cooldown;
  return true;
}

function applyAction(
  phase: CombatPhase,
  actor: CombatantState,
  target: CombatantState,
  action: CombatAction,
  rng: SeededRng,
  log: CombatLogEntry[]
): void {
  if (disabled(actor, action) || !spendResources(actor, action)) return;
  if (action.type === "item" || action.type === "heal") {
    actor.health = Math.min(actor.maxHealth, actor.health + (action.heal ?? 0));
    log.push({ phase, actorId: actor.id, actionId: action.id, message: `${actor.id} uses ${action.id}` });
    return;
  }
  if (action.type === "control") {
    if (action.status) target.statuses.push({ id: action.status, duration: Math.max(1, action.duration ?? 1) });
    log.push({ phase, actorId: actor.id, actionId: action.id, message: `${actor.id} applies ${action.status ?? "control"}` });
    return;
  }

  const hitChance = effectiveHitChance(action.hitChance ?? actor.accuracy, target.evasion, actor.style);
  log.push({ phase, actorId: actor.id, actionId: action.id, message: `${actor.id} attacks` });
  if (!rng.chance(hitChance)) return;

  if (target.hasShield && rng.chance(shieldBlockChance(target.shieldFullBlockChance, target.style))) return;
  const targetParry = target.canParry ? parryChance(target.parryChance, target.hasShield, target.style) : 0;
  if (targetParry > 0 && rng.chance(targetParry)) {
    const counterMitigation = combineDiminishingPercentages(actor.physicalMitigation);
    const counterDamage = Math.max(1, target.baseDamage * (1 - counterMitigation));
    actor.health = Math.max(0, actor.health - counterDamage);
    log.push({ phase: "counter", actorId: target.id, actionId: "parry-counter", message: `${target.id} counterattacks` });
    return;
  }

  const mitigation = combineDiminishingPercentages(target.physicalMitigation);
  const damage = Math.max(1, (action.damage ?? actor.baseDamage) * (1 - mitigation));
  target.health = Math.max(0, target.health - damage);
}

function processEndOfRound(state: CombatState, log: CombatLogEntry[]): void {
  for (const combatant of [state.player, state.enemy]) {
    for (const status of combatant.statuses) {
      if (status.periodicDamage && combatant.health > 0) {
        combatant.health = Math.max(0, combatant.health - status.periodicDamage);
        log.push({ phase: "periodic", actorId: combatant.id, actionId: status.id, message: `${status.id} deals damage` });
      }
    }
    if (combatant.health <= 0) return;
  }
  for (const combatant of [state.player, state.enemy]) {
    combatant.mana = Math.min(combatant.maxMana, combatant.mana + combatant.maxMana * 0.15);
    combatant.stamina = Math.min(combatant.maxStamina, combatant.stamina + combatant.maxStamina * 0.15);
    combatant.statuses = combatant.statuses
      .map((status) => ({ ...status, duration: status.duration - 1 }))
      .filter((status) => status.duration > 0);
    for (const [id, rounds] of Object.entries(combatant.cooldowns)) {
      const next = rounds - 1;
      if (next <= 0) delete combatant.cooldowns[id]; else combatant.cooldowns[id] = next;
    }
  }
  state.round += 1;
}

export function resolveRound(state: CombatState, selections: RoundSelections, rng: SeededRng): { state: CombatState; log: CombatLogEntry[] } {
  const next: CombatState = { player: cloneCombatant(state.player), enemy: cloneCombatant(state.enemy), round: state.round };
  if (selections.playerStyle) next.player.style = selections.playerStyle;
  if (selections.enemyStyle) next.enemy.style = selections.enemyStyle;
  const log: CombatLogEntry[] = [];
  const steps: Array<[CombatPhase, CombatantState, CombatantState, CombatAction | undefined]> = [
    ["player-additional", next.player, next.enemy, selections.playerAdditional],
    ["enemy-additional", next.enemy, next.player, selections.enemyAdditional],
    ["player-main", next.player, next.enemy, selections.playerMain],
    ["enemy-main", next.enemy, next.player, selections.enemyMain]
  ];
  for (const [phase, actor, target, action] of steps) {
    if (next.player.health <= 0 || next.enemy.health <= 0) return { state: next, log };
    if (!action) continue;
    applyAction(phase, actor, target, action, rng, log);
  }
  if (next.player.health > 0 && next.enemy.health > 0) processEndOfRound(next, log);
  return { state: next, log };
}
