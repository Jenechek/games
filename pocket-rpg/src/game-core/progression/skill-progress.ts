import type { CraftingState } from '../crafting/types.js';
import type { DiplomacyState } from '../diplomacy/types.js';
import type { EconomyState } from '../economy/types.js';
import type { FarmingState } from '../peaceful/farming/types.js';
import type { GatheringState } from '../peaceful/gathering/types.js';
import type { SkillState } from './skills.js';

export const LEGACY_PERSISTED_SKILL_IDS_V12=[
  'fishing',
  'farming',
  'gathering',
  'crafting',
  'alchemy',
  'trading',
  'diplomacy'
] as const;

export const WEAPON_SKILL_IDS=[
  'weapons',
  'one-handed',
  'swords',
  'short-sword'
] as const;

export const LEGACY_PERSISTED_SKILL_IDS_V14=[
  ...LEGACY_PERSISTED_SKILL_IDS_V12,
  ...WEAPON_SKILL_IDS
] as const;

export const ARMOR_SKILL_IDS=[
  'armor',
  'body-armor',
  'light-armor',
  'heavy-armor'
] as const;

export const BLOCKING_SKILL_IDS=[
  'shields'
] as const;

export const PERSISTED_SKILL_IDS=[
  ...LEGACY_PERSISTED_SKILL_IDS_V14,
  ...ARMOR_SKILL_IDS,
  ...BLOCKING_SKILL_IDS
] as const;

export type LegacyPersistedSkillIdV12=typeof LEGACY_PERSISTED_SKILL_IDS_V12[number];
export type LegacyPersistedSkillIdV14=typeof LEGACY_PERSISTED_SKILL_IDS_V14[number];
export type PersistedSkillId=typeof PERSISTED_SKILL_IDS[number];

export type LegacySkillProgressionStateV12=Record<LegacyPersistedSkillIdV12,SkillState>;
export type LegacySkillProgressionStateV14=Record<LegacyPersistedSkillIdV14,SkillState>;
export type SkillProgressionState=Record<PersistedSkillId,SkillState>;

function zeroSkill():SkillState{
  return {level:0,xp:0};
}

function defenseDefaults(){
  return {
    armor:zeroSkill(),
    'body-armor':zeroSkill(),
    'light-armor':zeroSkill(),
    'heavy-armor':zeroSkill(),
    shields:zeroSkill()
  };
}

export function createDefaultSkillProgression():SkillProgressionState{
  return Object.fromEntries(
    PERSISTED_SKILL_IDS.map(id=>[id,zeroSkill()])
  ) as SkillProgressionState;
}

export function collectLegacySkillProgression(args:{
  farming:FarmingState;
  gathering:GatheringState;
  crafting:CraftingState;
  economy:EconomyState;
  diplomacy:DiplomacyState;
  fishing?:SkillState;
}):SkillProgressionState{
  return {
    fishing:{...(args.fishing??zeroSkill())},
    farming:{...args.farming.skill},
    gathering:{...args.gathering.skill},
    crafting:{...args.crafting.skills.crafting},
    alchemy:{...args.crafting.skills.alchemy},
    trading:{...args.economy.trading},
    diplomacy:{...args.diplomacy.skill},
    weapons:zeroSkill(),
    'one-handed':zeroSkill(),
    swords:zeroSkill(),
    'short-sword':zeroSkill(),
    ...defenseDefaults()
  };
}

export function upgradeSkillProgressionV12(
  legacy:LegacySkillProgressionStateV12
):SkillProgressionState{
  return {
    fishing:{...legacy.fishing},
    farming:{...legacy.farming},
    gathering:{...legacy.gathering},
    crafting:{...legacy.crafting},
    alchemy:{...legacy.alchemy},
    trading:{...legacy.trading},
    diplomacy:{...legacy.diplomacy},
    weapons:zeroSkill(),
    'one-handed':zeroSkill(),
    swords:zeroSkill(),
    'short-sword':zeroSkill(),
    ...defenseDefaults()
  };
}

export function upgradeSkillProgressionV14(
  legacy:LegacySkillProgressionStateV14
):SkillProgressionState{
  return {
    fishing:{...legacy.fishing},
    farming:{...legacy.farming},
    gathering:{...legacy.gathering},
    crafting:{...legacy.crafting},
    alchemy:{...legacy.alchemy},
    trading:{...legacy.trading},
    diplomacy:{...legacy.diplomacy},
    weapons:{...legacy.weapons},
    'one-handed':{...legacy['one-handed']},
    swords:{...legacy.swords},
    'short-sword':{...legacy['short-sword']},
    ...defenseDefaults()
  };
}

export function synchronizeSkillMirrors<T extends {
  farming:FarmingState;
  gathering:GatheringState;
  crafting:CraftingState;
  economy:EconomyState;
  diplomacy:DiplomacyState;
}>(
  state:T,
  progression:SkillProgressionState
):T{
  return {
    ...state,
    farming:{...state.farming,skill:{...progression.farming}},
    gathering:{...state.gathering,skill:{...progression.gathering}},
    crafting:{
      ...state.crafting,
      skills:{
        ...state.crafting.skills,
        crafting:{...progression.crafting},
        alchemy:{...progression.alchemy}
      }
    },
    economy:{...state.economy,trading:{...progression.trading}},
    diplomacy:{...state.diplomacy,skill:{...progression.diplomacy}}
  } as T;
}

export function skillStatesEqual(a:SkillState,b:SkillState):boolean{
  return a.level===b.level&&Math.abs(a.xp-b.xp)<1e-9;
}

export function mirrorsMatchProgression(args:{
  progression:Pick<SkillProgressionState,LegacyPersistedSkillIdV12>;
  farming:FarmingState;
  gathering:GatheringState;
  crafting:CraftingState;
  economy:EconomyState;
  diplomacy:DiplomacyState;
}):boolean{
  return skillStatesEqual(args.progression.farming,args.farming.skill)
    &&skillStatesEqual(args.progression.gathering,args.gathering.skill)
    &&skillStatesEqual(args.progression.crafting,args.crafting.skills.crafting)
    &&skillStatesEqual(args.progression.alchemy,args.crafting.skills.alchemy)
    &&skillStatesEqual(args.progression.trading,args.economy.trading)
    &&skillStatesEqual(args.progression.diplomacy,args.diplomacy.skill);
}
