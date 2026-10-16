import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4,
  LegacyGameStateV5,
  LegacyGameStateV6,
  LegacyGameStateV7
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
import { starterRecipeIds } from '../content/crafting.js';
import type { SaveEnvelopeV8 } from './schema.js';
import { migrateSave,upgradeLegacyInventory } from './migrations.js';

type SaveInput=
  |GameState
  |LegacyGameStateV7
  |LegacyGameStateV6
  |LegacyGameStateV5
  |LegacyGameStateV4
  |LegacyGameStateV3
  |LegacyGameStateV2
  |LegacyGameStateV1;

function persistentCharacter(
  character:{level:number;xp:number;gold:number;attributes?:GameState['character']['attributes']}
):GameState['character']{
  return {
    level:character.level,
    xp:character.xp,
    gold:character.gold,
    attributes:character.attributes??balancedAttributesForLegacyLevel(character.level)
  };
}

function normalizeState(state:SaveInput):GameState{
  if('university' in state){
    return {
      character:persistentCharacter(state.character),
      world:state.world,
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      injuries:state.injuries,
      farming:state.farming,
      gathering:state.gathering,
      crafting:state.crafting,
      economy:state.economy,
      diplomacy:state.diplomacy,
      university:state.university
    };
  }

  if('diplomacy' in state){
    return {
      character:persistentCharacter(state.character),
      world:state.world,
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      injuries:state.injuries,
      farming:state.farming,
      gathering:state.gathering,
      crafting:state.crafting,
      economy:state.economy,
      diplomacy:state.diplomacy,
      university:createDefaultUniversityState()
    };
  }

  if('economy' in state){
    return {
      character:persistentCharacter(state.character),
      world:state.world,
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      injuries:state.injuries,
      farming:state.farming,
      gathering:state.gathering,
      crafting:state.crafting,
      economy:state.economy,
      diplomacy:createDefaultDiplomacyState(),
      university:createDefaultUniversityState()
    };
  }

  if('crafting' in state){
    return {
      character:persistentCharacter(state.character),
      world:state.world,
      inventory:{
        stacks:state.inventory.stacks.map(stack=>({...stack})),
        equipment:[...(state.inventory.equipment??[])]
      },
      injuries:state.injuries,
      farming:state.farming,
      gathering:state.gathering,
      crafting:state.crafting,
      economy:createDefaultEconomyState(),
      diplomacy:createDefaultDiplomacyState(),
      university:createDefaultUniversityState()
    };
  }

  const upgraded=upgradeLegacyInventory(state.inventory);
  return {
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
    university:createDefaultUniversityState()
  };
}

export function encodeSave(state:SaveInput,savedAt:number):string{
  const envelope:SaveEnvelopeV8={
    schemaVersion:8,
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
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('saves'))req.result.createObjectStore('saves');};
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
