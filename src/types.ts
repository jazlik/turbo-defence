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
  schemaVersion: 2;
  evacuationPoint: EvacuationPoint | null;
  lastKnownPosition: LastKnownPosition | null;
  members: HouseholdMember[];
  contacts: EmergencyContact[];
  /** ISO 8601 */
  updatedAt: string;
}
