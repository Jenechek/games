import type { AttributeId } from '../types.js';

export type CharacterXpSource=
  |'combat'
  |'fishing'
  |'gathering'
  |'farming'
  |'crafting'
  |'alchemy'
  |'trading'
  |'diplomacy';

export type AttributeProfile=Record<AttributeId,number>;

export interface CharacterProgression {
  level:number;
  xp:number;
  attributes:Record<AttributeId,number>;
  attributeXp:AttributeProfile;
}

export interface CharacterXpResult {
  state:CharacterProgression;
  gained:number;
  levelsGained:number;
}

export const CHARACTER_LEVEL_ONE_XP=1000;
export const CHARACTER_LEVEL_GROWTH=1.15;
export const ATTRIBUTE_IDS:AttributeId[]=[
  'strength','agility','intuition','vitality',
  'wisdom','luck','charisma','intelligence'
];

export const characterXpSourceProfiles:Record<CharacterXpSource,AttributeProfile>={
  combat:{
    strength:0.30,agility:0.20,intuition:0.15,vitality:0.20,
    wisdom:0.03,luck:0.05,charisma:0.02,intelligence:0.05
  },
  fishing:{
    strength:0.03,agility:0.25,intuition:0.25,vitality:0.08,
    wisdom:0.12,luck:0.20,charisma:0.02,intelligence:0.05
  },
  gathering:{
    strength:0.05,agility:0.20,intuition:0.25,vitality:0.10,
    wisdom:0.15,luck:0.15,charisma:0.02,intelligence:0.08
  },
  farming:{
    strength:0.08,agility:0.08,intuition:0.08,vitality:0.22,
    wisdom:0.28,luck:0.08,charisma:0.03,intelligence:0.15
  },
  crafting:{
    strength:0.03,agility:0.18,intuition:0.08,vitality:0.04,
    wisdom:0.20,luck:0.07,charisma:0.03,intelligence:0.37
  },
  alchemy:{
    strength:0.01,agility:0.08,intuition:0.10,vitality:0.05,
    wisdom:0.28,luck:0.08,charisma:0.03,intelligence:0.37
  },
  trading:{
    strength:0.01,agility:0.03,intuition:0.10,vitality:0.02,
    wisdom:0.12,luck:0.18,charisma:0.34,intelligence:0.20
  },
  diplomacy:{
    strength:0.01,agility:0.02,intuition:0.10,vitality:0.02,
    wisdom:0.24,luck:0.06,charisma:0.38,intelligence:0.17
  }
};

export function emptyAttributeProfile():AttributeProfile{
  return {
    strength:0,agility:0,intuition:0,vitality:0,
    wisdom:0,luck:0,charisma:0,intelligence:0
  };
}

export function xpRequiredForLevel(baseXp:number,level:number):number{
  return baseXp*(CHARACTER_LEVEL_GROWTH**(level-1));
}

export function characterXpRequired(level:number):number{
  return xpRequiredForLevel(CHARACTER_LEVEL_ONE_XP,level);
}

function addProfileContribution(
  profile:AttributeProfile,
  source:CharacterXpSource,
  amount:number
):AttributeProfile{
  const weights=characterXpSourceProfiles[source];
  const next={...profile};
  for(const id of ATTRIBUTE_IDS)next[id]+=amount*weights[id];
  return next;
}

export function levelUpCharacter(
  state:CharacterProgression,
  profile:AttributeProfile
):CharacterProgression{
  const attributes={...state.attributes};
  for(const key of ATTRIBUTE_IDS)attributes[key]+=1;

  const totalWeight=ATTRIBUTE_IDS.reduce(
    (sum,key)=>sum+Math.max(0,profile[key]??0),0
  );
  const normalized=ATTRIBUTE_IDS.map((key,index)=>{
    const raw=totalWeight>0
      ?Math.max(0,profile[key]??0)/totalWeight*7
      :7/ATTRIBUTE_IDS.length;
    return {
      key,index,raw,
      floor:Math.floor(raw),
      fraction:raw-Math.floor(raw)
    };
  });

  let assigned=normalized.reduce((sum,item)=>sum+item.floor,0);
  for(const item of normalized)attributes[item.key]+=item.floor;
  normalized.sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
  for(let index=0;assigned<7;index+=1,assigned+=1){
    attributes[normalized[index%normalized.length].key]+=1;
  }

  return {
    ...state,
    level:state.level+1,
    attributes,
    attributeXp:emptyAttributeProfile()
  };
}

export function addCharacterXp(
  state:CharacterProgression,
  amount:number,
  source:CharacterXpSource
):CharacterXpResult{
  let remaining=Math.max(0,amount);
  const gained=remaining;
  let current:CharacterProgression={
    ...state,
    attributes:{...state.attributes},
    attributeXp:{...state.attributeXp}
  };
  let levelsGained=0;

  while(remaining>0){
    const required=characterXpRequired(current.level);
    const needed=Math.max(0,required-current.xp);
    const chunk=Math.min(remaining,needed||remaining);

    current={
      ...current,
      xp:current.xp+chunk,
      attributeXp:addProfileContribution(current.attributeXp,source,chunk)
    };
    remaining-=chunk;

    if(current.xp+1e-9<required)break;

    current={...current,xp:Math.max(0,current.xp-required)};
    current=levelUpCharacter(current,current.attributeXp);
    levelsGained+=1;
  }

  return {state:current,gained,levelsGained};
}

export function combatCharacterXp(enemyLevel:number):number{
  const level=Math.max(1,Math.floor(enemyLevel));
  return 40+level*20;
}
