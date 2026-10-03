export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EvacuationPoint {
  label: string;
  coords: Coordinates;
}

export interface LastKnownPosition {
  coords: Coordinates;
  /** ISO 8601 */
  recordedAt: string;
}

export interface HouseholdPlan {
  schemaVersion: 1;
  evacuationPoint: EvacuationPoint | null;
  lastKnownPosition: LastKnownPosition | null;
  /** ISO 8601 */
  updatedAt: string;
}
