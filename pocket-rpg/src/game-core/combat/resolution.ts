import type { SeededRng } from '../rng.js';
import { POTION_TOXICITY_DECAY_PER_ROUND } from '../alchemy/consumables.js';
import { cappedChance, effectiveEvasion } from './mitigation.js';
import type { CombatAction, CombatLogEntry, CombatState, CombatantState, RoundSelections } from './types.js';

function cloneCombatant(combatant:CombatantState):CombatantState{
  return {...combatant,effects:(combatant.effects??[]).map(effect=>({...effect}))};
}
function cloneState(state:CombatState):CombatState {
  return {player:cloneCombatant(state.player),enemy:cloneCombatant(state.enemy),round:state.round};
}
function defeated(c:CombatantState):boolean { return c.hp<=0; }
function effectMagnitude(combatant:CombatantState,id:'might'|'focus'):number{
  return combatant.effects?.find(effect=>effect.id===id)?.magnitude??0;
}
function resolveAttack(attacker:CombatantState,target:CombatantState,rng:SeededRng):void {
  const accuracy=Math.max(0,attacker.accuracy+effectMagnitude(attacker,'focus'));
  const evasion=effectiveEvasion(target.evasion,accuracy);
  if(!rng.chance(Math.max(0,Math.min(1,accuracy*(1-evasion))))) return;
  const block=cappedChance(target.shieldBlock,.6,target.style==='defensive');
  if(target.hasShield && rng.chance(block)) return;
  const parry=target.hasShield?0:cappedChance(target.parry,.35,target.style==='defensive');
  if(parry>0 && rng.chance(parry)) { attacker.hp=Math.max(0,attacker.hp-target.damage); return; }
  let damage=attacker.damage*(1+effectMagnitude(attacker,'might'));
  if(rng.chance(.1)) damage*=1.5;
  target.hp=Math.max(0,target.hp-Math.max(1,Math.round(damage)));
}
function applyAction(actor:CombatantState,target:CombatantState,action:CombatAction|undefined,rng:SeededRng):void {
  if(!action) return;
  if(action.type==='heal') actor.hp=Math.min(actor.maxHp,actor.hp+action.amount);
  else if(action.type==='stun') target.stunned=true;
  else if(action.type==='attack') resolveAttack(actor,target,rng);
}
function endRound(combatant:CombatantState):void{
  combatant.mana=Math.min(combatant.maxMana,combatant.mana+combatant.maxMana*.15);
  combatant.stamina=Math.min(combatant.maxStamina,combatant.stamina+combatant.maxStamina*.15);
  combatant.stunned=false;
  combatant.toxicity=Math.max(0,(combatant.toxicity??0)-POTION_TOXICITY_DECAY_PER_ROUND);
  combatant.effects=(combatant.effects??[])
    .map(effect=>({...effect,roundsRemaining:effect.roundsRemaining-1}))
    .filter(effect=>effect.roundsRemaining>0);
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
  endRound(state.player);
  endRound(state.enemy);
  state.round+=1;
  return {state,log};
}
