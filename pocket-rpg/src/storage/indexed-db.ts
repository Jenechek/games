import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4,
  LegacyGameStateV5,
  LegacyGameStateV6,
  LegacyGameStateV7,
  LegacyGameStateV8,
  LegacyGameStateV9,
  LegacyGameStateV10,
  LegacyGameStateV11,
  LegacyGameStateV12,
  LegacyGameStateV13,
  LegacyGameStateV14,
  LegacyGameStateV15
} from '../game-core/game-state.js';
import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { createDefaultFarmingState } from '../game-core/peaceful/farming/farming.js';
import { createDefaultGatheringState } from '../game-core/peaceful/gathering/gathering.js';
import { createDefaultCraftingState } from '../game-core/crafting/crafting.js';
import { createDefaultEconomyState } from '../game-core/economy/merchant.js';
import { createDefaultDiplomacyState } from '../game-core/diplomacy/diplomacy.js';
import {
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState
} from '../game-core/university/retraining.js';
import { emptyAttributeProfile } from '../game-core/progression/character.js';
import {
  collectLegacySkillProgression,
  synchronizeSkillMirrors,
  upgradeSkillProgressionV12,
  upgradeSkillProgressionV14,
  upgradeSkillProgressionV15
} from '../game-core/progression/skill-progress.js';
import type {
  LegacySkillProgressionStateV12,
  LegacySkillProgressionStateV14,
  LegacySkillProgressionStateV15,
  SkillProgressionState
} from '../game-core/progression/skill-progress.js';
import { createDefaultSummonRoster } from '../game-core/summons/summons.js';
import { createDefaultClassState } from '../game-core/classes/classes.js';
import { createDefaultEquipmentLoadout,pruneInvalidEquipmentLoadout } from '../game-core/items/equipment.js';
import { starterRecipeIds } from '../content/crafting.js';
import { itemDefs } from '../content/items.js';
import type { SaveEnvelopeV16 } from './schema.js';
import { migrateSave,upgradeLegacyInventory } from './migrations.js';

type SaveInput=
  |GameState
  |LegacyGameStateV15
  |LegacyGameStateV14
  |LegacyGameStateV13
  |LegacyGameStateV12
  |LegacyGameStateV11
  |LegacyGameStateV10
  |LegacyGameStateV9
  |LegacyGameStateV8
  |LegacyGameStateV7
  |LegacyGameStateV6
  |LegacyGameStateV5
  |LegacyGameStateV4
  |LegacyGameStateV3
  |LegacyGameStateV2
  |LegacyGameStateV1;

function persistentCharacter(
  character:{
    level:number;
    xp:number;
    gold:number;
    attributes?:GameState['character']['attributes'];
    attributeXp?:GameState['character']['attributeXp'];
  }
):GameState['character']{
  return {
    level:character.level,
    xp:character.xp,
    gold:character.gold,
    attributes:character.attributes??balancedAttributesForLegacyLevel(character.level),
    attributeXp:character.attributeXp??emptyAttributeProfile()
  };
}

type CurrentSkillBase=LegacyGameStateV11&{
  skillProgression:SkillProgressionState;
};

function finalizeState(
  state:LegacyGameStateV11,
  progression?:SkillProgressionState|LegacySkillProgressionStateV12|LegacySkillProgressionStateV14|LegacySkillProgressionStateV15
):CurrentSkillBase{
  const skillProgression=progression
    ?('magic' in progression
      ?progression
      :('armor' in progression
        ?upgradeSkillProgressionV15(progression)
        :('weapons' in progression
          ?upgradeSkillProgressionV14(progression)
          :upgradeSkillProgressionV12(progression))))
    :collectLegacySkillProgression({
      farming:state.farming,
      gathering:state.gathering,
      crafting:state.crafting,
      economy:state.economy,
      diplomacy:state.diplomacy
    });
  const synchronized=synchronizeSkillMirrors(state,skillProgression);
  return {...synchronized,skillProgression};
}

function withEmptyLoadout(state:CurrentSkillBase):GameState{
  return {...state,equipmentLoadout:createDefaultEquipmentLoadout()};
}

