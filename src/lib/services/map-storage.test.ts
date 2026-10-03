import { describe, expect, it } from "vitest";

import { MAP_REGIONS, proposeRegion, type MapRegion } from "@/lib/map-regions";
import { downloadStateFor, parseMapPackage, type MapPackageState } from "./map-storage";

const region: MapRegion = MAP_REGIONS[0];

const downloading: MapPackageState = {
  schemaVersion: 1,
  regionId: region.id,
  version: region.version,
  fileName: "malopolska-20261003-lean2.pmtiles",
  bytes: region.bytes,
  receivedBytes: 40_000_000,
  etag: '"abc"',
  status: "downloading",
  completedAt: null,
};

describe("parseMapPackage", () => {
  it("keeps a valid state and rejects damaged ones", () => {
    expect(parseMapPackage(downloading)).toEqual(downloading);
    expect(parseMapPackage({ ...downloading, status: "done" })).toBeNull();
    expect(parseMapPackage({ ...downloading, bytes: -1 })).toBeNull();
    expect(parseMapPackage({ ...downloading, schemaVersion: 2 })).toBeNull();
  });

  it("never reports more received bytes than the package has", () => {
    expect(parseMapPackage({ ...downloading, receivedBytes: region.bytes + 5 })?.receivedBytes).toBe(region.bytes);
  });
});

describe("downloadStateFor", () => {
  it("resumes an unfinished download of the same version", () => {
    expect(downloadStateFor(region, { ...downloading, status: "failed" })).toEqual(downloading);
  });

  it("starts from zero for a new version or when nothing was downloaded", () => {
    const fresh = downloadStateFor(region, { ...downloading, version: "20260901-lean1" });
    expect(fresh.receivedBytes).toBe(0);
    expect(fresh.etag).toBeNull();
    expect(fresh.fileName).toBe("malopolska-20261003-lean2.pmtiles");
    expect(downloadStateFor(region, null).receivedBytes).toBe(0);
  });
});

describe("proposeRegion", () => {
  it("proposes Małopolska and tells whether it covers the position", () => {
    expect(proposeRegion({ latitude: 50.0617, longitude: 19.9373 })).toEqual({ region, covers: true });
    expect(proposeRegion({ latitude: 52.2297, longitude: 21.0122 })).toEqual({ region, covers: false });
    expect(proposeRegion(null)).toEqual({ region, covers: null });
  });
});
