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
  LegacyGameStateV15,
  LegacyGameStateV16
} from '../game-core/game-state.js';

export interface SaveEnvelopeV1 {schemaVersion:1;savedAt:number;state:LegacyGameStateV1;}
export interface SaveEnvelopeV2 {schemaVersion:2;savedAt:number;state:LegacyGameStateV2;}
export interface SaveEnvelopeV3 {schemaVersion:3;savedAt:number;state:LegacyGameStateV3;}
export interface SaveEnvelopeV4 {schemaVersion:4;savedAt:number;state:LegacyGameStateV4;}
export interface SaveEnvelopeV5 {schemaVersion:5;savedAt:number;state:LegacyGameStateV5;}
export interface SaveEnvelopeV6 {schemaVersion:6;savedAt:number;state:LegacyGameStateV6;}
export interface SaveEnvelopeV7 {schemaVersion:7;savedAt:number;state:LegacyGameStateV7;}
export interface SaveEnvelopeV8 {schemaVersion:8;savedAt:number;state:LegacyGameStateV8;}
export interface SaveEnvelopeV9 {schemaVersion:9;savedAt:number;state:LegacyGameStateV9;}
export interface SaveEnvelopeV10 {schemaVersion:10;savedAt:number;state:LegacyGameStateV10;}
export interface SaveEnvelopeV11 {schemaVersion:11;savedAt:number;state:LegacyGameStateV11;}
export interface SaveEnvelopeV12 {schemaVersion:12;savedAt:number;state:LegacyGameStateV12;}
export interface SaveEnvelopeV13 {schemaVersion:13;savedAt:number;state:LegacyGameStateV13;}
export interface SaveEnvelopeV14 {schemaVersion:14;savedAt:number;state:LegacyGameStateV14;}
export interface SaveEnvelopeV15 {schemaVersion:15;savedAt:number;state:LegacyGameStateV15;}
export interface SaveEnvelopeV16 {schemaVersion:16;savedAt:number;state:LegacyGameStateV16;}
export interface SaveEnvelopeV17 {schemaVersion:17;savedAt:number;state:GameState;}

export type SaveEnvelope=
  |SaveEnvelopeV1|SaveEnvelopeV2|SaveEnvelopeV3|SaveEnvelopeV4
  |SaveEnvelopeV5|SaveEnvelopeV6|SaveEnvelopeV7|SaveEnvelopeV8|SaveEnvelopeV9|SaveEnvelopeV10|SaveEnvelopeV11|SaveEnvelopeV12|SaveEnvelopeV13|SaveEnvelopeV14|SaveEnvelopeV15|SaveEnvelopeV16|SaveEnvelopeV17;
