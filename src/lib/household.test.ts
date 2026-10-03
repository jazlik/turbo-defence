import { describe, expect, it } from "vitest";

import {
  addContact,
  addCustomNeed,
  addMember,
  filterCandidates,
  MAX_NEEDS,
  MAX_RECORDS,
  needLabel,
  type MemberInput,
  phoneHref,
  prepareCandidates,
  removeContact,
  removeMember,
  summarizeHousehold,
  updateContact,
  updateMember,
  validateContactInput,
  validateMemberInput,
} from "./household";
import type { EmergencyContact, HouseholdMember, MemberNeed } from "@/types";

const member: MemberInput = { name: "Ola", category: "child", needs: [] };
const contact = { name: "Babcia", phone: "600 100 200", relation: "" };

describe("validateMemberInput", () => {
  it("trims the name and accepts every category", () => {
    for (const category of ["adult", "child", "pet"] as const) {
      expect(validateMemberInput({ ...member, name: "  Ola ", category })).toEqual({
        ok: true,
        value: { ...member, name: "Ola", category },
      });
    }
  });

  it("rejects an empty or too long name", () => {
    expect(validateMemberInput({ ...member, name: "   " }).ok).toBe(false);
    expect(validateMemberInput({ ...member, name: "a".repeat(61) }).ok).toBe(false);
    expect(validateMemberInput({ ...member, name: "a".repeat(60) }).ok).toBe(true);
  });
});

describe("validateContactInput", () => {
  it("accepts typical phone formats", () => {
    for (const phone of ["+48 600 100 200", "600-100-200", "(22) 123 45 67", "1234567", "123456789012345"]) {
      expect(validateContactInput({ ...contact, phone }).ok).toBe(true);
    }
  });

  it("rejects phones that are too short, too long or contain letters", () => {
    for (const phone of ["", "123456", "1234567890123456", "600 abc 200", "600.100.200"]) {
      const result = validateContactInput({ ...contact, phone });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.phone).toBeTruthy();
    }
  });

  it("reports every invalid field at once", () => {
    const result = validateContactInput({ name: "", phone: "", relation: "x".repeat(41) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["name", "phone", "relation"]);
  });

  it("trims all fields and keeps an empty relation", () => {
    expect(validateContactInput({ name: " Jan ", phone: " 600100200 ", relation: " brat " })).toEqual({
      ok: true,
      value: { name: "Jan", phone: "600100200", relation: "brat" },
    });
  });
});

describe("list operations", () => {
  it("adds a member with a generated id without mutating the input", () => {
    const list: HouseholdMember[] = [];
    const next = addMember(list, member);
    expect(list).toEqual([]);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject(member);
    expect(next[0]?.id).toBeTruthy();
  });

  it("gives distinct ids", () => {
    const next = addMember(addMember([], member), member);
    expect(new Set(next.map((item) => item.id)).size).toBe(2);
  });

  it("updates and removes by id, leaving the list unchanged for an unknown id", () => {
    const [created] = addMember([], member);
    const list = [created];
    expect(updateMember(list, created.id, { ...member, name: "Ala" })[0]).toEqual({
      ...member,
      name: "Ala",
      id: created.id,
    });
    expect(updateMember(list, "nope", { ...member, name: "Ala" })).toEqual(list);
    expect(removeMember(list, "nope")).toEqual(list);
    expect(removeMember(list, created.id)).toEqual([]);
    expect(list).toHaveLength(1);
  });

  it("works the same for contacts", () => {
    const [created] = addContact([], contact);
    expect(updateContact([created], created.id, { ...contact, relation: "babcia" })[0]?.relation).toBe("babcia");
    expect(removeContact([created], created.id)).toEqual([]);
  });

  it("refuses to add past the limit", () => {
    let list: EmergencyContact[] = [];
    for (let i = 0; i < MAX_RECORDS + 3; i += 1) list = addContact(list, contact);
    expect(list).toHaveLength(MAX_RECORDS);
  });
});

describe("phoneHref", () => {
  it("keeps digits and a leading plus only", () => {
    expect(phoneHref("+48 (600) 100-200")).toBe("tel:+48600100200");
    expect(phoneHref(" 600 100 200 ")).toBe("tel:600100200");
  });
});

describe("summarizeHousehold", () => {
  it("counts both lists", () => {
    expect(summarizeHousehold({ members: addMember([], member), contacts: [] })).toEqual({ members: 1, contacts: 0 });
  });
});

describe("needs", () => {
  it("adds a trimmed custom need and rejects empty, too long and duplicate ones", () => {
    const result = addCustomNeed([], "  insulina ");
    expect(result).toEqual({ ok: true, value: [{ kind: "custom", label: "insulina" }] });
    expect(addCustomNeed([], "   ").ok).toBe(false);
    expect(addCustomNeed([], "a".repeat(41)).ok).toBe(false);
    expect(addCustomNeed([{ kind: "custom", label: "Insulina" }], "INSULINA").ok).toBe(false);
  });

  it("turns a typed preset label into the preset instead of a custom duplicate", () => {
    expect(addCustomNeed([], "cukrzyca")).toEqual({ ok: true, value: [{ kind: "diabetes" }] });
    expect(addCustomNeed([{ kind: "diabetes" }], "Cukrzyca").ok).toBe(false);
  });

  it("stops at the per-person limit", () => {
    let needs: MemberNeed[] = [];
    for (let i = 0; i < MAX_NEEDS; i += 1) {
      const result = addCustomNeed(needs, `potrzeba ${i}`);
      if (result.ok) needs = result.value;
    }
    expect(needs).toHaveLength(MAX_NEEDS);
    expect(addCustomNeed(needs, "jeszcze jedna").ok).toBe(false);
  });

  it("labels presets and custom needs", () => {
    expect(needLabel({ kind: "mobility" })).toBe("Ograniczona mobilność");
    expect(needLabel({ kind: "custom", label: "wózek" })).toBe("wózek");
  });
});

describe("prepareCandidates", () => {
  it("drops invalid numbers and duplicates, counting them", () => {
    const existing: EmergencyContact[] = [{ id: "c1", name: "Babcia", phone: "+48 600 100 200", relation: "" }];
    const result = prepareCandidates(
      [
        { name: "Jan", phone: "500 500 500", relation: "" },
        { name: "Jan bis", phone: "500-500-500", relation: "" },
        { name: "Babcia", phone: "48600100200", relation: "" },
        { name: "Zły", phone: "12", relation: "" },
      ],
      existing,
    );
    expect(result.candidates).toEqual([{ name: "Jan", phone: "500 500 500", relation: "" }]);
    expect(result.duplicates).toBe(2);
    expect(result.invalid).toBe(1);
  });
});

describe("filterCandidates", () => {
  const list = [
    { name: "Anna Kowalska", phone: "+48 600 100 200", relation: "" },
    { name: "Jan Nowak", phone: "500 500 500", relation: "" },
    { name: "Łukasz", phone: "700-700-700", relation: "" },
  ];

  it("returns every index for an empty query", () => {
    expect(filterCandidates(list, "  ")).toEqual([0, 1, 2]);
  });

  it("matches the name in any case, including Polish letters", () => {
    expect(filterCandidates(list, "kowal")).toEqual([0]);
    expect(filterCandidates(list, "ŁUKA")).toEqual([2]);
  });

  it("matches the digits of the number regardless of formatting", () => {
    expect(filterCandidates(list, "500500")).toEqual([1]);
    expect(filterCandidates(list, "+48 600")).toEqual([0]);
    expect(filterCandidates(list, "zzz")).toEqual([]);
  });
});
