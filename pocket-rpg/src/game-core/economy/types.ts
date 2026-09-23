export interface MarketPressure {
  multiplier: number;
  updatedAt: number;
}

export interface MarketState {
  pressure: Record<string, MarketPressure>;
}
