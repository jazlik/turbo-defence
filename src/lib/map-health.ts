import { isMapReady, type MapPackageState } from "@/lib/services/map-storage";

/** What was found on disk for a package flagged ready: `unknown` until the (async) OPFS check has answered. */
export type MapFileCheck = "unknown" | "present" | "missing";

export type MapHealth = "none" | "downloading" | "failed" | "ready" | "file-missing";

/**
 * The single answer to "does the offline map work": the `wrw.map` flag alone is not enough, because the phone may
 * evict OPFS after the download. Every screen that shows the map state goes through this.
 */
export function mapHealth(map: MapPackageState | null, file: MapFileCheck): MapHealth {
  if (map === null) return "none";
  if (map.status === "downloading") return "downloading";
  if (map.status === "failed") return "failed";
  return file === "missing" ? "file-missing" : "ready";
}

export const isMapUsable = (map: MapPackageState | null, file: MapFileCheck): map is MapPackageState =>
  isMapReady(map) && file !== "missing";
