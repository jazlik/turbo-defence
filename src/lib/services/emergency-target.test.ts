import { describe, expect, it } from "vitest";

import { findEmergencyTarget } from "./emergency-target";
import { createEmptyNavigation } from "./navigation-storage";
import { RoutingError, type WalkingRouter } from "./routing/types";
import { parseShelterRows } from "@/lib/shelters";

const origin = { latitude: 50.06, longitude: 19.94 };
const shelters = parseShelterRows([
  ["A", 50.0609, 19.94, "ul. A 1, Kraków", "Całodobowa"],
  ["C", 50.0636, 19.94, "ul. C 4, Kraków", "Na żądanie"],
]);

const router = (overrides: Partial<WalkingRouter> = {}): WalkingRouter => ({
  id: "fake",
  matrix: (_origin, targets) => Promise.resolve(targets.map((_, index) => 100 + index * 100)),
  route: (from, to) =>
    Promise.resolve({
      geometry: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      distanceMeters: 300,
      durationSeconds: 240,
    }),
  ...overrides,
});

const base = { previous: createEmptyNavigation(), origin, shelters };

describe("findEmergencyTarget", () => {
  it("online: prepares and returns a route to the nearest PSP shelter, with routing consent recorded", async () => {
    const outcome = await findEmergencyTarget({ ...base, online: true, router: router() });
    expect(outcome.kind).toBe("route");
    if (outcome.kind !== "route") return;
    expect(outcome.navigation.primary?.destination.id).toBe("A");
    expect(outcome.navigation.routingConsent).toBe(true);
  });

  it("offline: nearest PSP point for straight-line guidance, without calling the router", async () => {
    const outcome = await findEmergencyTarget({
      ...base,
      online: false,
      router: router({ matrix: () => Promise.reject(new Error("must not be called")) }),
    });
    expect(outcome.kind).toBe("direct");
    if (outcome.kind !== "direct") return;
    expect(outcome.destination).toMatchObject({ id: "A", source: "psp" });
  });

  it("online but the router fails: falls back to straight-line guidance", async () => {
    const outcome = await findEmergencyTarget({
      ...base,
      online: true,
      router: router({ matrix: () => Promise.reject(new RoutingError("down")) }),
    });
    expect(outcome.kind).toBe("direct");
  });

  it("online but the router hangs: falls back after the timeout", async () => {
    const outcome = await findEmergencyTarget({
      ...base,
      online: true,
      timeoutMs: 20,
      router: router({ matrix: () => new Promise(() => undefined) }),
    });
    expect(outcome.kind).toBe("direct");
  });

  it("reports when no PSP point is within reach", async () => {
    const outcome = await findEmergencyTarget({
      ...base,
      origin: { latitude: 52.2, longitude: 21 },
      online: true,
      router: router(),
    });
    expect(outcome).toEqual({ kind: "none", reason: "no-candidates" });
  });
});
