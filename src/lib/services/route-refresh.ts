import { distanceMeters } from "@/lib/geo";
import { isRecord } from "@/lib/services/plan-storage";
import { activeRoute } from "@/lib/services/navigation-storage";
import { parseShelterRows, pickDestinations, shortlist, toDestination, type ShelterPoint } from "@/lib/shelters";
import type { Coordinates, NavigationState, RouteRefreshFailure, SavedRoute } from "@/types";

import { RoutingError, type WalkingRouter } from "./routing/types";

/** Browsers give a closed PWA no background time, so "every ~30 min" means: while the app is open (PRD FR-007). */
export const ROUTE_MAX_AGE_MS = 30 * 60 * 1000;
export const ROUTE_MOVE_REFRESH_METERS = 300;
/** FOSSGIS policy: at most one request per second. */
export const ROUTER_REQUEST_GAP_MS = 1100;

export const SHELTERS_URL = "/data/shelters-malopolska.json";

export function needsRefresh(state: NavigationState, position: Coordinates | null, now: number): boolean {
  const route = state.primary;
  if (!route) return true;
  if (now - Date.parse(route.createdAt) >= ROUTE_MAX_AGE_MS) return true;
  return position !== null && distanceMeters(position, route.origin) > ROUTE_MOVE_REFRESH_METERS;
}

export async function loadShelters(fetchJson: (url: string) => Promise<unknown>): Promise<ShelterPoint[]> {
  const snapshot = await fetchJson(SHELTERS_URL);
  return isRecord(snapshot) ? parseShelterRows(snapshot.points) : [];
}

const failed = (state: NavigationState, at: string, reason: RouteRefreshFailure): NavigationState => ({
  ...state,
  lastRefresh: { at, ok: false, reason },
});

interface RefreshOptions {
  previous: NavigationState;
  origin: Coordinates;
  router: WalkingRouter;
  shelters: ShelterPoint[];
  now?: Date;
  pause?: (ms: number) => Promise<void>;
}

/**
 * Online preparation: local shortlist → walking matrix → A/B → routes, sequential and paced for the public router.
 * Returns the next state and never throws: on failure the previous routes stay, with the reason recorded.
 */
export async function refreshRoutes({
  previous,
  origin,
  router,
  shelters,
  now = new Date(),
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: RefreshOptions): Promise<NavigationState> {
  const at = now.toISOString();
  const candidates = shortlist(shelters, origin);
  if (candidates.length === 0) return failed(previous, at, "no-candidates");

  try {
    const seconds = await router.matrix(
      origin,
      candidates.map((candidate) => candidate.coords),
    );
    const previousId = previous.primary?.destination.source === "psp" ? previous.primary.destination.id : null;
    const picked = pickDestinations(candidates, seconds, previousId);
    if (!picked) return failed(previous, at, "no-candidates");

    const toSaved = async (target: typeof picked.primary): Promise<SavedRoute> => {
      await pause(ROUTER_REQUEST_GAP_MS);
      const route = await router.route(origin, target.coords);
      return { destination: toDestination(target), origin, ...route, createdAt: at, provider: router.id };
    };
    const primary = await toSaved(picked.primary);
    // B is a convenience: losing it must not discard a fresh A.
    const alternate = picked.alternate ? await toSaved(picked.alternate).catch(() => null) : null;
    return { ...previous, primary, alternate, active: "primary", lastRefresh: { at, ok: true } };
  } catch (error) {
    if (error instanceof RoutingError) return failed(previous, at, "routing-error");
    throw error;
  }
}

/** Online off-route recovery in Execution Mode (P1): only after this long off the route… */
export const REROUTE_AFTER_OFF_ROUTE_MS = 15_000;
/** …and not more often than this, to respect the public router. */
export const REROUTE_MIN_INTERVAL_MS = 60_000;

/**
 * New route from where the user is now to the SAME destination — never a new destination choice during a crisis.
 * Returns the previous state with the reason recorded when routing fails.
 */
export async function rerouteActive({
  previous,
  origin,
  router,
  now = new Date(),
}: Omit<RefreshOptions, "shelters" | "pause">): Promise<NavigationState> {
  const at = now.toISOString();
  const current = activeRoute(previous);
  if (!current) return previous;
  try {
    const route = await router.route(origin, current.destination.coords);
    const next: SavedRoute = { ...current, origin, ...route, createdAt: at, provider: router.id };
    const role = previous.active === "alternate" && previous.alternate ? "alternate" : "primary";
    return { ...previous, [role]: next, lastRefresh: { at, ok: true } };
  } catch (error) {
    if (error instanceof RoutingError) return failed(previous, at, "routing-error");
    throw error;
  }
}
