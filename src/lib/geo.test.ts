import { describe, expect, it } from "vitest";

import { bearingDegrees, distanceMeters, formatDistance, parseCoordinates, relativeBearing } from "./geo";

const warsawCentre = { latitude: 52.2297, longitude: 21.0122 };
const krakowSquare = { latitude: 50.0647, longitude: 19.945 };
const palaceOfCulture = { latitude: 52.2317, longitude: 21.0059 };
const origin = { latitude: 0, longitude: 0 };
const oneDegreeNorth = { latitude: 1, longitude: 0 };

describe("distanceMeters", () => {
  it("measures Warsaw Centre to Krakow Main Square", () => {
    expect(Math.abs(distanceMeters(warsawCentre, krakowSquare) - 251_977)).toBeLessThanOrEqual(100);
  });

  it("measures Warsaw Centre to the Palace of Culture", () => {
    expect(Math.abs(distanceMeters(warsawCentre, palaceOfCulture) - 483.3)).toBeLessThanOrEqual(2);
  });

  it("measures one degree of latitude at the equator", () => {
    expect(Math.abs(distanceMeters(origin, oneDegreeNorth) - 111_195)).toBeLessThanOrEqual(50);
  });

  it("returns zero for the same point", () => {
    expect(distanceMeters(warsawCentre, warsawCentre)).toBe(0);
  });
});

describe("bearingDegrees", () => {
  it("points south-south-west from Warsaw to Krakow", () => {
    expect(Math.abs(bearingDegrees(warsawCentre, krakowSquare) - 197.6)).toBeLessThanOrEqual(0.5);
  });

  it("points west-north-west from Warsaw Centre to the Palace of Culture", () => {
    expect(Math.abs(bearingDegrees(warsawCentre, palaceOfCulture) - 297.4)).toBeLessThanOrEqual(0.5);
  });

  it("points due north along a meridian", () => {
    expect(bearingDegrees(origin, oneDegreeNorth)).toBeCloseTo(0, 6);
  });
});

describe("relativeBearing", () => {
  it("wraps across 0/360", () => {
    expect(relativeBearing(10, 350)).toBe(20);
  });

  it("wraps the other way", () => {
    expect(relativeBearing(350, 10)).toBe(340);
  });

  it("returns zero when facing the target", () => {
    expect(relativeBearing(197.6, 197.6)).toBe(0);
  });
});

describe("formatDistance", () => {
  it("rounds to 10 m below a kilometre", () => {
    expect(formatDistance(483.3)).toBe("480 m");
    expect(formatDistance(4)).toBe("0 m");
  });

  it("switches to kilometres with one decimal", () => {
    expect(formatDistance(251_977)).toBe("252,0 km");
    expect(formatDistance(1_250)).toBe("1,3 km");
  });

  it("does not show 1000 m", () => {
    expect(formatDistance(996)).toBe("1,0 km");
  });
});

describe("parseCoordinates", () => {
  it("parses comma-separated decimal degrees", () => {
    expect(parseCoordinates("52.2297, 21.0122")).toEqual({ ok: true, coords: warsawCentre });
  });

  it("accepts negative values and whitespace separation", () => {
    expect(parseCoordinates(" -33.8688 151.2093 ")).toEqual({
      ok: true,
      coords: { latitude: -33.8688, longitude: 151.2093 },
    });
  });

  it("accepts Polish decimal commas separated by a semicolon, whitespace or a comma", () => {
    for (const input of ["52,2297; 21,0122", "52,2297 21,0122", "52,2297, 21,0122"]) {
      expect(parseCoordinates(input)).toEqual({ ok: true, coords: warsawCentre });
    }
  });

  it("rejects text", () => {
    expect(parseCoordinates("abc")).toEqual({ ok: false, reason: "format" });
    expect(parseCoordinates("52.2297")).toEqual({ ok: false, reason: "format" });
  });

  it("rejects out-of-range values", () => {
    expect(parseCoordinates("200, 0")).toEqual({ ok: false, reason: "range" });
    expect(parseCoordinates("0, 181")).toEqual({ ok: false, reason: "range" });
  });
});
