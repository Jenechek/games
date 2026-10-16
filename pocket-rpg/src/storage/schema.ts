import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2
} from '../game-core/game-state.js';

export interface SaveEnvelopeV1 {
  schemaVersion: 1;
  savedAt: number;
  state: LegacyGameStateV1;
}

export interface SaveEnvelopeV2 {
  schemaVersion: 2;
  savedAt: number;
  state: LegacyGameStateV2;
}

export interface SaveEnvelopeV3 {
  schemaVersion: 3;
  savedAt: number;
  state: GameState;
}

export type SaveEnvelope = SaveEnvelopeV1 | SaveEnvelopeV2 | SaveEnvelopeV3;
