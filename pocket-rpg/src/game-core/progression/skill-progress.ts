import type { CraftingState } from '../crafting/types.js';
import type { DiplomacyState } from '../diplomacy/types.js';
import type { EconomyState } from '../economy/types.js';
import type { FarmingState } from '../peaceful/farming/types.js';
import type { GatheringState } from '../peaceful/gathering/types.js';
import type { SkillState } from './skills.js';

export const PERSISTED_SKILL_IDS=[
  'fishing',
  'farming',
  'gathering',
  'crafting',
  'alchemy',
  'trading',
  'diplomacy'
] as const;

export type PersistedSkillId=typeof PERSISTED_SKILL_IDS[number];
export type SkillProgressionState=Record<PersistedSkillId,SkillState>;

export function createDefaultSkillProgression():SkillProgressionState{
  return Object.fromEntries(
    PERSISTED_SKILL_IDS.map(id=>[id,{level:0,xp:0}])
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
    fishing:{...(args.fishing??{level:0,xp:0})},
    farming:{...args.farming.skill},
    gathering:{...args.gathering.skill},
    crafting:{...args.crafting.skills.crafting},
    alchemy:{...args.crafting.skills.alchemy},
    trading:{...args.economy.trading},
    diplomacy:{...args.diplomacy.skill}
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
  progression:SkillProgressionState;
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
