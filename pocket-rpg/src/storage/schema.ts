import type { GameState } from '../game-core/game-state.js';
export interface SaveEnvelopeV1 { schemaVersion:1; savedAt:number; state:GameState; }