function normalizeState(state:SaveInput):GameState{
  if('equipmentLoadout' in state){
    const finalized=finalizeState(state,state.skillProgression);
    const skills=Object.fromEntries(
      Object.entries(finalized.skillProgression).map(([id,skill])=>[id,skill.level])
    );
    return {
      ...finalized,
      equipmentLoadout:pruneInvalidEquipmentLoadout({
        loadout:state.equipmentLoadout,
        inventory:finalized.inventory,
        itemDefs,
        character:{
          attributes:finalized.character.attributes,
          skills
        }
      })
    };
  }

  if('skillProgression' in state){
    return withEmptyLoadout(finalizeState(state,state.skillProgression));
  }

  if('classState' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      }
    }));
  }

  if('summons' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      classState:createDefaultClassState()
    }));
  }

  if('university' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      summons:createDefaultSummonRoster(),
      classState:createDefaultClassState()
    }));
  }

  if('diplomacy' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      university:createDefaultUniversityState(),
      summons:createDefaultSummonRoster(),
      classState:createDefaultClassState()
    }));
  }

  if('economy' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      diplomacy:createDefaultDiplomacyState(),
      university:createDefaultUniversityState(),
      summons:createDefaultSummonRoster(),
      classState:createDefaultClassState()
    }));
  }

  if('crafting' in state){
    return withEmptyLoadout(finalizeState({
      ...state,
      character:persistentCharacter(state.character),
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      economy:createDefaultEconomyState(),
      diplomacy:createDefaultDiplomacyState(),
      university:createDefaultUniversityState(),
      summons:createDefaultSummonRoster(),
      classState:createDefaultClassState()
    }));
  }

  const upgraded=upgradeLegacyInventory(state.inventory);
  return withEmptyLoadout(finalizeState({
    character:persistentCharacter(state.character),
    world:state.world,
    inventory:upgraded.inventory,
    injuries:'injuries' in state?state.injuries:cleanInjuryState(),
    farming:'farming' in state?state.farming:createDefaultFarmingState(),
    gathering:'gathering' in state?state.gathering:createDefaultGatheringState(),
    crafting:{
      ...createDefaultCraftingState(starterRecipeIds),
      nextEquipmentId:upgraded.nextEquipmentId
    },
    economy:createDefaultEconomyState(),
    diplomacy:createDefaultDiplomacyState(),
    university:createDefaultUniversityState(),
    summons:createDefaultSummonRoster(),
    classState:createDefaultClassState()
  }));
}

export function encodeSave(state:SaveInput,savedAt:number):string{
  const envelope:SaveEnvelopeV16={
    schemaVersion:16,
    savedAt,
    state:normalizeState(state)
  };
  return JSON.stringify(envelope);
}

export function decodeSave(raw:string):GameState|null{
  try{return migrateSave(JSON.parse(raw))?.state??null;}catch{return null;}
}

export class MemorySaveStore{
  private raw:string|null=null;
  async save(state:SaveInput,now=Date.now()):Promise<void>{this.raw=encodeSave(state,now);}
  async load():Promise<GameState|null>{return this.raw?decodeSave(this.raw):null;}
}

export class IndexedDbSaveStore{
  constructor(private dbName='pocket-rpg',private key='save'){}
  private async db():Promise<IDBDatabase>{
    return await new Promise((resolve,reject)=>{
      const req=indexedDB.open(this.dbName,1);
      req.onupgradeneeded=()=>{
        if(!req.result.objectStoreNames.contains('saves')){
          req.result.createObjectStore('saves');
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async save(state:SaveInput,now=Date.now()):Promise<void>{
    const db=await this.db();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('saves','readwrite');
      tx.objectStore('saves').put(encodeSave(state,now),this.key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }
  async load():Promise<GameState|null>{
    const db=await this.db();
    const raw=await new Promise<unknown>((resolve,reject)=>{
      const tx=db.transaction('saves','readonly');
      const req=tx.objectStore('saves').get(this.key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return typeof raw==='string'?decodeSave(raw):null;
  }
}
