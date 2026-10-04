export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  label: string;
  coords: Coordinates;
}

export interface LastKnownPosition {
  coords: Coordinates;
  /** ISO 8601 */
  recordedAt: string;
}

export type MemberCategory = "adult" | "child" | "pet";

/** Presets carry a stable kind so S-06 can map them to backpack items. */
export type PresetNeedKind = "medication" | "diabetes" | "allergy" | "mobility" | "diet";

export type MemberNeed = { kind: PresetNeedKind } | { kind: "custom"; label: string };

export interface HouseholdMember {
  id: string;
  name: string;
  category: MemberCategory;
  needs: MemberNeed[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  /** Empty string when not given. */
  relation: string;
}

/** A backpack item ticked off, with the quantity it was packed for; `null` for items without a quantity. */
export interface PackedItem {
  itemId: string;
  quantity: number | null;
}

export interface HouseholdPlan {
  schemaVersion: 5;
  /** Własny schron organizatora — cel alarmu, gdy nie ma przygotowanej trasy do schronu PSP (FR-004). */
  shelter: Place | null;
  lastKnownPosition: LastKnownPosition | null;
  members: HouseholdMember[];
  contacts: EmergencyContact[];
  packedItems: PackedItem[];
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
