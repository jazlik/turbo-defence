import { refreshRoutes } from "@/lib/services/route-refresh";
import type { WalkingRouter } from "@/lib/services/routing/types";
import { shortlist, toDestination, type ShelterPoint } from "@/lib/shelters";
import type { Coordinates, Destination, NavigationState } from "@/types";

/** In a crisis a slow public router must not hold the user: past this, guide straight to the nearest point. */
export const EMERGENCY_ROUTING_TIMEOUT_MS = 15_000;

export type EmergencyOutcome =
  /** Online: a walking route to the nearest PSP shelter was prepared and saved — normal guidance from here. */
  | { kind: "route"; navigation: NavigationState }
  /** Offline or routing failed: the nearest PSP point from the local snapshot, guided in a straight line. */
  | { kind: "direct"; destination: Destination }
  | { kind: "none"; reason: "no-candidates" };

interface EmergencyOptions {
  previous: NavigationState;
  origin: Coordinates;
  shelters: ShelterPoint[];
  online: boolean;
  router: WalkingRouter;
  timeoutMs?: number;
  now?: Date;
}

/**
 * Alarm started without a prepared target: find one now with what the phone has. Online it reuses the normal
 * preparation (PSP shortlist → walking matrix → routes); offline it never pretends to route — it picks the nearest
 * PSP point by straight-line distance for S-01 direct-bearing guidance.
 */
export async function findEmergencyTarget({
  previous,
  origin,
  shelters,
  online,
  router,
  timeoutMs = EMERGENCY_ROUTING_TIMEOUT_MS,
  now,
}: EmergencyOptions): Promise<EmergencyOutcome> {
  const candidates = shortlist(shelters, origin);
  const nearest = candidates.at(0);
  if (!nearest) return { kind: "none", reason: "no-candidates" };

  if (online) {
    // The tap on "Znajdź" covers this one routing request only: standing consent (background refresh from Home)
    // stays whatever the user chose in setup.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timedOut = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          resolve(null);
        }, timeoutMs);
      });
      const navigation = await Promise.race([refreshRoutes({ previous, origin, router, shelters, now }), timedOut]);
      if (navigation?.primary) return { kind: "route", navigation };
    } catch {
      // Any failure while routing — not only RoutingError — must still leave the user with a direction.
    } finally {
      clearTimeout(timer);
    }
  }
  return { kind: "direct", destination: toDestination(nearest) };
}
