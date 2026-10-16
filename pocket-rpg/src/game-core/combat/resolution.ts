import type { SeededRng } from '../rng.js';
import { cappedChance, effectiveEvasion } from './mitigation.js';
import type { CombatAction, CombatLogEntry, CombatState, CombatantState, RoundSelections } from './types.js';
function cloneState(state:CombatState):CombatState { return {player:{...state.player},enemy:{...state.enemy},round:state.round}; }
function defeated(c:CombatantState):boolean { return c.hp<=0; }
function resolveAttack(attacker:CombatantState,target:CombatantState,rng:SeededRng):void {
  const evasion=effectiveEvasion(target.evasion,attacker.accuracy);
  if(!rng.chance(Math.max(0,Math.min(1,attacker.accuracy*(1-evasion))))) return;
  const block=cappedChance(target.shieldBlock,.6,target.style==='defensive');
  if(target.hasShield && rng.chance(block)) return;
  const parry=target.hasShield?0:cappedChance(target.parry,.35,target.style==='defensive');
  if(parry>0 && rng.chance(parry)) { attacker.hp=Math.max(0,attacker.hp-target.damage); return; }
  let damage=attacker.damage; if(rng.chance(.1)) damage*=1.5;
  target.hp=Math.max(0,target.hp-Math.max(1,Math.round(damage)));
}
function applyAction(actor:CombatantState,target:CombatantState,action:CombatAction|undefined,rng:SeededRng):void {
  if(!action) return;
  if(action.type==='heal') actor.hp=Math.min(actor.maxHp,actor.hp+action.amount);
  else if(action.type==='stun') target.stunned=true;
  else if(action.type==='attack') resolveAttack(actor,target,rng);
}
export function resolveRound(input:CombatState,selections:RoundSelections,rng:SeededRng):{state:CombatState;log:CombatLogEntry[]} {
  const state=cloneState(input); const log:CombatLogEntry[]=[];
  if(selections.player.style) state.player.style=selections.player.style;
  if(selections.enemy.style) state.enemy.style=selections.enemy.style;
  const steps:[CombatLogEntry['phase'],CombatantState,CombatantState,CombatAction|undefined][]=[
    ['player-additional',state.player,state.enemy,selections.player.additional],['enemy-additional',state.enemy,state.player,selections.enemy.additional],
    ['player-main',state.player,state.enemy,selections.player.main],['enemy-main',state.enemy,state.player,selections.enemy.main]
  ];
  for(const [phase,actor,target,action] of steps) {
    if(defeated(state.player)||defeated(state.enemy)) break;
    if(!action) continue;
    if(phase.endsWith('main') && actor.stunned) continue;
    applyAction(actor,target,action,rng); log.push({phase,action:action.type});
  }
  if(defeated(state.player)||defeated(state.enemy)) return {state,log};
  state.player.mana=Math.min(state.player.maxMana,state.player.mana+state.player.maxMana*.15);
  state.enemy.mana=Math.min(state.enemy.maxMana,state.enemy.mana+state.enemy.maxMana*.15);
  state.player.stamina=Math.min(state.player.maxStamina,state.player.stamina+state.player.maxStamina*.15);
  state.enemy.stamina=Math.min(state.enemy.maxStamina,state.enemy.stamina+state.enemy.maxStamina*.15);
  state.player.stunned=false; state.enemy.stunned=false; state.round+=1;
  return {state,log};
}
