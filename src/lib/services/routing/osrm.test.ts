import { describe, expect, it } from "vitest";

import { osrmRouteUrl, osrmTableUrl, parseOsrmRoute, parseOsrmTable } from "./osrm";
import { RoutingError } from "./types";

// Shapes recorded from routing.openstreetmap.de/routed-foot during planning (2026-10-03), trimmed.
const tableResponse = { code: "Ok", durations: [[0, 707.2, null, 1293.4]], destinations: [], sources: [] };
const routeResponse = {
  code: "Ok",
  routes: [
    {
      distance: 1004.7,
      duration: 803.6,
      geometry: {
        type: "LineString",
        coordinates: [
          [19.938281, 50.061398],
          [19.93936, 50.060969],
          [19.944999, 50.054683],
        ],
      },
    },
  ],
  waypoints: [],
};

const rynek = { latitude: 50.0614, longitude: 19.9383 };
const kazimierz = { latitude: 50.0547, longitude: 19.945 };

describe("OSRM URLs", () => {
  it("sends only coordinates, lon,lat order, origin first", () => {
    expect(osrmTableUrl(rynek, [kazimierz])).toBe(
      "https://routing.openstreetmap.de/routed-foot/table/v1/foot/19.938300,50.061400;19.945000,50.054700?sources=0&annotations=duration",
    );
    expect(osrmRouteUrl(rynek, kazimierz)).toContain("/route/v1/foot/19.938300,50.061400;19.945000,50.054700?");
  });
});

describe("parseOsrmTable", () => {
  it("drops the origin column and keeps unreachable targets as null", () => {
    expect(parseOsrmTable(tableResponse, 3)).toEqual([707.2, null, 1293.4]);
  });

  it("rejects an error response or a row of the wrong length", () => {
    expect(() => parseOsrmTable({ code: "NoTable" }, 3)).toThrow(RoutingError);
    expect(() => parseOsrmTable(tableResponse, 2)).toThrow(RoutingError);
  });
});

describe("parseOsrmRoute", () => {
  it("returns geometry, distance and duration", () => {
    const route = parseOsrmRoute(routeResponse);
    expect(route.geometry).toHaveLength(3);
    expect(route.distanceMeters).toBe(1004.7);
    expect(route.durationSeconds).toBe(803.6);
  });

  it("rejects responses without a usable route", () => {
    expect(() => parseOsrmRoute({ code: "NoRoute", routes: [] })).toThrow(RoutingError);
    expect(() => parseOsrmRoute({ code: "Ok", routes: [] })).toThrow(RoutingError);
    const single = { ...routeResponse.routes[0], geometry: { coordinates: [[19.9, 50.0]] } };
    expect(() => parseOsrmRoute({ code: "Ok", routes: [single] })).toThrow(RoutingError);
  });
});
