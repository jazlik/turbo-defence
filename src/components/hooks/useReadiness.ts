import { useEffect, useState } from "react";

import { useMapFile } from "@/components/hooks/useMapFile";
import { useOfflineShell } from "@/components/hooks/useOfflineShell";
import { useMapPackage, type MapPackage } from "@/components/hooks/useMapPackage";
import { useRouteRefresh, type RouteRefresh } from "@/components/hooks/useRouteRefresh";
import { computeReadiness, type Readiness } from "@/lib/readiness";
import { installState } from "@/lib/services/install";
import { readPlanResult } from "@/lib/services/plan-storage";
import { readSensors } from "@/lib/services/sensor-storage";

const readStored = () => {
  const { plan, source } = readPlanResult();
  return { plan, planSource: source, sensors: readSensors(), install: installState() };
};

/**
 * Gathers every source of readiness and returns the derived result.
 *
 * It also keeps the two background duties that used to live in the cards on the home page alive: refreshing the
 * saved route while the app is open (PRD FR-007) and resuming an interrupted map download. Without these hooks
 * mounted on `/`, taking the cards off the page would silently stop both.
 */
export function useReadiness(): Readiness & { mapSetup: MapPackage; routeSetup: RouteRefresh } {
  const routeSetup = useRouteRefresh();
  const mapSetup = useMapPackage(true);
  const { state: navigation } = routeSetup;
  const { state: map } = mapSetup;
  const mapFile = useMapFile(map);
  const shell = useOfflineShell();
  const [, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setVersion((current) => current + 1);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // A page restored from the back-forward cache keeps stale hook state; reloading is simpler than patching it.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Read on every render on purpose: the route refresh also writes the last known position into the plan, so the
  // plan must be fresh whenever the route or the map state changes, not only on the events above. A render happens
  // only when one of these changes (or after the counter above is bumped), and the read is a few KB of JSON.
  return { ...computeReadiness({ ...readStored(), navigation, map, mapFile, shell }), mapSetup, routeSetup };
}
