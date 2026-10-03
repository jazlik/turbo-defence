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

export interface HouseholdMember {
  id: string;
  name: string;
  category: MemberCategory;
  takesMedication: boolean;
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
