import { useEffect, useState } from "react";

import type { Coordinates } from "@/types";

export type GeolocationStatus = "idle" | "prompting" | "locating" | "ready" | "denied" | "unavailable";

export interface GeolocationFix {
  coords: Coordinates;
  accuracyMeters: number;
}

interface GeolocationState {
  coords: Coordinates | null;
  accuracyMeters: number | null;
  status: GeolocationStatus;
  error: string | null;
}

const POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0 };

const isSupported = () => typeof navigator !== "undefined" && "geolocation" in navigator;

const toFix = (position: GeolocationPosition): GeolocationFix => ({
  coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
  accuracyMeters: position.coords.accuracy,
});

const statusFromError = (error: GeolocationPositionError): GeolocationStatus =>
  error.code === error.PERMISSION_DENIED ? "denied" : "unavailable";

export type CurrentPositionResult = { ok: true; fix: GeolocationFix } | { ok: false; status: GeolocationStatus };

/** One-shot fix for user-initiated actions such as "Ustaw tutaj". Never rejects. */
export function requestCurrentPosition(): Promise<CurrentPositionResult> {
  return new Promise((resolve) => {
    if (!isSupported()) {
      resolve({ ok: false, status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ ok: true, fix: toFix(position) });
      },
      (error) => {
        resolve({ ok: false, status: statusFromError(error) });
      },
      { ...POSITION_OPTIONS, timeout: 30_000 },
    );
  });
}

export function useGeolocation({ watch = true }: { watch?: boolean } = {}): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    accuracyMeters: null,
    status: "locating",
    error: null,
  });

  useEffect(() => {
    if (!watch || !isSupported()) return;
    let active = true;

    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (active && permission.state === "prompt") {
          setState((current) => (current.status === "locating" ? { ...current, status: "prompting" } : current));
        }
      })
      .catch(() => undefined);

    // Without this cleanup the watcher keeps GPS on and drains the battery.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = toFix(position);
        setState({ coords: fix.coords, accuracyMeters: fix.accuracyMeters, status: "ready", error: null });
      },
      (error) => {
        setState((current) => ({ ...current, status: statusFromError(error), error: error.message }));
      },
      POSITION_OPTIONS,
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watch]);

  if (!isSupported()) return { ...state, status: "unavailable" };
  if (!watch) return { ...state, status: "idle" };
  return state;
}
