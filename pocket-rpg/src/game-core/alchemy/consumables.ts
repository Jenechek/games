import type { CombatConsumableDefinition } from '../items/items.js';
import type { CombatantState } from '../combat/types.js';

export const MAX_POTION_TOXICITY=100;
export const POTION_TOXICITY_DECAY_PER_ROUND=20;

function classMultiplier(itemClass:number):number{
  const safe=Math.max(1,Math.min(5,Math.floor(itemClass)));
  return 1+(safe-1)*0.075;
}

export function canUseCombatConsumable(
  combatant:CombatantState,
  definition:CombatConsumableDefinition
):boolean{
  return (combatant.toxicity??0)+definition.toxicity<=MAX_POTION_TOXICITY;
}

export function applyCombatConsumable(
  combatant:CombatantState,
  definition:CombatConsumableDefinition,
  itemClass:number
):{ok:boolean;combatant:CombatantState;reason?:'toxicity'}{
  if(!canUseCombatConsumable(combatant,definition)){
    return {ok:false,combatant,reason:'toxicity'};
  }

  const multiplier=classMultiplier(itemClass);
  const next:CombatantState={
    ...combatant,
    effects:(combatant.effects??[]).map(effect=>({...effect})),
    toxicity:(combatant.toxicity??0)+definition.toxicity
  };

  if(definition.kind==='heal'){
    next.hp=Math.min(next.maxHp,next.hp+(definition.amount??0)*multiplier);
  }else if(definition.kind==='mana'){
    next.mana=Math.min(next.maxMana,next.mana+(definition.amount??0)*multiplier);
  }else if(definition.kind==='stamina'){
    next.stamina=Math.min(next.maxStamina,next.stamina+(definition.amount??0)*multiplier);
  }else if(definition.kind==='effect'&&definition.effectId){
    const magnitude=(definition.magnitude??0)*multiplier;
    const duration=Math.max(1,definition.durationRounds??1);
    const existing=next.effects?.find(effect=>effect.id===definition.effectId);
    if(existing){
      existing.magnitude=Math.max(existing.magnitude,magnitude);
      existing.roundsRemaining=Math.min(6,Math.max(existing.roundsRemaining,duration)+1);
    }else{
      next.effects=[...(next.effects??[]),{
        id:definition.effectId,
        magnitude,
        roundsRemaining:duration
      }];
    }
  }

  return {ok:true,combatant:next};
}
