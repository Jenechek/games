import type { ItemDefinition } from "../game-core/items/items";

export const itemDefinitions: Record<string, ItemDefinition> = {
  "iron-short-sword": {
    id: "iron-short-sword", name: "Железный короткий меч", kind: "equipment", weight: 3, stackable: false,
    slot: "mainHand", requirements: { attributes: { strength: 12 }, skills: { "short-sword": 3 } },
    baseStats: { damage: 12, accuracy: 0.82 }, tags: ["weapon", "physical", "slashing"], basePrice: 60
  },
  "wooden-shield": {
    id: "wooden-shield", name: "Деревянный щит", kind: "equipment", weight: 4, stackable: false,
    slot: "offHand", requirements: { attributes: { strength: 11 } }, baseStats: { mitigation: 0.08, fullBlock: 0.12 },
    tags: ["shield"], basePrice: 45
  },
  "cloth-vest": {
    id: "cloth-vest", name: "Полотняная накидка", kind: "equipment", weight: 1, stackable: false,
    slot: "body", baseStats: { mitigation: 0.02, fishing: 0.05 }, tags: ["light-armor", "peaceful"], basePrice: 25
  },
  "iron-cuirass": {
    id: "iron-cuirass", name: "Железная кираса", kind: "equipment", weight: 9, stackable: false,
    slot: "body", requirements: { attributes: { strength: 16, vitality: 13 }, skills: { "armor": 5 } },
    baseStats: { mitigation: 0.16 }, tags: ["heavy-armor"], basePrice: 120
  },
  "traveler-bag": {
    id: "traveler-bag", name: "Дорожная сумка", kind: "equipment", weight: 1, stackable: false,
    slot: "bag", baseStats: { capacity: 25 }, tags: ["bag"], basePrice: 35
  },
  "healing-potion": {
    id: "healing-potion", name: "Лечебное зелье", kind: "consumable", weight: 0.25, stackable: true,
    baseStats: { heal: 25 }, tags: ["healing"], basePrice: 12
  },
  "simple-fishing-rod": {
    id: "simple-fishing-rod", name: "Простая удочка", kind: "tool", weight: 1.5, stackable: false,
    requirements: { skills: { fishing: 0 } }, baseStats: { fishingQuality: 0.02, fishingSpeed: 0 }, tags: ["fishing-tool"], basePrice: 20
  },
  "sturdy-fishing-rod": {
    id: "sturdy-fishing-rod", name: "Крепкая удочка", kind: "tool", weight: 1.8, stackable: false,
    requirements: { skills: { fishing: 20 } }, baseStats: { fishingQuality: 0.08, fishingSpeed: 0.12 }, tags: ["fishing-tool"], basePrice: 80
  }
};
