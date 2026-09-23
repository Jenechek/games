import type { SaveEnvelopeV1 } from './schema.js';
export function migrateSave(value:unknown):SaveEnvelopeV1|null {
  if(!value || typeof value!=='object') return null;
  const x=value as Partial<SaveEnvelopeV1>;
  if(x.schemaVersion!==1 || !x.state || typeof x.savedAt!=='number') return null;
  return x as SaveEnvelopeV1;
}
