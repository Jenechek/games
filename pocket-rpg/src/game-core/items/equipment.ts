import type { Attributes } from "../progression/character";
import type { ItemDefinition } from "./items";

export interface EquipCheck {
  ok: boolean;
  reasons: string[];
}

export function canEquip(attributes: Attributes, skills: Record<string, number>, item: ItemDefinition): EquipCheck {
  const reasons: string[] = [];
  for (const [attribute, required] of Object.entries(item.requirements?.attributes ?? {})) {
    if ((attributes[attribute as keyof Attributes] ?? 0) < (required ?? 0)) reasons.push(`attribute:${attribute}`);
  }
  for (const [skill, required] of Object.entries(item.requirements?.skills ?? {})) {
    if ((skills[skill] ?? 0) < required) reasons.push(`skill:${skill}`);
  }
  return { ok: reasons.length === 0, reasons };
}
