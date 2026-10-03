import type { Coordinates } from "@/types";

/** One downloadable offline map package (built by scripts/map, hosted on R2, stored in OPFS). */
export interface MapRegion {
  id: string;
  name: string;
  /** Part of the immutable file name; a new package gets a new version and a new file. */
  version: string;
  url: string;
  bytes: number;
  /** OSM data date shown to the user. */
  osmDate: string;
  /** [west, south, east, north] */
  bounds: [number, number, number, number];
}

const R2_BASE_URL = "https://pub-52c8b7e32b42466d9dc408ed80a9241c.r2.dev";

export const MAP_REGIONS: MapRegion[] = [
  {
    id: "malopolska",
    name: "Małopolska",
    version: "20261003-lean2",
    url: `${R2_BASE_URL}/malopolska-20261003-lean2.pmtiles`,
    bytes: 99_077_239,
    osmDate: "2026-10-03",
    bounds: [19.0831, 49.1784, 21.4218, 50.5205],
  },
];

export const regionFileName = (region: MapRegion) => `${region.id}-${region.version}.pmtiles`;

const inBounds = ({ latitude, longitude }: Coordinates, [west, south, east, north]: MapRegion["bounds"]) =>
  longitude >= west && longitude <= east && latitude >= south && latitude <= north;

/**
 * The region to propose in setup. One region in the MVP, so a bounds check is enough (review F7); `covers` is
 * false when the known position lies outside it, null when the position is unknown.
 */
export function proposeRegion(position: Coordinates | null): { region: MapRegion; covers: boolean | null } {
  const containing = position ? MAP_REGIONS.find((region) => inBounds(position, region.bounds)) : undefined;
  return { region: containing ?? MAP_REGIONS[0], covers: position ? containing !== undefined : null };
}
