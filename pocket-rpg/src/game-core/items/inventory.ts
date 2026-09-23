import type { ItemDefinition, ItemInstance, EquipmentSlot } from "./items";

export interface InventoryState {
  instances: ItemInstance[];
  stacks: Record<string, number>;
  equipped: Partial<Record<EquipmentSlot, string>>;
}

export function inventoryMass(state: InventoryState, definitions: Record<string, ItemDefinition>): number {
  const equippedIds = new Set(Object.values(state.equipped).filter(Boolean));
  let mass = 0;
  for (const item of state.instances) {
    if (equippedIds.has(item.instanceId)) continue;
    mass += definitions[item.definitionId]?.weight ?? 0;
  }
  for (const [itemId, quantity] of Object.entries(state.stacks)) {
    mass += (definitions[itemId]?.weight ?? 0) * Math.max(0, quantity);
  }
  return mass;
}

export function carryingCapacity(strength: number, vitality: number, bagBonus = 0): number {
  return 20 + Math.max(0, strength) * 1.5 + Math.max(0, vitality) + Math.max(0, bagBonus);
}

export function overloadRatio(mass: number, capacity: number): number {
  return capacity <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, mass) / capacity;
}

export function combatEfficiencyMultiplier(ratio: number): number {
  if (ratio <= 1) return 1;
  return Math.max(0, 1 - (ratio - 1));
}

export function travelTimeMultiplier(ratio: number): number {
  return ratio <= 1 ? 1 : ratio;
}

export function canStartPeacefulActivity(mass: number, capacity: number): boolean {
  return overloadRatio(mass, capacity) < 1.2;
}
