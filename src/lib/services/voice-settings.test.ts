import { describe, expect, it } from "vitest";

import { parseVoiceSettings } from "./voice-settings";

describe("parseVoiceSettings", () => {
  it("returns enabled: true for null", () => {
    expect(parseVoiceSettings(null)).toEqual({ enabled: true });
  });

  it("returns enabled: true for garbage values", () => {
    for (const v of ["yes", 1, true, { enabled: "no" }, { enabled: 0 }, { enabled: null }, []]) {
      expect(parseVoiceSettings(v)).toEqual({ enabled: true });
    }
  });

  it("returns enabled: false only for { enabled: false }", () => {
    expect(parseVoiceSettings({ enabled: false })).toEqual({ enabled: false });
  });
});
