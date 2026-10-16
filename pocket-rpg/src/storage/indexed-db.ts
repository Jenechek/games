import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2
} from '../game-core/game-state.js';
import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { createDefaultFarmingState } from '../game-core/peaceful/farming/farming.js';
import type { SaveEnvelopeV3 } from './schema.js';
import { migrateSave } from './migrations.js';

type SaveInput = GameState | LegacyGameStateV2 | LegacyGameStateV1;

function normalizeState(state: SaveInput): GameState {
  return {
    character: state.character,
    world: state.world,
    inventory: state.inventory,
    injuries: 'injuries' in state ? state.injuries : cleanInjuryState(),
    farming: 'farming' in state ? state.farming : createDefaultFarmingState()
  };
}

export function encodeSave(state: SaveInput, savedAt: number): string {
  const envelope: SaveEnvelopeV3 = {
    schemaVersion: 3,
    savedAt,
    state: normalizeState(state)
  };
  return JSON.stringify(envelope);
}

export function decodeSave(raw: string): GameState | null {
  try {
    return migrateSave(JSON.parse(raw))?.state ?? null;
  } catch {
    return null;
  }
}

export class MemorySaveStore {
  private raw: string | null = null;

  async save(state: SaveInput, now = Date.now()): Promise<void> {
    this.raw = encodeSave(state, now);
  }

  async load(): Promise<GameState | null> {
    return this.raw ? decodeSave(this.raw) : null;
  }
}

export class IndexedDbSaveStore {
  constructor(private dbName = 'pocket-rpg', private key = 'save') {}

  private async db(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('saves')) req.result.createObjectStore('saves');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async save(state: SaveInput, now = Date.now()): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(encodeSave(state, now), this.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async load(): Promise<GameState | null> {
    const db = await this.db();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').get(this.key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return typeof raw === 'string' ? decodeSave(raw) : null;
  }
}
