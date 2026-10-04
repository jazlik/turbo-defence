import { describe, expect, it } from "vitest";

import { MAP_REGIONS, regionFileName } from "./map-regions";
import { pickMapSource } from "./map-source";
import { downloadStateFor, type MapPackageState } from "./services/map-storage";

const [malopolska] = MAP_REGIONS;
const krakow = { latitude: 50.0617, longitude: 19.9373 };
const warsaw = { latitude: 52.2297, longitude: 21.0122 };

const readyPackage: MapPackageState = {
  ...downloadStateFor(malopolska, null),
  status: "ready",
  receivedBytes: malopolska.bytes,
  completedAt: "2026-10-04T10:00:00.000Z",
};

describe("pickMapSource", () => {
  it("reads a downloaded package locally, even offline", () => {
    expect(pickMapSource({ mapPackage: readyPackage, online: false, center: krakow })).toEqual({
      kind: "local",
      fileName: regionFileName(malopolska),
      center: krakow,
    });
  });

  it("does not use an unfinished package", () => {
    const downloading = downloadStateFor(malopolska, null);
    expect(pickMapSource({ mapPackage: downloading, online: false, center: krakow })).toEqual({
      kind: "none",
      reason: "offline-no-package",
    });
  });

  it("reads the region remotely when online inside it", () => {
    expect(pickMapSource({ mapPackage: null, online: true, center: krakow })).toEqual({
      kind: "remote",
      url: malopolska.url,
      center: krakow,
    });
  });

  it("offers no map online outside every region", () => {
    expect(pickMapSource({ mapPackage: null, online: true, center: warsaw })).toEqual({
      kind: "none",
      reason: "outside-region",
    });
  });

  it("offers no map offline without a package", () => {
    expect(pickMapSource({ mapPackage: null, online: false, center: krakow })).toEqual({
      kind: "none",
      reason: "offline-no-package",
    });
  });

  it("opens the region's middle online when there is no start point", () => {
    const source = pickMapSource({ mapPackage: null, online: true, center: null });
    expect(source.kind).toBe("remote");
    if (source.kind !== "remote") return;
    expect(source.url).toBe(malopolska.url);
    const [west, south, east, north] = malopolska.bounds;
    expect(source.center).toEqual({ latitude: (south + north) / 2, longitude: (west + east) / 2 });
  });
});
