import { describe, expect, it } from "vitest";

import { bearingDegrees, distanceMeters, relativeBearing } from "./geo";
import { deriveGuidance, type GuidanceInput } from "./navigation";
import { prepareRoute } from "./route-progress";
import type { Coordinates, SavedRoute } from "@/types";

// Same L-shaped route as route-progress.test.ts: ~500 m north, then ~500 m east.
const start: Coordinates = { latitude: 50.06, longitude: 19.94 };
const corner: Coordinates = { latitude: 50.0645, longitude: 19.94 };
const end: Coordinates = { latitude: 50.0645, longitude: 19.947 };

const savedRoute = (destination: Coordinates): SavedRoute => ({
  destination: { id: "OZO-1", label: "Schron", coords: destination, source: "psp" },
  origin: start,
  geometry: [start, corner, end].map(({ latitude, longitude }) => [longitude, latitude]),
  distanceMeters: 1000,
  durationSeconds: 750,
  createdAt: "2026-10-03T12:00:00.000Z",
  provider: "test",
});

const route = prepareRoute(savedRoute(end));
const eastOfFirstLeg = (meters: number): Coordinates => ({ latitude: 50.062, longitude: 19.94 + meters / 71_500 });

const input = (overrides: Partial<GuidanceInput>): GuidanceInput => ({
  destination: end,
  route,
  origin: start,
  accuracyMeters: 10,
  heading: 0,
  liveFix: true,
  previousMode: null,
  ...overrides,
});

describe("deriveGuidance without a route (S-01 behaviour)", () => {
  it("matches the S-01 straight-line distance and arrow rotation", () => {
    const origin = { latitude: 50.05, longitude: 19.93 };
    const guidance = deriveGuidance(input({ route: null, origin, heading: 37 }));
    expect(guidance.mode).toBe("direct");
    expect(guidance.distanceKind).toBe("straight");
    expect(guidance.distanceMeters).toBe(distanceMeters(origin, end));
    expect(guidance.rotation).toBe(relativeBearing(bearingDegrees(origin, end), 37));
  });

  it("has no distance or rotation without a position", () => {
    const guidance = deriveGuidance(input({ route: null, origin: null }));
    expect(guidance.distanceMeters).toBeNull();
    expect(guidance.rotation).toBeNull();
    expect(guidance.arrived).toBe(false);
  });

  it("confirms arrival only on a live fix", () => {
    const nearby = { latitude: end.latitude + 0.0001, longitude: end.longitude };
    expect(deriveGuidance(input({ route: null, origin: nearby })).arrived).toBe(true);
    expect(deriveGuidance(input({ route: null, origin: nearby, liveFix: false })).arrived).toBe(false);
  });
});

describe("deriveGuidance with a saved route", () => {
  it("follows the route: remaining route length, arrow towards the checkpoint ahead", () => {
    const guidance = deriveGuidance(input({}));
    expect(guidance.mode).toBe("route");
    expect(guidance.distanceKind).toBe("route");
    expect(Math.abs((guidance.distanceMeters ?? 0) - route.lengthMeters)).toBeLessThan(1);
    expect(Math.round(guidance.rotation ?? -1) % 360).toBe(0); // heading north, first leg goes north
  });

  it("asks to rejoin the route ~60 m beside it and points at the nearest route point", () => {
    const guidance = deriveGuidance(input({ origin: eastOfFirstLeg(60), heading: 0 }));
    expect(guidance.mode).toBe("rejoin");
    expect(guidance.distanceKind).toBe("to-route");
    expect(Math.abs((guidance.distanceMeters ?? 0) - 60)).toBeLessThan(3);
    expect(Math.round(guidance.rotation ?? 0)).toBe(270); // route is due west
  });

  it("falls back to S-01 direct bearing more than 300 m from the route", () => {
    const westOfStart = { latitude: start.latitude, longitude: start.longitude - 400 / 71_500 }; // nearest route point is the start
    const guidance = deriveGuidance(input({ origin: westOfStart }));
    expect(guidance.mode).toBe("direct");
    expect(guidance.target).toEqual(end);
    expect(guidance.distanceKind).toBe("straight");
  });

  it("does not flicker around the off-route threshold", () => {
    const edge = eastOfFirstLeg(30);
    expect(deriveGuidance(input({ origin: edge, previousMode: "route" })).mode).toBe("route");
    expect(deriveGuidance(input({ origin: edge, previousMode: "rejoin" })).mode).toBe("rejoin");
    const westOfStart280 = { latitude: start.latitude, longitude: start.longitude - 280 / 71_500 };
    expect(deriveGuidance(input({ origin: westOfStart280, previousMode: "direct" })).mode).toBe("direct");
    expect(deriveGuidance(input({ origin: westOfStart280, previousMode: "rejoin" })).mode).toBe("rejoin");
  });

  it("widens the off-route threshold with poor GPS accuracy", () => {
    expect(deriveGuidance(input({ origin: eastOfFirstLeg(60), accuracyMeters: 50 })).mode).toBe("route");
  });

  it("aims at the destination on the last leg when it lies off the route end", () => {
    const destination = { latitude: end.latitude + 0.00036, longitude: end.longitude }; // ~40 m north of the end
    const offEnd = prepareRoute(savedRoute(destination));
    const nearEnd = { latitude: end.latitude, longitude: end.longitude - 0.0002 }; // ~14 m before the end
    const guidance = deriveGuidance(input({ destination, route: offEnd, origin: nearEnd, heading: 0 }));
    expect(guidance.mode).toBe("route");
    expect(guidance.target).toEqual(destination);
    expect(guidance.distanceMeters).toBeGreaterThan(40);
    expect(guidance.arrived).toBe(false);
  });
});
