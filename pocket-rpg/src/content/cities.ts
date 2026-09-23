export interface CityDefinition {
  id: string;
  name: string;
  basePriceMultiplier: number;
  factionId: string | null;
}

export const cityDefinitions: Record<string, CityDefinition> = {
  tillanium: { id: "tillanium", name: "Тилланиум", basePriceMultiplier: 1, factionId: null }
};
