import type { GameState, LegacyGameStateV1 } from '../game-core/game-state.js';

export interface SaveEnvelopeV1 {
  schemaVersion: 1;
  savedAt: number;
  state: LegacyGameStateV1;
}

export interface SaveEnvelopeV2 {
  schemaVersion: 2;
  savedAt: number;
  state: GameState;
}

export type SaveEnvelope = SaveEnvelopeV1 | SaveEnvelopeV2;
