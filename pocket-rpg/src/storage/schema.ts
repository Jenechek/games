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

export interface SaveEnvelopeV1 {schemaVersion:1;savedAt:number;state:LegacyGameStateV1;}
export interface SaveEnvelopeV2 {schemaVersion:2;savedAt:number;state:LegacyGameStateV2;}
export interface SaveEnvelopeV3 {schemaVersion:3;savedAt:number;state:LegacyGameStateV3;}
export interface SaveEnvelopeV4 {schemaVersion:4;savedAt:number;state:LegacyGameStateV4;}
export interface SaveEnvelopeV5 {schemaVersion:5;savedAt:number;state:LegacyGameStateV5;}
export interface SaveEnvelopeV6 {schemaVersion:6;savedAt:number;state:LegacyGameStateV6;}
export interface SaveEnvelopeV7 {schemaVersion:7;savedAt:number;state:LegacyGameStateV7;}
export interface SaveEnvelopeV8 {schemaVersion:8;savedAt:number;state:GameState;}

export type SaveEnvelope=
  |SaveEnvelopeV1|SaveEnvelopeV2|SaveEnvelopeV3|SaveEnvelopeV4
  |SaveEnvelopeV5|SaveEnvelopeV6|SaveEnvelopeV7|SaveEnvelopeV8;
