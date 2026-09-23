import type { GameState } from '../game-core/game-state.js';
import type { SaveEnvelopeV1 } from './schema.js';
import { migrateSave } from './migrations.js';
export function encodeSave(state:GameState,savedAt:number):string { const envelope:SaveEnvelopeV1={schemaVersion:1,savedAt,state}; return JSON.stringify(envelope); }
export function decodeSave(raw:string):GameState|null { try { return migrateSave(JSON.parse(raw))?.state ?? null; } catch { return null; } }
export class MemorySaveStore { private raw:string|null=null; async save(state:GameState,now=Date.now()):Promise<void>{this.raw=encodeSave(state,now);} async load():Promise<GameState|null>{return this.raw?decodeSave(this.raw):null;} }
export class IndexedDbSaveStore {
  constructor(private dbName='pocket-rpg',private key='save') {}
  private async db():Promise<IDBDatabase> { return await new Promise((resolve,reject)=>{ const req=indexedDB.open(this.dbName,1); req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('saves'))req.result.createObjectStore('saves');}; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
  async save(state:GameState,now=Date.now()):Promise<void>{const db=await this.db(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(encodeSave(state,now),this.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
  async load():Promise<GameState|null>{const db=await this.db();const raw=await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction('saves','readonly');const req=tx.objectStore('saves').get(this.key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return typeof raw==='string'?decodeSave(raw):null;}
}
