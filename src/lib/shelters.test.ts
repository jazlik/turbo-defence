import { describe, expect, it } from "vitest";

import { parseShelterRows, pickDestinations, shortlist, type ShelterCandidate } from "./shelters";

const origin = { latitude: 50.06, longitude: 19.94 };
// ~0.0009° latitude ≈ 100 m
const rows = [
  ["A", 50.0609, 19.94, "ul. A 1, Kraków", "Całodobowa"],
  ["B", 50.0618, 19.94, "ul. B 2, Kraków", "Na żądanie"],
  ["A-next-door", 50.061, 19.9401, "ul. A 3, Kraków", "Całodobowa"],
  ["C", 50.0636, 19.94, "ul. C 4, Kraków", "Określone godziny"],
  ["far", 50.3, 19.94, "daleko", "Całodobowa"],
  ["broken", "50", 19.94, "x", "y"],
];
const points = parseShelterRows(rows);

describe("parseShelterRows", () => {
  it("skips rows without numeric coordinates", () => {
    expect(points.map((point) => point.id)).toEqual(["A", "B", "A-next-door", "C", "far"]);
  });
});

describe("shortlist", () => {
  it("keeps the nearest points within the radius, nearest first", () => {
    const list = shortlist(points, origin, { size: 3, spread: 0 });
    expect(list.map((candidate) => candidate.id)).toEqual(["A", "A-next-door", "B"]);
    expect(shortlist(points, origin).some((candidate) => candidate.id === "far")).toBe(false);
  });

  it("adds the nearest points at least 150 m from the nearest one when the closest ones cluster", () => {
    const list = shortlist(points, origin, { size: 2, spread: 1 }); // A, A-next-door + first ≥150 m from A
    expect(list.map((candidate) => candidate.id)).toEqual(["A", "A-next-door", "C"]);
  });
});

describe("pickDestinations", () => {
  const candidates: ShelterCandidate[] = shortlist(points, origin); // A, A-next-door, B, C
  const ids = (picked: ReturnType<typeof pickDestinations>) => [picked?.primary.id, picked?.alternate?.id ?? null];

  it("picks the shortest walk as A and a B at least 150 m away from A", () => {
    // A-next-door and B (~100 m from A) are too close to be an alternative; C (~300 m) is the first real one.
    expect(ids(pickDestinations(candidates, [120, 130, 300, 500], null))).toEqual(["A", "C"]);
  });

  it("skips candidates the router could not reach", () => {
    expect(ids(pickDestinations(candidates, [null, 130, null, 500], null))).toEqual(["A-next-door", "C"]);
    expect(pickDestinations(candidates, [null, null, null, null], null)).toBeNull();
  });

  it("keeps the previous A when the new best is only slightly faster", () => {
    // B was A before; A is now 5 % faster → no switch.
    expect(ids(pickDestinations(candidates, [600, 700, 630, 900], "B"))[0]).toBe("B");
  });

  it("switches A when the new best is ≥ 10 % and ≥ 60 s faster", () => {
    expect(ids(pickDestinations(candidates, [500, 700, 600, 900], "B"))[0]).toBe("A");
    // 10 % but only 30 s faster → stays.
    expect(ids(pickDestinations(candidates, [270, 700, 300, 900], "B"))[0]).toBe("B");
  });

  it("switches A when the previous A dropped out of the shortlist", () => {
    expect(ids(pickDestinations(candidates, [600, 700, 630, 900], "gone"))[0]).toBe("A");
  });
});
