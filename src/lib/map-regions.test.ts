import { describe, expect, it } from "vitest";

import { MAP_REGIONS, packageCovers, regionCovering } from "./map-regions";

const [malopolska] = MAP_REGIONS;
const krakow = { latitude: 50.0617, longitude: 19.9373 };
const warsaw = { latitude: 52.2297, longitude: 21.0122 };

describe("regionCovering", () => {
  it("finds the region containing the position", () => {
    expect(regionCovering(krakow)).toBe(malopolska);
  });

  it("returns nothing outside every region", () => {
    expect(regionCovering(warsaw)).toBeUndefined();
  });

  it("counts the bounds as inside", () => {
    const [west, south, east, north] = malopolska.bounds;
    expect(regionCovering({ latitude: south, longitude: west })).toBe(malopolska);
    expect(regionCovering({ latitude: north, longitude: east })).toBe(malopolska);
  });
});

describe("packageCovers", () => {
  it("is true inside the package region", () => {
    expect(packageCovers(malopolska.id, krakow)).toBe(true);
  });

  it("is false outside it", () => {
    expect(packageCovers(malopolska.id, warsaw)).toBe(false);
  });

  it("covers nothing for a region that is no longer on offer", () => {
    expect(packageCovers("mazowsze", warsaw)).toBe(false);
  });
});
