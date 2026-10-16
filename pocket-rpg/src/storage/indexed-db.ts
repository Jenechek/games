import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4
} from '../game-core/game-state.js';
import type {InventoryState} from '../game-core/items/inventory.js';
import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { createDefaultFarmingState } from '../game-core/peaceful/farming/farming.js';
import { createDefaultGatheringState } from '../game-core/peaceful/gathering/gathering.js';
import { createDefaultCraftingState } from '../game-core/crafting/crafting.js';
import type { SaveEnvelopeV5 } from './schema.js';
import { migrateSave } from './migrations.js';

type SaveInput=
  |GameState
  |LegacyGameStateV4
  |LegacyGameStateV3
  |LegacyGameStateV2
  |LegacyGameStateV1;

function normalizeInventory(inventory:InventoryState):InventoryState{
  return {
    stacks:inventory.stacks.map(stack=>({...stack})),
    instances:(inventory.instances??[]).map(instance=>({
      ...instance,
      properties:[...instance.properties]
    }))
  };
}

function normalizeState(state:SaveInput):GameState{
  return {
    character:{...state.character},
    world:{
      ...state.world,
      travel:state.world.travel?{...state.world.travel}:null
    },
    inventory:normalizeInventory(state.inventory),
    injuries:'injuries' in state
      ? {severity:{...state.injuries.severity},unconsciousUntil:state.injuries.unconsciousUntil,restUntil:state.injuries.restUntil}
      : cleanInjuryState(),
    farming:'farming' in state
      ? {
          ...state.farming,
          skill:{...state.farming.skill},
          knownSeedIds:[...state.farming.knownSeedIds],
          fields:state.farming.fields.map(field=>({
            ...field,
            cells:field.cells.map(cell=>cell?{...cell}:null)
          }))
        }
      : createDefaultFarmingState(),
    gathering:'gathering' in state
      ? {
          skill:{...state.gathering.skill},
          discoveredResourceIds:[...state.gathering.discoveredResourceIds]
        }
      : createDefaultGatheringState(),
    crafting:'crafting' in state
      ? {
          craftingSkill:{...state.crafting.craftingSkill},
          alchemySkill:{...state.crafting.alchemySkill},
          knownRecipeIds:[...state.crafting.knownRecipeIds],
          nextInstanceNumber:state.crafting.nextInstanceNumber
        }
      : createDefaultCraftingState()
  };
}

export function encodeSave(state:SaveInput,savedAt:number):string{
  const envelope:SaveEnvelopeV5={
    schemaVersion:5,
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
        if(!req.result.objectStoreNames.contains('saves'))req.result.createObjectStore('saves');
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
