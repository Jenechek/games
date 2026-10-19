import type { AttributeId } from '../types.js';
import type { UniversityState,RetrainingPreview } from './types.js';

export const UNIVERSITY_UNLOCK_LEVEL=10;
export const RETRAINING_DURATION_MS=60*60*1000;
export const RETRAINABLE_SHARE=0.8;
export const SPECIALIZATION_FLOOR_SHARE=0.05;
export const BASE_ATTRIBUTE_VALUE=10;
export const ATTRIBUTE_IDS:AttributeId[]=[
  'strength','agility','intuition','vitality',
  'wisdom','luck','charisma','intelligence'
];

function round2(value:number):number{
  return Math.round(value*100)/100;
}

export function createDefaultUniversityState():UniversityState{
  return {pending:null};
}

export function mandatoryAttributeBaseline(level:number):number{
  return BASE_ATTRIBUTE_VALUE+Math.max(0,Math.floor(level)-1);
}

export function specializationByAttribute(
  attributes:Record<AttributeId,number>,
  level:number
):Record<AttributeId,number>{
  const baseline=mandatoryAttributeBaseline(level);
  return Object.fromEntries(
    ATTRIBUTE_IDS.map(id=>[id,round2(Math.max(0,attributes[id]-baseline))])
  ) as Record<AttributeId,number>;
}

export function totalSpecializationPoints(
  attributes:Record<AttributeId,number>,
  level:number
):number{
  const specialization=specializationByAttribute(attributes,level);
  return round2(ATTRIBUTE_IDS.reduce((sum,id)=>sum+specialization[id],0));
}

export function retrainingPreview(args:{
  attributes:Record<AttributeId,number>;
  level:number;
  from:AttributeId;
  percent:number;
}):RetrainingPreview{
  const percent=Math.max(0,Math.min(100,args.percent));
  const specialization=specializationByAttribute(args.attributes,args.level);
  const donorSpecialization=specialization[args.from];
  const totalSpecialization=round2(
    ATTRIBUTE_IDS.reduce((sum,id)=>sum+specialization[id],0)
  );
  const protectedByTwentyPercent=round2(donorSpecialization*(1-RETRAINABLE_SHARE));
  const fivePercentFloor=round2(totalSpecialization*SPECIALIZATION_FLOOR_SHARE);
  const minimumRemaining=Math.max(protectedByTwentyPercent,fivePercentFloor);
  const transferable=round2(Math.max(0,donorSpecialization-minimumRemaining));
  const amount=round2(transferable*percent/100);
  return {
    donorSpecialization,
    totalSpecialization,
    protectedByTwentyPercent,
    fivePercentFloor,
    transferable,
    amount
  };
}

export function startRetraining(args:{
  state:UniversityState;
  attributes:Record<AttributeId,number>;
  level:number;
  from:AttributeId;
  to:AttributeId;
  percent:number;
  now:number;
}):UniversityState{
  if(args.level<UNIVERSITY_UNLOCK_LEVEL)throw new Error('university locked');
  if(args.state.pending)throw new Error('retraining already active');
  if(args.from===args.to)throw new Error('same attribute');
  if(!(args.percent>0&&args.percent<=100))throw new Error('invalid percent');

  const preview=retrainingPreview(args);
  if(preview.amount<=0)throw new Error('nothing transferable');

  return {
    pending:{
      from:args.from,
      to:args.to,
      percent:round2(args.percent),
      amount:preview.amount,
      startedAt:args.now,
      completesAt:args.now+RETRAINING_DURATION_MS
    }
  };
}

export function resolveRetraining(args:{
  state:UniversityState;
  attributes:Record<AttributeId,number>;
  now:number;
}):{state:UniversityState;attributes:Record<AttributeId,number>;completed:boolean}{
  const pending=args.state.pending;
  if(!pending||args.now<pending.completesAt){
    return {state:args.state,attributes:args.attributes,completed:false};
  }

  const attributes={...args.attributes};
  attributes[pending.from]=round2(attributes[pending.from]-pending.amount);
  attributes[pending.to]=round2(attributes[pending.to]+pending.amount);
  return {
    state:{pending:null},
    attributes,
    completed:true
  };
}

export function balancedAttributesForLegacyLevel(level:number):Record<AttributeId,number>{
  const safeLevel=Math.max(1,Math.floor(level));
  const attributes=Object.fromEntries(
    ATTRIBUTE_IDS.map(id=>[id,BASE_ATTRIBUTE_VALUE])
  ) as Record<AttributeId,number>;
  for(let current=2;current<=safeLevel;current+=1){
    for(const id of ATTRIBUTE_IDS)attributes[id]+=1;
    const specializationPoints=7;
    for(let i=0;i<specializationPoints;i+=1){
      attributes[ATTRIBUTE_IDS[(current-2+i)%ATTRIBUTE_IDS.length]]+=1;
    }
  }
  return attributes;
}
