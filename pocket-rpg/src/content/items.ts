import type { ItemDefinition } from "../game-core/items/items";

export const itemDefinitions: Record<string, ItemDefinition> = {
  "bread-bait": { id: "bread-bait", name: "Хлебная наживка", kind: "bait", weight: 0.1, stackable: false, tags: ["fishing-bait"], basePrice: 4 },
  "worm-bait": { id: "worm-bait", name: "Червь", kind: "bait", weight: 0.1, stackable: false, tags: ["fishing-bait"], basePrice: 6 },
  "silver-carp": { id: "silver-carp", name: "Серебряный карась", kind: "material", weight: 1.2, stackable: true, basePrice: 9 },
  "silver-carp-rare": { id: "silver-carp-rare", name: "Серебряный карась (редкий)", kind: "material", weight: 1.2, stackable: true, basePrice: 22 },
  "river-perch": { id: "river-perch", name: "Речной окунь", kind: "material", weight: 0.9, stackable: true, basePrice: 7 },
  "river-perch-rare": { id: "river-perch-rare", name: "Речной окунь (редкий)", kind: "material", weight: 0.9, stackable: true, basePrice: 18 },
  "black-bream": { id: "black-bream", name: "Чёрный лещ", kind: "material", weight: 1.6, stackable: true, basePrice: 18 },
  "black-bream-rare": { id: "black-bream-rare", name: "Чёрный лещ (редкий)", kind: "material", weight: 1.6, stackable: true, basePrice: 40 },
  "moon-carp": { id: "moon-carp", name: "Лунный карась", kind: "material", weight: 1.1, stackable: true, basePrice: 35 },
  "moon-carp-rare": { id: "moon-carp-rare", name: "Лунный карась (редкий)", kind: "material", weight: 1.1, stackable: true, basePrice: 75 },
  "wolf-pelt": { id: "wolf-pelt", name: "Волчья шкура", kind: "material", weight: 1, stackable: true, basePrice: 8 },
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
