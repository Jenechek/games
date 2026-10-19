import type { SeededRng } from '../rng.js';
import { POTION_TOXICITY_DECAY_PER_ROUND } from '../alchemy/consumables.js';
import {
  applySummonDamage,
  chooseInterceptor,
  endSummonRound,
  resolveAutomaticSummonAttack
} from '../summons/summons.js';
import { cappedChance,combineDiminishingPercentages,effectiveEvasion,physicalMitigationAfterPenetration } from './mitigation.js';
import type {
  CombatAction,
  CombatLogEntry,
  CombatState,
  CombatantState,
  RoundSelections
} from './types.js';

function cloneCombatant(combatant:CombatantState):CombatantState{
  return {...combatant,effects:(combatant.effects??[]).map(effect=>({...effect}))};
}
function cloneState(state:CombatState):CombatState {
  return {
    player:cloneCombatant(state.player),
    enemy:cloneCombatant(state.enemy),
    summons:(state.summons??[]).map(summon=>({
      ...summon,
      passiveImmunities:[...summon.passiveImmunities]
    })),
    round:state.round
  };
}
function defeated(c:CombatantState):boolean { return c.hp<=0; }
function effectMagnitude(combatant:CombatantState,id:'might'|'focus'|'ward'):number{
  return combatant.effects?.find(effect=>effect.id===id)?.magnitude??0;
}

function resolveAttack(
  attacker:CombatantState,
  target:CombatantState,
  rng:SeededRng,
  interceptors=undefined as CombatState['summons']
):{hit:boolean;interceptorId?:string;damage:number} {
  const accuracy=Math.max(0,attacker.accuracy+effectMagnitude(attacker,'focus'));
  const evasion=effectiveEvasion(target.evasion,accuracy);
  if(!rng.chance(Math.max(0,Math.min(1,accuracy*(1-evasion))))){
    return {hit:false,damage:0};
  }

  const block=cappedChance(target.shieldBlock,.6,target.style==='defensive');
  if(target.hasShield && rng.chance(block))return {hit:false,damage:0};

  const parry=target.hasShield?0:cappedChance(target.parry,.35,target.style==='defensive');
  if(parry>0 && rng.chance(parry)){
    attacker.hp=Math.max(0,attacker.hp-target.damage);
    return {hit:false,damage:0};
  }

  let damage=attacker.damage*(1+effectMagnitude(attacker,'might'));
  if(rng.chance(.1))damage*=1.5;

  if(interceptors?.length){
    const interceptor=chooseInterceptor(interceptors,rng);
    if(interceptor){
      const intercepted=Math.max(1,Math.round(damage));
      applySummonDamage(interceptor,intercepted);
      return {hit:true,interceptorId:interceptor.instanceId,damage:intercepted};
    }
  }

  const mitigation=physicalMitigationAfterPenetration(
    combineDiminishingPercentages([
      target.damageMitigation??0,
      effectMagnitude(target,'ward')
    ]),
    0
  );
  damage*=1-mitigation;
  const rounded=Math.max(1,Math.round(damage));
  target.hp=Math.max(0,target.hp-rounded);
  return {hit:true,damage:rounded};
}

