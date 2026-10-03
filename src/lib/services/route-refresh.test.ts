import { describe, expect, it } from "vitest";

import { createEmptyNavigation } from "./navigation-storage";
import { needsRefresh, refreshRoutes, rerouteActive, ROUTER_REQUEST_GAP_MS } from "./route-refresh";
import { RoutingError, type WalkingRouter } from "./routing/types";
import { parseShelterRows } from "@/lib/shelters";
import type { Coordinates, NavigationState } from "@/types";

const origin: Coordinates = { latitude: 50.06, longitude: 19.94 };
const shelters = parseShelterRows([
  ["A", 50.0609, 19.94, "ul. A 1, Kraków", "Całodobowa"],
  ["C", 50.0636, 19.94, "ul. C 4, Kraków", "Na żądanie"],
]);
const now = new Date("2026-10-03T12:00:00.000Z");

function fakeRouter(overrides: Partial<WalkingRouter> = {}): WalkingRouter & { calls: string[] } {
  const calls: string[] = [];
  return {
    id: "fake",
    calls,
    matrix: (_origin, targets) => {
      calls.push(`matrix:${targets.length}`);
      return Promise.resolve(targets.map((_, index) => 100 + index * 100));
    },
    route: (from, to) => {
      calls.push(`route:${to.latitude}`);
      return Promise.resolve({
        geometry: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
        distanceMeters: 300,
        durationSeconds: 240,
      });
    },
    ...overrides,
  };
}

describe("refreshRoutes", () => {
  it("saves route A and B, paced between requests, sending coordinates only", async () => {
    const router = fakeRouter();
    const pauses: number[] = [];
    const next = await refreshRoutes({
      previous: { ...createEmptyNavigation(), routingConsent: true },
      origin,
      router,
      shelters,
      now,
      pause: (ms) => {
        pauses.push(ms);
        return Promise.resolve();
      },
    });
    expect(router.calls).toEqual(["matrix:2", "route:50.0609", "route:50.0636"]);
    expect(pauses).toEqual([ROUTER_REQUEST_GAP_MS, ROUTER_REQUEST_GAP_MS]);
    expect(next.primary?.destination.id).toBe("A");
    expect(next.alternate?.destination.id).toBe("C");
    expect(next.primary?.createdAt).toBe(now.toISOString());
    expect(next.primary?.provider).toBe("fake");
    expect(next.routingConsent).toBe(true);
    expect(next.lastRefresh).toEqual({ at: now.toISOString(), ok: true });
  });

  it("keeps the previous routes and records the reason when the router fails", async () => {
    const previous: NavigationState = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin,
      router: fakeRouter(),
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    const next = await refreshRoutes({
      previous,
      origin,
      router: fakeRouter({ matrix: () => Promise.reject(new RoutingError("down")) }),
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    expect(next.primary).toEqual(previous.primary);
    expect(next.lastRefresh).toEqual({ at: now.toISOString(), ok: false, reason: "routing-error" });
  });

  it("keeps a fresh A when only route B fails", async () => {
    const router = fakeRouter({
      route: (from, to) =>
        to.latitude === 50.0636 ? Promise.reject(new RoutingError("down")) : fakeRouter().route(from, to),
    });
    const next = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin,
      router,
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    expect(next.primary?.destination.id).toBe("A");
    expect(next.alternate).toBeNull();
  });

  it("reports no candidates far from any shelter", async () => {
    const next = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin: { latitude: 52.2, longitude: 21 },
      router: fakeRouter(),
      shelters,
      now,
    });
    expect(next.lastRefresh?.reason).toBe("no-candidates");
  });
});

describe("needsRefresh", () => {
  it("asks for a route when none exists, when it is old, or after moving more than 300 m", async () => {
    expect(needsRefresh(createEmptyNavigation(), null, now.getTime())).toBe(true);
    const fresh = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin,
      router: fakeRouter(),
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    expect(needsRefresh(fresh, origin, now.getTime() + 10 * 60_000)).toBe(false);
    expect(needsRefresh(fresh, origin, now.getTime() + 31 * 60_000)).toBe(true);
    expect(needsRefresh(fresh, { latitude: 50.064, longitude: 19.94 }, now.getTime())).toBe(true);
  });
});

describe("rerouteActive", () => {
  it("replaces the active route with one from the current position to the same destination", async () => {
    const prepared = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin,
      router: fakeRouter(),
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    const elsewhere = { latitude: 50.065, longitude: 19.95 };
    const later = new Date("2026-10-03T12:10:00.000Z");
    const next = await rerouteActive({ previous: prepared, origin: elsewhere, router: fakeRouter(), now: later });
    expect(next.primary?.destination).toEqual(prepared.primary?.destination);
    expect(next.primary?.origin).toEqual(elsewhere);
    expect(next.primary?.createdAt).toBe(later.toISOString());
    expect(next.alternate).toEqual(prepared.alternate);
  });

  it("keeps the old route when the router fails", async () => {
    const prepared = await refreshRoutes({
      previous: createEmptyNavigation(),
      origin,
      router: fakeRouter(),
      shelters,
      now,
      pause: () => Promise.resolve(),
    });
    const next = await rerouteActive({
      previous: prepared,
      origin,
      router: fakeRouter({ route: () => Promise.reject(new RoutingError("down")) }),
      now,
    });
    expect(next.primary).toEqual(prepared.primary);
    expect(next.lastRefresh?.reason).toBe("routing-error");
  });
});
