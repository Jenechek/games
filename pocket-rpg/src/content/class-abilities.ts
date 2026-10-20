import type {PlayerClassId} from '../game-core/classes/types.js';
import type {CombatAction,CombatantState} from '../game-core/combat/types.js';
export interface ClassAbility {label:string;requiredLevel:number;staminaCost:number;effect:'strike'|'guard'|'heal'|'focus';power:number}
export const classAbilities:Record<PlayerClassId,ClassAbility>={
 mage:{label:'Арканная стойка',requiredLevel:10,staminaCost:25,effect:'focus',power:.12},
 tamer:{label:'Звериная стойкость',requiredLevel:10,staminaCost:25,effect:'guard',power:.12},
 warrior:{label:'Мощный удар',requiredLevel:10,staminaCost:25,effect:'strike',power:1.45},
 guardian:{label:'Крепостная оборона',requiredLevel:10,staminaCost:25,effect:'guard',power:.18},
 duelist:{label:'Точный выпад',requiredLevel:10,staminaCost:25,effect:'strike',power:1.35},
 ranger:{label:'Прицельный выстрел',requiredLevel:10,staminaCost:25,effect:'strike',power:1.35},
 assassin:{label:'Коварный удар',requiredLevel:10,staminaCost:30,effect:'strike',power:1.6},
 paladin:{label:'Светлое исцеление',requiredLevel:10,staminaCost:30,effect:'heal',power:20},
 berserker:{label:'Яростный удар',requiredLevel:10,staminaCost:35,effect:'strike',power:1.75},
 monk:{label:'Восстановление духа',requiredLevel:10,staminaCost:25,effect:'heal',power:18},
 battlemage:{label:'Боевой фокус',requiredLevel:10,staminaCost:25,effect:'focus',power:.15},
 druid:{label:'Природное восстановление',requiredLevel:10,staminaCost:30,effect:'heal',power:22}
};
export const CLASS_ABILITY_MILESTONES=[10,20,35,50,70,85,100] as const;
export function classAbilityAtLevel(classId:PlayerClassId,level:number):ClassAbility|null{
 const base=classAbilities[classId];
 const tier=CLASS_ABILITY_MILESTONES.filter(value=>level>=value).length;
 if(tier===0)return null;
 // One fixed evolution per milestone; no player choices or extra actions.
 const growth=tier-1;
 const power=base.effect==='strike'
  ?Math.min(2.5,base.power+growth*.12)
  :base.effect==='heal'
   ?Math.min(45,base.power+growth*4)
   :Math.min(.2,base.power+growth*.015);
 return {...base,requiredLevel:CLASS_ABILITY_MILESTONES[tier-1],
  staminaCost:Math.min(45,base.staminaCost+growth*2),power};
}
export function classAbilityAction(classId:PlayerClassId|null,level:number,actor:CombatantState):CombatAction|null{
 if(!classId)return null;
 const ability=classAbilityAtLevel(classId,level);
 if(!ability||actor.stamina<ability.staminaCost)return null;
 if(ability.effect==='heal'&&actor.hp>=actor.maxHp)return null;
 if(ability.effect==='guard'||ability.effect==='focus'){
  const id=ability.effect==='guard'?'ward':'focus';
  const effect=actor.effects?.find(e=>e.id===id);
  if(effect&&effect.magnitude>=ability.power&&effect.roundsRemaining>=2)return null;
 }
 return {type:'class-ability',staminaCost:ability.staminaCost,effect:ability.effect,power:ability.power};
}