function applyAction(
  actor:CombatantState,
  target:CombatantState,
  action:CombatAction|undefined,
  rng:SeededRng,
  interceptors?:CombatState['summons']
):{
  success:boolean;
  damage:number;
  magicSkillPath?:readonly string[];
  magicEffectApplied?:boolean;
} {
  if(!action)return {success:false,damage:0};
  if(action.type==='heal'){
    actor.hp=Math.min(actor.maxHp,actor.hp+action.amount);
    return {success:true,damage:0};
  }
  if(action.type==='stun'){
    target.stunned=true;
    return {success:true,damage:0};
  }
  if(action.type==='attack'){
    const result=resolveAttack(actor,target,rng,interceptors);
    return {success:result.hit,damage:result.damage};
  }
  if(action.type==='magic'){
    const manaCost=Math.max(0,action.manaCost);
    if(actor.mana<manaCost){
      return {
        success:false,
        damage:0,
        magicSkillPath:action.skillPath,
        magicEffectApplied:false
      };
    }

    if(action.effect.kind==='heal'){
      const amount=Math.max(0,action.effect.amount);
      const missing=Math.max(0,actor.maxHp-actor.hp);
      if(amount<=0||missing<=0){
        return {
          success:false,
          damage:0,
          magicSkillPath:action.skillPath,
          magicEffectApplied:false
        };
      }
      actor.mana=Math.max(0,actor.mana-manaCost);
      actor.hp=Math.min(actor.maxHp,actor.hp+amount);
      return {
        success:true,
        damage:0,
        magicSkillPath:action.skillPath,
        magicEffectApplied:true
      };
    }

    const buff=action.effect;
    const magnitude=Math.max(0,buff.magnitude);
    if(magnitude<=0){
      return {
        success:false,
        damage:0,
        magicSkillPath:action.skillPath,
        magicEffectApplied:false
      };
    }
    actor.mana=Math.max(0,actor.mana-manaCost);
    const rounds=Math.max(1,Math.floor(buff.rounds));
    const existing=actor.effects?.find(effect=>effect.id===buff.id);
    if(existing){
      existing.magnitude=Math.max(existing.magnitude,magnitude);
      existing.roundsRemaining=Math.max(existing.roundsRemaining,rounds);
    }else{
      actor.effects=[...(actor.effects??[]),{
        id:buff.id,
        magnitude,
        roundsRemaining:rounds
      }];
    }
    return {
      success:true,
      damage:0,
      magicSkillPath:action.skillPath,
      magicEffectApplied:true
    };
  }
  return {success:true,damage:0};
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

export function resolveRound(
  input:CombatState,
  selections:RoundSelections,
  rng:SeededRng
):{state:CombatState;log:CombatLogEntry[]} {
  const state=cloneState(input);
  const log:CombatLogEntry[]=[];

  if(selections.player.style)state.player.style=selections.player.style;
  if(selections.enemy.style)state.enemy.style=selections.enemy.style;

  const initialSteps:[
    CombatLogEntry['phase'],
    CombatantState,
    CombatantState,
    CombatAction|undefined
  ][]=[
    ['player-additional',state.player,state.enemy,selections.player.additional],
    ['enemy-additional',state.enemy,state.player,selections.enemy.additional],
    ['player-main',state.player,state.enemy,selections.player.main]
  ];

  for(const [phase,actor,target,action] of initialSteps){
    if(defeated(state.player)||defeated(state.enemy))break;
    if(!action)continue;
    if(phase.endsWith('main')&&actor.stunned)continue;
    const result=applyAction(actor,target,action,rng);
    log.push({
      phase,
      action:action.type,
      success:result.success,
      damage:result.damage,
      magicSkillPath:result.magicSkillPath,
      magicEffectApplied:result.magicEffectApplied
    });
  }

  if(!defeated(state.player)&&!defeated(state.enemy)){
    for(const summon of state.summons??[]){
      if(summon.hp<=0)continue;
      const result=resolveAutomaticSummonAttack({
        summon,
        target:state.enemy,
        rng
      });
      log.push({
        phase:'summon-main',
        action:result.hit?'attack':'wait',
        actorId:summon.instanceId
      });
      if(defeated(state.enemy))break;
    }
  }

  if(!defeated(state.player)&&!defeated(state.enemy)){
    const action=selections.enemy.main;
    if(action&&!state.enemy.stunned){
      const result=applyAction(state.enemy,state.player,action,rng,state.summons);
      log.push({
        phase:'enemy-main',
        action:action.type,
        success:result.success,
        damage:result.damage,
        magicSkillPath:result.magicSkillPath,
        magicEffectApplied:result.magicEffectApplied
      });
    }
  }

  if(defeated(state.player)||defeated(state.enemy))return {state,log};

  endRound(state.player);
  endRound(state.enemy);
  for(const summon of state.summons??[])endSummonRound(summon);
  state.round+=1;
  return {state,log};
}
