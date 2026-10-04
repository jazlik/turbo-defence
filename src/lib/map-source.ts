import { MAP_REGIONS, regionCovering, type MapRegion } from "@/lib/map-regions";
import { isMapReady, type MapPackageState } from "@/lib/services/map-storage";
import type { Coordinates } from "@/types";

/** Where the place-picker map reads tiles from, and where it opens. */
export type MapSource =
  | { kind: "local"; fileName: string; center: Coordinates }
  | { kind: "remote"; url: string; center: Coordinates }
  | { kind: "none"; reason: "offline-no-package" | "outside-region" };

const regionCenter = ({ bounds: [west, south, east, north] }: MapRegion): Coordinates => ({
  latitude: (south + north) / 2,
  longitude: (west + east) / 2,
});

/**
 * A downloaded package always wins: it works offline and costs no transfer. Otherwise the package on R2 is read
 * remotely (HTTP Range), which needs a connection and a region covering the start point. `center` is the
 * start point — the saved shelter, then the last known position — or null, which opens the region's middle.
 */
export function pickMapSource({
  mapPackage,
  online,
  center,
}: {
  mapPackage: MapPackageState | null;
  online: boolean;
  center: Coordinates | null;
}): MapSource {
  if (isMapReady(mapPackage)) {
    const region = MAP_REGIONS.find((candidate) => candidate.id === mapPackage.regionId) ?? MAP_REGIONS[0];
    return { kind: "local", fileName: mapPackage.fileName, center: center ?? regionCenter(region) };
  }
  if (!online) return { kind: "none", reason: "offline-no-package" };
  const region = center ? regionCovering(center) : MAP_REGIONS[0];
  if (!region) return { kind: "none", reason: "outside-region" };
  return { kind: "remote", url: region.url, center: center ?? regionCenter(region) };
}
