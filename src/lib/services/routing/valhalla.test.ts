import { encode } from "@googlemaps/polyline-codec";
import { describe, expect, it } from "vitest";

import { withFallback } from "./fallback";
import { RoutingError, type WalkingRouter } from "./types";
import { parseValhallaMatrix, parseValhallaRoute, valhallaMatrixBody } from "./valhalla";

const rynek = { latitude: 50.0614, longitude: 19.9383 };
const kazimierz = { latitude: 50.0547, longitude: 19.945 };

describe("Valhalla parsers", () => {
  it("sends lat/lon objects with pedestrian costing", () => {
    expect(valhallaMatrixBody(rynek, [kazimierz])).toEqual({
      sources: [{ lat: 50.0614, lon: 19.9383 }],
      targets: [{ lat: 50.0547, lon: 19.945 }],
      costing: "pedestrian",
    });
  });

  it("reads walking seconds per target and null for unreachable ones", () => {
    const json = {
      sources_to_targets: [
        [
          { time: 707, distance: 1.007 },
          { time: null, distance: null },
        ],
      ],
    };
    expect(parseValhallaMatrix(json, 2)).toEqual([707, null]);
    expect(() => parseValhallaMatrix({ error: "too far" }, 2)).toThrow(RoutingError);
  });

  it("decodes the polyline6 shape into [lon, lat] and converts km to m", () => {
    const shape = encode(
      [
        [50.0614, 19.9383],
        [50.0547, 19.945],
      ],
      6,
    );
    const route = parseValhallaRoute({ trip: { summary: { length: 1.007, time: 707.7 }, legs: [{ shape }] } });
    expect(route.geometry).toEqual([
      [19.9383, 50.0614],
      [19.945, 50.0547],
    ]);
    expect(route.distanceMeters).toBeCloseTo(1007);
    expect(route.durationSeconds).toBe(707.7);
  });
});

describe("withFallback", () => {
  const router = (id: string, fails: boolean): WalkingRouter => ({
    id,
    matrix: () => (fails ? Promise.reject(new RoutingError("down")) : Promise.resolve([1])),
    route: () =>
      fails
        ? Promise.reject(new RoutingError("down"))
        : Promise.resolve({
            geometry: [
              [0, 0],
              [1, 1],
            ],
            distanceMeters: 1,
            durationSeconds: 1,
          }),
  });

  it("uses the backup router when the first one fails and reports it as provider", async () => {
    const combined = withFallback([router("osrm", true), router("valhalla", false)]);
    await expect(combined.matrix(rynek, [kazimierz])).resolves.toEqual([1]);
    expect(combined.id).toBe("valhalla");
  });

  it("keeps using the router that answered, instead of retrying the dead one every call", async () => {
    let osrmCalls = 0;
    const osrm: WalkingRouter = {
      ...router("osrm", true),
      matrix: () => {
        osrmCalls += 1;
        return Promise.reject(new RoutingError("down"));
      },
      route: () => {
        osrmCalls += 1;
        return Promise.reject(new RoutingError("down"));
      },
    };
    const combined = withFallback([osrm, router("valhalla", false)]);
    await combined.matrix(rynek, [kazimierz]);
    await combined.route(rynek, kazimierz);
    await combined.route(rynek, kazimierz);
    expect(osrmCalls).toBe(1);
    expect(combined.id).toBe("valhalla");
  });

  it("fails only when every router fails", async () => {
    const combined = withFallback([router("osrm", true), router("valhalla", true)]);
    await expect(combined.route(rynek, kazimierz)).rejects.toBeInstanceOf(RoutingError);
  });
});
