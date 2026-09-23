import type { SaveEnvelopeV1 } from "./schema";
import { parseSaveEnvelope } from "./schema";

export function migrateSave(value: unknown): SaveEnvelopeV1 | null {
  return parseSaveEnvelope(value);
}
