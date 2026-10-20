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
// Fixed secondary techniques are unlocked at level 35 and evolve at 70.
const SECONDARY:Record<PlayerClassId,{label:string;effect:ClassAbility['effect'];power:number}>={
 mage:{label:'Арканный разряд',effect:'strike',power:1.25},
 tamer:{label:'Звериная поддержка',effect:'heal',power:15},
 warrior:{label:'Стойка ветерана',effect:'guard',power:.12},
 guardian:{label:'Ответный выпад',effect:'strike',power:1.3},
 duelist:{label:'Фехтовальная концентрация',effect:'focus',power:.12},
 ranger:{label:'Уход в укрытие',effect:'guard',power:.12},
 assassin:{label:'Теневая сосредоточенность',effect:'focus',power:.13},
 paladin:{label:'Карающий удар',effect:'strike',power:1.35},
 berserker:{label:'Боевой азарт',effect:'focus',power:.12},
 monk:{label:'Удар ладонью',effect:'strike',power:1.3},
 battlemage:{label:'Чародейский удар',effect:'strike',power:1.35},
 druid:{label:'Лесная защита',effect:'guard',power:.14}
};
export function unlockedClassAbilities(classId:PlayerClassId,level:number):ClassAbility[]{
 const primary=classAbilityAtLevel(classId,level);
 if(!primary)return [];
 if(level<35)return [primary];
 const alternative=SECONDARY[classId],advanced=level>=70;
 const power=alternative.effect==='strike'
  ?alternative.power+(advanced?.18:0)
  :alternative.effect==='heal'
   ?alternative.power+(advanced?8:0)
   :Math.min(.2,alternative.power+(advanced?.03:0));
 return [primary,{...alternative,requiredLevel:advanced?70:35,
  staminaCost:advanced?36:30,power}];
}
export function classAbilityActionByIndex(classId:PlayerClassId|null,level:number,actor:CombatantState,index:number):CombatAction|null{
 if(!classId||!Number.isInteger(index))return null;
 const ability=unlockedClassAbilities(classId,level)[index];
 if(!ability||actor.stamina<ability.staminaCost)return null;
 if(ability.effect==='heal'&&actor.hp>=actor.maxHp)return null;
 if(ability.effect==='guard'||ability.effect==='focus'){
  const id=ability.effect==='guard'?'ward':'focus',effect=actor.effects?.find(e=>e.id===id);
  if(effect&&effect.magnitude>=ability.power&&effect.roundsRemaining>=2)return null;
 }
 return {type:'class-ability',staminaCost:ability.staminaCost,effect:ability.effect,power:ability.power};
}
export function classAbilityAction(classId:PlayerClassId|null,level:number,actor:CombatantState):CombatAction|null{
 return classAbilityActionByIndex(classId,level,actor,0);
}
