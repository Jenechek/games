import type { AttributeId } from '../types.js';

export interface AttributeRetraining {
  from:AttributeId;
  to:AttributeId;
  percent:number;
  amount:number;
  startedAt:number;
  completesAt:number;
}

export interface UniversityState {
  pending:AttributeRetraining|null;
}

export interface RetrainingPreview {
  donorSpecialization:number;
  totalSpecialization:number;
  protectedByTwentyPercent:number;
  fivePercentFloor:number;
  transferable:number;
  amount:number;
}
