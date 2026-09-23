import type { SeededRng } from "../rng";
import type { InventoryState } from "../items/inventory";
import type { ItemInstance, ItemRarity } from "../items/items";
import { itemDefinitions } from "../../content/items";

export interface DropEntry { itemId: string; chance: number; }
export interface LootEnemy { id: string; gold: [number, number]; drops?: DropEntry[]; }
export interface LootItem { dropId: string; itemId: string; instance?: ItemInstance; }
export interface LootResult { gold: number; items: LootItem[]; }

export function adjustedDropChance(base: number, luck: number): number {
  const bonus = Math.max(0, luck - 10) * 0.0025;
  return Math.min(1, Math.max(0, base) * (1 + Math.min(0.25, bonus)));
}

function rollRarity(luck: number, rng: SeededRng): ItemRarity {
  const shift = Math.min(0.04, Math.max(0, luck - 10) * 0.0005);
  const roll = rng.next();
  const unique = 0.005 + shift * 0.08;
  const epic = 0.035 + shift * 0.22;
  const rare = 0.09 + shift * 0.7;
  const quality = 0.22 + shift;
  if (roll < unique) return "unique";
  if (roll < unique + epic) return "epic";
  if (roll < unique + epic + rare) return "rare";
  if (roll < unique + epic + rare + quality) return "quality";
  return "common";
}

export function rollLoot(enemy: LootEnemy, luck: number, rng: SeededRng): LootResult {
  const gold = rng.int(enemy.gold[0], enemy.gold[1]);
  const items: LootItem[] = [];
  let index = 0;
  for (const drop of enemy.drops ?? []) {
    if (!rng.chance(adjustedDropChance(drop.chance, luck))) continue;
    const definition = itemDefinitions[drop.itemId];
    if (!definition) continue;
    const dropId = `${enemy.id}:${index++}:${Math.floor(rng.next() * 1_000_000)}`;
    if (definition.stackable) {
      items.push({ dropId, itemId: drop.itemId });
    } else {
      const rarity = rollRarity(luck, rng);
      const inherentProperties = rarity === "unique" ? 2 : rarity === "rare" || rarity === "epic" ? 1 : 0;
      items.push({
        dropId,
        itemId: drop.itemId,
        instance: {
          instanceId: `loot-${dropId}`,
          definitionId: drop.itemId,
          rarity,
          upgradeLevel: rng.int(0, 5) as 0 | 1 | 2 | 3 | 4 | 5,
          statRoll: 0.97 + rng.next() * 0.06,
          properties: Array.from({ length: inherentProperties }, (_, propertyIndex) => `property-${propertyIndex + 1}`)
        }
      });
    }
  }
  return { gold, items };
}

export function acceptLootItems(inventory: InventoryState, items: LootItem[], selectedDropIds: string[]): InventoryState {
  const selected = new Set(selectedDropIds);
  const next: InventoryState = {
    instances: [...inventory.instances],
    stacks: { ...inventory.stacks },
    equipped: { ...inventory.equipped }
  };
  for (const item of items) {
    if (!selected.has(item.dropId)) continue;
    if (item.instance) next.instances.push(item.instance);
    else next.stacks[item.itemId] = (next.stacks[item.itemId] ?? 0) + 1;
  }
  return next;
}

export function victoryXp(enemyLevel: number, playerLevel: number): number {
  const difficulty = Math.min(1.5, Math.max(0.5, 1 + (enemyLevel - playerLevel) * 0.05));
  return 40 * difficulty;
}
