export interface TravelState {
  fromLocationId: string;
  toLocationId: string;
  startedAt: number;
  arrivesAt: number;
}

export interface WorldState {
  currentLocationId: string;
  visitedLocationIds: string[];
  travel: TravelState | null;
  arrivalCount: number;
}
