import { describe, expect, it } from "vitest";

import { parseVCard } from "./vcard";

describe("parseVCard", () => {
  it("reads name and phone from a 3.0 card", () => {
    const text =
      "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Kowalska;Anna;;;\r\nFN:Anna Kowalska\r\nTEL;TYPE=CELL:+48 600 100 200\r\nEND:VCARD\r\n";
    expect(parseVCard(text)).toEqual([{ name: "Anna Kowalska", phone: "+48 600 100 200", relation: "" }]);
  });

  it("reads several cards and skips the ones without a number", () => {
    const text = [
      "BEGIN:VCARD",
      "FN:Jan",
      "TEL:500500500",
      "END:VCARD",
      "BEGIN:VCARD",
      "FN:Bez numeru",
      "EMAIL:x@example.com",
      "END:VCARD",
      "BEGIN:VCARD",
      "FN:Ewa",
      "TEL;TYPE=HOME:600600600",
      "TEL;TYPE=CELL:700700700",
      "END:VCARD",
    ].join("\n");
    expect(parseVCard(text)).toEqual([
      { name: "Jan", phone: "500500500", relation: "" },
      { name: "Ewa", phone: "600600600", relation: "" },
    ]);
  });

  it("falls back to the structured name, then to the number", () => {
    const text = "BEGIN:VCARD\nN:Nowak;Piotr;;;\nTEL:111222333\nEND:VCARD\nBEGIN:VCARD\nTEL:444555666\nEND:VCARD";
    expect(parseVCard(text).map((contact) => contact.name)).toEqual(["Piotr Nowak", "444555666"]);
  });

  it("handles grouped properties, tel: uris, folded lines and escapes", () => {
    const text = "BEGIN:VCARD\nVERSION:4.0\nFN:Kowalski\\, Jan\nitem1.TEL;VALUE=uri:tel:+48-600-100-\n 200\nEND:VCARD";
    expect(parseVCard(text)).toEqual([{ name: "Kowalski, Jan", phone: "+48-600-100-200", relation: "" }]);
  });

  it("returns an empty list for text that is not a vCard", () => {
    expect(parseVCard("")).toEqual([]);
    expect(parseVCard("hello")).toEqual([]);
  });
});
