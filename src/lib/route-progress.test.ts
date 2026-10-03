import { describe, expect, it } from "vitest";

import { distanceMeters } from "./geo";
import { CHECKPOINT_LOOKAHEAD_METERS, prepareRoute, progressOnRoute, remainingGeometry } from "./route-progress";
import type { Coordinates, SavedRoute } from "@/types";

// L-shaped route near Kraków: ~500 m north, then ~500 m east. 0.0045° lat ≈ 500 m, 0.007° lon ≈ 500 m at 50°N.
const start: Coordinates = { latitude: 50.06, longitude: 19.94 };
const corner: Coordinates = { latitude: 50.0645, longitude: 19.94 };
const end: Coordinates = { latitude: 50.0645, longitude: 19.947 };
const destinationNearEnd: Coordinates = { latitude: 50.0645 + 0.00036, longitude: 19.947 }; // ~40 m north of the end

const route = (destination: Coordinates = end): SavedRoute => ({
  destination: { id: "OZO-1", label: "Schron", coords: destination, source: "psp" },
  origin: start,
  geometry: [start, corner, end].map(({ latitude, longitude }) => [longitude, latitude]),
  distanceMeters: 1000,
  durationSeconds: 750,
  createdAt: "2026-10-03T12:00:00.000Z",
  provider: "test",
});

const prepared = prepareRoute(route());
const near = (actual: number, expected: number, tolerance: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe("prepareRoute", () => {
  it("measures the line and the gap to a destination off the route end", () => {
    near(prepared.lengthMeters, distanceMeters(start, corner) + distanceMeters(corner, end), 2);
    expect(prepared.endGapMeters).toBe(0);
    near(prepareRoute(route(destinationNearEnd)).endGapMeters, 40, 1);
  });
});

describe("progressOnRoute", () => {
  it("is on the route at the start with the whole length remaining", () => {
    const progress = progressOnRoute(prepared, start);
    near(progress.offRouteMeters, 0, 1);
    near(progress.remainingMeters, prepared.lengthMeters, 1);
    near(distanceMeters(start, progress.checkpoint), CHECKPOINT_LOOKAHEAD_METERS, 1);
  });

  it("measures the distance to the route for a point beside it", () => {
    const beside = { latitude: 50.062, longitude: 19.94 + 0.0014 }; // ~100 m east of the first leg
    const progress = progressOnRoute(prepared, beside);
    near(progress.offRouteMeters, 100, 3);
    near(progress.snapped.longitude, 19.94, 0.00001);
  });

  it("aims past the corner: the checkpoint follows the route around the turn", () => {
    const beforeCorner = { latitude: 50.0645 - 0.00018, longitude: 19.94 }; // ~20 m before the corner
    const { checkpoint } = progressOnRoute(prepared, beforeCorner);
    expect(checkpoint.longitude).toBeGreaterThan(corner.longitude);
    near(checkpoint.latitude, corner.latitude, 0.00001);
  });

  it("decreases the remaining distance monotonically along the route", () => {
    let previous = Infinity;
    for (const [latitude, longitude] of [
      [50.06, 19.94],
      [50.062, 19.94],
      [50.0645, 19.9425],
      [50.0645, 19.946],
      [50.0645, 19.947],
    ]) {
      const { remainingMeters } = progressOnRoute(prepared, { latitude, longitude });
      expect(remainingMeters).toBeLessThan(previous);
      previous = remainingMeters;
    }
    expect(previous).toBeLessThan(1);
  });

  it("clamps points before the start and past the end", () => {
    near(progressOnRoute(prepared, { latitude: 50.059, longitude: 19.94 }).traveledMeters, 0, 1);
    const past = progressOnRoute(prepared, { latitude: 50.0645, longitude: 19.949 });
    expect(past.remainingOnLineMeters).toBe(0);
    near(distanceMeters(past.checkpoint, end), 0, 1);
  });

  it("counts the last leg to a destination 40 m off the route end", () => {
    const offEnd = prepareRoute(route(destinationNearEnd));
    const atEnd = progressOnRoute(offEnd, end);
    expect(atEnd.remainingOnLineMeters).toBe(0);
    near(atEnd.remainingMeters, 40, 1);
  });
});

describe("remainingGeometry", () => {
  it("starts at the walked distance and ends at the route end", () => {
    const traveled = distanceMeters(start, corner) + 100; // 100 m past the corner
    const remaining = remainingGeometry(prepared, traveled);
    const [firstLon, firstLat] = remaining[0];
    const [lastLon, lastLat] = remaining[remaining.length - 1];
    near(distanceMeters(corner, { latitude: firstLat, longitude: firstLon }), 100, 1);
    near(distanceMeters(end, { latitude: lastLat, longitude: lastLon }), 0, 1);
  });

  it("returns the whole route before the start and a single point past the end", () => {
    expect(remainingGeometry(prepared, 0)).toEqual(route().geometry);
    const done = remainingGeometry(prepared, prepared.lengthMeters + 10);
    expect(done).toHaveLength(2);
    expect(done[0]).toEqual(done[1]);
  });
});
