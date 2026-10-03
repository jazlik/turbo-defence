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

/** GeoJSON order [longitude, latitude] — used only inside route geometry, consumed by Turf and MapLibre. */
export type LngLat = [number, number];

export interface Destination {
  /** PSP "Identyfikator publiczny", or "manual" for the organiser's own point. */
  id: string;
  label: string;
  coords: Coordinates;
  source: "psp" | "manual";
  address?: string;
  /** PSP "Dostepnosc", shown as-is. */
  availability?: string;
}

/** A walking route saved while online; provider-independent so guidance never depends on a routing API. */
export interface SavedRoute {
  destination: Destination;
  /** Where the route was computed from. */
  origin: Coordinates;
  /** At least two points. */
  geometry: LngLat[];
  distanceMeters: number;
  durationSeconds: number | null;
  /** ISO 8601 — route freshness shown in the UI. */
  createdAt: string;
  /** Informational only, e.g. "osrm-fossgis-foot". */
  provider: string;
}

export type RouteRole = "primary" | "alternate";

export type RouteRefreshFailure = "offline" | "no-position" | "no-candidates" | "routing-error";

/** Device state, not part of the shared household plan: routes are computed from where this phone is. */
export interface NavigationState {
  schemaVersion: 1;
  primary: SavedRoute | null;
  alternate: SavedRoute | null;
  /** S-02 "niedostępne" switches this to "alternate". */
  active: RouteRole;
  /** The user agreed to send coordinates to the routing service. */
  routingConsent: boolean;
  lastRefresh: { at: string; ok: boolean; reason?: RouteRefreshFailure } | null;
}
