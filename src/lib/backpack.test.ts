import { describe, expect, it } from "vitest";

import {
  buildBackpack,
  formatAmount,
  itemState,
  peopleCount,
  prunePacked,
  summarizeBackpack,
  togglePacked,
  type BackpackItem,
} from "./backpack";
import type { HouseholdMember, MemberCategory, MemberNeed } from "@/types";

const member = (id: string, name: string, category: MemberCategory, needs: MemberNeed[] = []): HouseholdMember => ({
  id,
  name,
  category,
  needs,
});

function find(items: BackpackItem[], id: string): BackpackItem {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`no item ${id}`);
  return item;
}

const family = [
  member("a1", "Jan", "adult"),
  member("a2", "Ania", "adult"),
  member("c1", "Ola", "child"),
  member("p1", "Burek", "pet"),
];

describe("buildBackpack", () => {
  it("lists only the base items for one person when the household is empty", () => {
    const items = buildBackpack([]);
    expect(new Set(items.map((item) => item.group))).toEqual(new Set(["everyone"]));
    expect(find(items, "water").quantity).toEqual({ amount: 9, unit: "l", basis: "1 os. × 3 l × 3 doby" });
    expect(find(items, "food").quantity?.amount).toBe(3);
    expect(find(items, "masks").quantity?.amount).toBe(3);
    expect(items.every((item) => item.forNames.length === 0)).toBe(true);
  });

  it("counts the organizer plus adults and children, not pets", () => {
    expect(peopleCount([])).toBe(1);
    expect(peopleCount(family)).toBe(4);
  });

  it("scales quantities and adds child and pet groups for a family", () => {
    const items = buildBackpack(family);
    expect(find(items, "water").quantity).toEqual({ amount: 36, unit: "l", basis: "4 os. × 3 l × 3 doby" });
    expect(find(items, "food").quantity?.amount).toBe(12);
    expect(find(items, "clothes").quantity?.amount).toBe(4);
    expect(find(items, "child-clothes").quantity?.amount).toBe(1);
    expect(find(items, "child-toy").forNames).toEqual(["Ola"]);
    expect(find(items, "pet-food").quantity).toEqual({ amount: 3, unit: "porcje", basis: "1 zwierzę × 3 doby" });
    expect(find(items, "pet-water").quantity?.amount).toBe(3);
    expect(find(items, "pet-leash").forNames).toEqual(["Burek"]);
  });

  it("keeps groups in a fixed order", () => {
    const items = buildBackpack([...family, member("a3", "Ewa", "adult", [{ kind: "diet" }])]);
    const groups = items.map((item) => item.group).filter((group, index, all) => all.indexOf(group) === index);
    expect(groups).toEqual(["everyone", "children", "pets", "needs"]);
  });

  it("merges a preset need into one item naming everyone who has it", () => {
    const items = buildBackpack([
      member("a1", "Jan", "adult", [{ kind: "medication" }]),
      member("a2", "Ania", "adult", [{ kind: "medication" }, { kind: "allergy" }]),
    ]);
    const medication = find(items, "need-medication");
    expect(medication.forNames).toEqual(["Jan", "Ania"]);
    expect(medication.quantity?.amount).toBe(2);
    expect(find(items, "need-allergy").forNames).toEqual(["Ania"]);
    expect(items.some((item) => item.id === "need-diabetes")).toBe(false);
  });

  it("adds one item per custom need of each member", () => {
    const items = buildBackpack([
      member("a1", "Ania", "adult", [{ kind: "custom", label: "Insulina" }]),
      member("a2", "Jan", "adult", [{ kind: "custom", label: "Insulina" }]),
    ]);
    const custom = items.filter((item) => item.id.startsWith("custom:"));
    expect(custom.map((item) => item.id)).toEqual(["custom:a1:insulina", "custom:a2:insulina"]);
    expect(custom[0]).toMatchObject({ label: "Zabierz: Insulina", forNames: ["Ania"], quantity: null, group: "needs" });
  });
});

describe("itemState", () => {
  const items = buildBackpack(family);
  const water = find(items, "water");
  const radio = find(items, "radio");

  it("reads an item without a record as unpacked", () => {
    expect(itemState(water, [])).toEqual({ status: "unpacked", previousAmount: null });
  });

  it("reads a record covering the current amount as packed", () => {
    expect(itemState(water, [{ itemId: "water", quantity: 36 }]).status).toBe("packed");
    expect(itemState(water, [{ itemId: "water", quantity: 45 }]).status).toBe("packed");
    expect(itemState(radio, [{ itemId: "radio", quantity: null }]).status).toBe("packed");
  });

  it("reads a record for a smaller amount as outdated", () => {
    expect(itemState(water, [{ itemId: "water", quantity: 27 }])).toEqual({ status: "outdated", previousAmount: 27 });
    expect(itemState(water, [{ itemId: "water", quantity: null }])).toEqual({
      status: "outdated",
      previousAmount: null,
    });
  });
});

describe("togglePacked", () => {
  const items = buildBackpack(family);
  const water = find(items, "water");

  it("ticking an outdated item stores the current amount", () => {
    const packed = togglePacked([{ itemId: "water", quantity: 27 }], water, true, items);
    expect(packed).toEqual([{ itemId: "water", quantity: 36 }]);
    expect(itemState(water, packed).status).toBe("packed");
  });

  it("un-ticking removes the record and drops records off the current list", () => {
    const packed = togglePacked(
      [
        { itemId: "water", quantity: 36 },
        { itemId: "radio", quantity: null },
        { itemId: "child-toy", quantity: null },
      ],
      water,
      false,
      buildBackpack([]),
    );
    expect(packed).toEqual([{ itemId: "radio", quantity: null }]);
  });

  it("drops a removed child's ticks, so another child starts unpacked", () => {
    const withoutChild = family.filter((item) => item.category !== "child");
    const packed = prunePacked([{ itemId: "child-documents", quantity: null }], buildBackpack(withoutChild));
    const withOtherChild = buildBackpack([...withoutChild, member("c2", "Kuba", "child")]);
    expect(itemState(find(withOtherChild, "child-documents"), packed).status).toBe("unpacked");
  });

  it("prunes only by the list it is given", () => {
    expect(prunePacked([{ itemId: "gone", quantity: null }], items)).toEqual([]);
  });
});

describe("formatAmount", () => {
  function quantityOf(members: HouseholdMember[], id: string) {
    const quantity = find(buildBackpack(members), id).quantity;
    if (!quantity) throw new Error(`no quantity for ${id}`);
    return quantity;
  }

  it("declines the unit for the amount it shows", () => {
    const petFood = quantityOf([member("p1", "Burek", "pet"), member("p2", "Mruczek", "pet")], "pet-food");
    expect(formatAmount(petFood)).toBe("6 porcji");
    expect(formatAmount(petFood, 3)).toBe("3 porcje");
    expect(formatAmount(petFood, 1)).toBe("1 porcja");
    expect(formatAmount(quantityOf([], "water"), 18)).toBe("18 l");
  });
});

describe("summarizeBackpack", () => {
  it("counts only packed items, not outdated ones", () => {
    const items = buildBackpack(family);
    const summary = summarizeBackpack(items, [
      { itemId: "water", quantity: 27 },
      { itemId: "radio", quantity: null },
      { itemId: "food", quantity: 12 },
    ]);
    expect(summary).toEqual({ packed: 2, total: items.length });
  });
});
