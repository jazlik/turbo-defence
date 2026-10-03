import { describe, expect, it } from "vitest";

import { activeRoute, parseNavigation } from "./navigation-storage";

const route = {
  destination: {
    id: "OZO-745DE14AF8CC",
    label: "Schron · ul. Stańczyka 18",
    coords: { latitude: 50.07724, longitude: 19.89225 },
    source: "psp",
    address: "ul. Stańczyka 18, Kraków",
    availability: "Całodobowa",
  },
  origin: { latitude: 50.0617, longitude: 19.9373 },
  geometry: [
    [19.9373, 50.0617],
    [19.9, 50.07],
    [19.8923, 50.0772],
  ],
  distanceMeters: 4200,
  durationSeconds: 3300,
  createdAt: "2026-10-03T12:00:00.000Z",
  provider: "osrm-fossgis-foot",
};

const valid = {
  schemaVersion: 1,
  primary: route,
  alternate: { ...route, destination: { ...route.destination, id: "OZO-B" } },
  active: "alternate",
  routingConsent: true,
  lastRefresh: { at: "2026-10-03T12:00:00.000Z", ok: false, reason: "offline" },
};

describe("parseNavigation", () => {
  it("keeps a valid state unchanged", () => {
    expect(parseNavigation(valid)).toEqual(valid);
  });

  it("returns an empty state for a non-object or an unknown schema version", () => {
    for (const value of [null, "nav", { ...valid, schemaVersion: 2 }]) {
      const state = parseNavigation(value);
      expect(state.primary).toBeNull();
      expect(state.alternate).toBeNull();
      expect(state.routingConsent).toBe(false);
    }
  });

  it("drops a route with damaged geometry", () => {
    const broken = [
      [[19.9, 50]],
      [
        [19.9, 50],
        [200, 50],
      ],
      [[19.9, 50], "x"],
      "line",
    ];
    for (const geometry of broken) {
      expect(parseNavigation({ ...valid, primary: { ...route, geometry } }).primary).toBeNull();
    }
  });

  it("drops a route without a valid destination or creation date", () => {
    expect(parseNavigation({ ...valid, primary: { ...route, destination: { label: "x" } } }).primary).toBeNull();
    expect(parseNavigation({ ...valid, primary: { ...route, createdAt: "wczoraj" } }).primary).toBeNull();
  });

  it("falls back to the primary route when the alternate one is missing", () => {
    const state = parseNavigation({ ...valid, alternate: null });
    expect(state.active).toBe("primary");
    expect(activeRoute(state)?.destination.id).toBe("OZO-745DE14AF8CC");
  });

  it("drops an unknown refresh failure reason but keeps the attempt", () => {
    const state = parseNavigation({ ...valid, lastRefresh: { at: valid.lastRefresh.at, ok: false, reason: "??" } });
    expect(state.lastRefresh).toEqual({ at: valid.lastRefresh.at, ok: false });
  });
});
