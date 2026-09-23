import type { AttributeId } from "../types";

export type ItemRarity = "common" | "quality" | "rare" | "epic" | "unique";
export type EquipmentSlot = "mainHand" | "offHand" | "body" | "bag" | "amulet" | "ring" | "cloak";

export interface ItemRequirements {
  attributes?: Partial<Record<AttributeId, number>>;
  skills?: Record<string, number>;
}

export interface ItemDefinition {
  id: string;
  name: string;
  kind: "equipment" | "consumable" | "tool" | "bait" | "material";
  weight: number;
  stackable: boolean;
  slot?: EquipmentSlot;
  requirements?: ItemRequirements;
  baseStats?: Record<string, number>;
  tags?: string[];
  basePrice: number;
}

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  rarity: ItemRarity;
  upgradeLevel: 0 | 1 | 2 | 3 | 4 | 5;
  statRoll: number;
  properties: string[];
}

export const RARITY_STAT_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  quality: 1.12,
  rare: 1.25,
  epic: 1.4,
  unique: 1.6
};

export function upgradeMultiplier(level: number): number {
  return 1.25 ** Math.max(0, Math.min(5, Math.floor(level)));
}

export function effectiveItemStat(base: number, item: ItemInstance): number {
  return base * RARITY_STAT_MULTIPLIER[item.rarity] * item.statRoll * upgradeMultiplier(item.upgradeLevel);
}
