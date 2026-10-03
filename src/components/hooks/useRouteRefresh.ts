import { useCallback, useEffect, useRef, useState } from "react";

import { requestCurrentPosition } from "@/components/hooks/useGeolocation";
import { loadShelters, needsRefresh, refreshRoutes, ROUTE_MAX_AGE_MS } from "@/lib/services/route-refresh";
import { walkingRouter } from "@/lib/services/routing";
import { readNavigation, writeNavigation } from "@/lib/services/navigation-storage";
import { saveLastKnownPosition } from "@/lib/services/plan-storage";
import type { NavigationState } from "@/types";

const fetchJson = async (url: string): Promise<unknown> => (await fetch(url)).json();

/** Without the Permissions API (iOS < 16) the earlier consent, given by a gesture, stands in for "granted" (review F8). */
async function locationGranted(): Promise<boolean> {
  if (!("permissions" in navigator)) return true;
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch {
    return true;
  }
}

export interface RouteRefresh {
  state: NavigationState;
  refreshing: boolean;
  online: boolean;
  /** From the consent button: records consent and refreshes right away (the location prompt comes from this gesture). */
  consentAndRefresh: () => Promise<void>;
}

/**
 * Keeps routes A/B fresh while the app is open — the realistic substitute for "every ~30 minutes" (PRD FR-007):
 * on open, on return to the app, when the network comes back, every 30 min, and after moving more than 300 m.
 */
export function useRouteRefresh(): RouteRefresh {
  const [state, setState] = useState(readNavigation);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const busy = useRef(false);

  const run = useCallback(async (force: boolean) => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const current = readNavigation();
      const position = await requestCurrentPosition();
      if (!position.ok) {
        const next: NavigationState = {
          ...current,
          lastRefresh: { at: new Date().toISOString(), ok: false, reason: "no-position" },
        };
        writeNavigation(next);
        setState(next);
        return;
      }
      saveLastKnownPosition(position.fix.coords);
      if (!force && !needsRefresh(current, position.fix.coords, Date.now())) return;
      const next = await refreshRoutes({
        previous: current,
        origin: position.fix.coords,
        router: walkingRouter,
        shelters: await loadShelters(fetchJson),
      });
      writeNavigation(next);
      setState(next);
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  const consentAndRefresh = useCallback(async () => {
    const next = { ...readNavigation(), routingConsent: true };
    writeNavigation(next);
    setState(next);
    await run(true);
  }, [run]);

  useEffect(() => {
    if (!state.routingConsent) return;
    const maybeRefresh = () => {
      void locationGranted().then((granted) => {
        if (granted) void run(false);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };
    const onOnline = () => {
      setOnline(true);
      maybeRefresh();
    };
    const onOffline = () => {
      setOnline(false);
    };
    maybeRefresh();
    const timer = window.setInterval(maybeRefresh, ROUTE_MAX_AGE_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [state.routingConsent, run]);

  return { state, refreshing, online, consentAndRefresh };
}
