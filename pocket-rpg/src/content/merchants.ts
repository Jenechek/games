export interface MerchantDefinition {
  id: string;
  cityId: string;
  name: string;
  sells: string[];
}

export const merchantDefinitions: Record<string, MerchantDefinition> = {
  "tillanium-general": {
    id: "tillanium-general",
    cityId: "tillanium",
    name: "Торговец Тилланиума",
    sells: ["healing-potion", "bread-bait", "worm-bait", "simple-fishing-rod", "sturdy-fishing-rod", "cloth-vest", "iron-short-sword", "wooden-shield", "traveler-bag"]
  }
};
