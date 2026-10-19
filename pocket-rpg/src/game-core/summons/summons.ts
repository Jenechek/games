import type { SeededRng } from '../rng.js';
import type {
  SummonCombatState,
  SummonDefinition,
  SummonInstanceState,
  SummonRosterState
} from './types.js';

export const SUMMON_FULL_RECOVERY_MS=10*60*1000;

function clamp(value:number,min:number,max:number):number{
  return Math.max(min,Math.min(max,value));
}

export function createDefaultSummonRoster():SummonRosterState{
  return {active:[],nextInstanceId:1};
}

export function summonCreature(args:{
  roster:SummonRosterState;
  definition:SummonDefinition;
  limit:number;
  now:number;
}):SummonRosterState{
  const limit=Math.max(0,Math.min(3,Math.floor(args.limit)));
  if(limit<=0)throw new Error('summons unavailable');

  const instance:SummonInstanceState={
    instanceId:`summon-${args.roster.nextInstanceId}`,
    definitionId:args.definition.id,
    hp:args.definition.maxHp,
    stamina:args.definition.maxStamina,
    summonedAt:args.now,
    recoveryUpdatedAt:args.now
  };

  let active=args.roster.active.map(item=>({...item}));
  if(active.length>=limit){
    active.sort((a,b)=>a.summonedAt-b.summonedAt||a.instanceId.localeCompare(b.instanceId));
    active=active.slice(active.length-limit+1);
  }
  active.push(instance);

  return {
    active,
    nextInstanceId:args.roster.nextInstanceId+1
  };
}

export function dismissSummon(
  roster:SummonRosterState,
  instanceId:string
):SummonRosterState{
  return {
    ...roster,
    active:roster.active.filter(item=>item.instanceId!==instanceId)
  };
}

export function reconstructSummonRecovery(
  roster:SummonRosterState,
  definitions:Record<string,SummonDefinition>,
  now:number
):SummonRosterState{
  return {
    ...roster,
    active:roster.active.map(instance=>{
      const def=definitions[instance.definitionId];
      if(!def)return instance;
      const elapsed=Math.max(0,now-instance.recoveryUpdatedAt);
      const fraction=clamp(elapsed/SUMMON_FULL_RECOVERY_MS,0,1);
      return {
        ...instance,
        hp:Math.min(def.maxHp,instance.hp+def.maxHp*fraction),
        stamina:Math.min(def.maxStamina,instance.stamina+def.maxStamina*fraction),
        recoveryUpdatedAt:now
      };
    })
  };
}

export function prepareSummonsForCombat(
  roster:SummonRosterState,
  definitions:Record<string,SummonDefinition>,
  now:number
):SummonCombatState[]{
  return roster.active
    .filter(instance=>instance.hp>0&&Boolean(definitions[instance.definitionId]))
    .map(instance=>{
      const def=definitions[instance.definitionId];
      return {
        ...instance,
        recoveryUpdatedAt:now,
        maxHp:def.maxHp,
        maxStamina:def.maxStamina,
        damage:def.damage,
        accuracy:def.accuracy,
        evasion:def.evasion,
        interceptChance:def.interceptChance,
        attackStaminaCost:def.attackStaminaCost,
        staminaRecoveryPerRound:def.staminaRecoveryPerRound,
        role:def.role,
        passiveImmunities:[...def.passiveImmunities]
      };
    });
}

export function syncSummonsFromCombat(
  roster:SummonRosterState,
  combatSummons:SummonCombatState[],
  now:number
):SummonRosterState{
  const byId=new Map(combatSummons.filter(s=>s.hp>0).map(s=>[s.instanceId,s]));
  return {
    ...roster,
    active:roster.active
      .filter(instance=>byId.has(instance.instanceId))
      .map(instance=>{
        const combat=byId.get(instance.instanceId)!;
        return {
          ...instance,
          hp:combat.hp,
          stamina:combat.stamina,
          recoveryUpdatedAt:now
        };
      })
  };
}

export function restoreSummonFromClassSkill(args:{
  roster:SummonRosterState;
  definitions:Record<string,SummonDefinition>;
  instanceId:string;
  hp:number;
  stamina:number;
  now:number;
}):SummonRosterState{
  return {
    ...args.roster,
    active:args.roster.active.map(instance=>{
      if(instance.instanceId!==args.instanceId)return instance;
      const def=args.definitions[instance.definitionId];
      if(!def)return instance;
      return {
        ...instance,
        hp:Math.min(def.maxHp,instance.hp+Math.max(0,args.hp)),
        stamina:Math.min(def.maxStamina,instance.stamina+Math.max(0,args.stamina)),
        recoveryUpdatedAt:args.now
      };
    })
  };
}

export function chooseInterceptor(
  summons:SummonCombatState[],
  rng:Pick<SeededRng,'chance'>
):SummonCombatState|null{
  const ordered=summons
    .filter(summon=>summon.hp>0&&summon.interceptChance>0)
    .sort((a,b)=>b.hp-a.hp||a.instanceId.localeCompare(b.instanceId));
  for(const summon of ordered){
    if(rng.chance(clamp(summon.interceptChance,0,1)))return summon;
  }
  return null;
}

export function applySummonDamage(
  summon:SummonCombatState,
  amount:number
):number{
  const damage=Math.max(1,Math.round(amount));
  summon.hp=Math.max(0,summon.hp-damage);
  return damage;
}

export function resolveAutomaticSummonAttack(args:{
  summon:SummonCombatState;
  target:{hp:number;evasion:number};
  rng:Pick<SeededRng,'chance'>;
}):{hit:boolean;damage:number}{
  const summon=args.summon;
  if(summon.hp<=0||summon.stamina<summon.attackStaminaCost){
    return {hit:false,damage:0};
  }
  summon.stamina=Math.max(0,summon.stamina-summon.attackStaminaCost);
  const hitChance=clamp(summon.accuracy*(1-clamp(args.target.evasion,0,0.9)),0,1);
  if(!args.rng.chance(hitChance))return {hit:false,damage:0};
  const damage=Math.max(1,Math.round(summon.damage));
  args.target.hp=Math.max(0,args.target.hp-damage);
  return {hit:true,damage};
}

export function endSummonRound(summon:SummonCombatState):void{
  if(summon.hp<=0)return;
  summon.stamina=Math.min(
    summon.maxStamina,
    summon.stamina+Math.max(0,summon.staminaRecoveryPerRound)
  );
}
