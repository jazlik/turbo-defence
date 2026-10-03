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

export interface HouseholdPlan {
  schemaVersion: 3;
  places: Record<PlaceKind, Place | null>;
  lastKnownPosition: LastKnownPosition | null;
  members: HouseholdMember[];
  contacts: EmergencyContact[];
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
