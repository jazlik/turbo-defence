import type { Coordinates, LngLat } from "@/types";

export interface WalkingRoute {
  geometry: LngLat[];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * The only boundary that knows a routing API. Guidance never imports from here: it reads SavedRoute only.
 * Only coordinates are sent — the origin and candidate points — never plan or household data (PRD NFR exception).
 */
export interface WalkingRouter {
  /** Informational id stored on SavedRoute.provider. */
  id: string;
  /** Walking seconds from origin to each target, null where unreachable. */
  matrix(origin: Coordinates, targets: Coordinates[]): Promise<(number | null)[]>;
  route(origin: Coordinates, target: Coordinates): Promise<WalkingRoute>;
}

export class RoutingError extends Error {}
