import { useEffect, useState } from "react";

import { bearingDegrees, distanceMeters } from "@/lib/geo";
import type { Coordinates } from "@/types";

export type HeadingSource = "compass" | "movement";

// iOS Safari exposes the compass heading outside lib.dom; iOS 13+ also gates the sensor behind requestPermission.
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const PERMISSION_GRANTED_EVENT = "wrw:heading-permission-granted";
// GPS noise is 5–20 m; a smaller step would spin the arrow of someone standing still.
const MIN_MOVEMENT_METERS = 10;
// Orientation events stream continuously while the sensor works; silence this long means it stalled or lost permission.
const COMPASS_SILENCE_MS = 2000;

export function headingPermissionRequired(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as OrientationEventWithPermission).requestPermission === "function"
  );
}

/** Must be called directly from a user gesture handler — iOS rejects it anywhere else. */
export async function requestHeadingPermission(): Promise<PermissionState> {
  if (typeof DeviceOrientationEvent === "undefined") return "denied";
  const { requestPermission } = DeviceOrientationEvent as OrientationEventWithPermission;
  if (typeof requestPermission !== "function") return "granted";
  try {
    const state = await requestPermission();
    if (state === "granted") window.dispatchEvent(new Event(PERMISSION_GRANTED_EVENT));
    return state;
  } catch {
    return "denied";
  }
}

function useCompassHeading(): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    // Chromium/Android: "deviceorientationabsolute" with alpha counted counter-clockwise from north.
    // iOS Safari: plain "deviceorientation" carrying webkitCompassHeading (clockwise from north).
    // Plain "deviceorientation" alpha elsewhere is relative to an arbitrary start, so it is ignored.
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    let silenceTimer: number | undefined;

    const onOrientation = (event: Event) => {
      const { webkitCompassHeading, alpha } = event as CompassEvent;
      let next: number;
      if (typeof webkitCompassHeading === "number") next = webkitCompassHeading;
      else if (eventName === "deviceorientationabsolute" && alpha !== null) next = (360 - alpha) % 360;
      else return;
      const rounded = Math.round(next) % 360;
      setHeading((current) => (current === rounded ? current : rounded));
      // A stalled compass must not freeze the arrow: drop it so the movement fallback takes over.
      window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(() => {
        setHeading(null);
      }, COMPASS_SILENCE_MS);
    };

    const attach = () => {
      window.removeEventListener(eventName, onOrientation);
      window.addEventListener(eventName, onOrientation);
    };

    attach();
    // Re-attach after an iOS permission grant so events start flowing without a reload.
    window.addEventListener(PERMISSION_GRANTED_EVENT, attach);
    return () => {
      window.clearTimeout(silenceTimer);
      window.removeEventListener(eventName, onOrientation);
      window.removeEventListener(PERMISSION_GRANTED_EVENT, attach);
    };
  }, []);

  return heading;
}

interface MovementState {
  reference: Coordinates | null;
  heading: number | null;
}

export function useHeading(
  coords: Coordinates | null,
  accuracyMeters: number | null,
): { heading: number | null; source: HeadingSource | null } {
  const compassHeading = useCompassHeading();
  const [movement, setMovement] = useState<MovementState>({ reference: null, heading: null });

  // Derived from previous renders: move the reference point only once the user has clearly walked away from it.
  if (coords) {
    if (movement.reference === null) {
      setMovement({ reference: coords, heading: null });
    } else if (distanceMeters(movement.reference, coords) > Math.max(MIN_MOVEMENT_METERS, accuracyMeters ?? 0)) {
      setMovement({ reference: coords, heading: bearingDegrees(movement.reference, coords) });
    }
  }

  if (compassHeading !== null) return { heading: compassHeading, source: "compass" };
  if (movement.heading !== null) return { heading: movement.heading, source: "movement" };
  return { heading: null, source: null };
}
