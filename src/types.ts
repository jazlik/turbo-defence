export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Trzy miejsca planu: punkt zbiórki, jego zamiennik i docelowy punkt ewakuacji (FR-004). */
export type PlaceKind = "meeting" | "backup" | "shelter";

export interface Place {
  label: string;
  coords: Coordinates;
}

export interface LastKnownPosition {
  coords: Coordinates;
  /** ISO 8601 */
  recordedAt: string;
}

export interface HouseholdPlan {
  schemaVersion: 2;
  places: Record<PlaceKind, Place | null>;
  lastKnownPosition: LastKnownPosition | null;
  /** ISO 8601 */
  updatedAt: string;
}

export interface EvacuationRun {
  schemaVersion: 1;
  /** Identyfikator kroku, nie indeks — plan mógł się zmienić między przebiegami. */
  stepId: string;
  fallbackActive: boolean;
  /** ISO 8601 */
  startedAt: string;
  /** ISO 8601 — od tego liczy się próg świeżości */
  updatedAt: string;
}
