import type { ContactInput } from "./household";

const unescapeValue = (value: string) =>
  value.replace(/\\([\\,;nN])/g, (_match, char: string) => (char === "n" || char === "N" ? " " : char));

/** vCard 2.1 may encode values as quoted-printable UTF-8 (`=C5=81` → `Ł`). */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < value.length; i += 1) {
    const hex = value.slice(i + 1, i + 3);
    if (value[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...encoder.encode(value[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** vCard folds long lines: a continuation starts with a space or a tab. */
const unfold = (text: string) =>
  text
    .replace(/\r\n|\r/g, "\n")
    .replace(/=\n/g, "") // quoted-printable soft line break
    .replace(/\n[ \t]/g, "");

function nameFromStructured(value: string): string {
  const [family = "", given = ""] = value.split(";");
  return [given, family]
    .map((part) => unescapeValue(part).trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Reads contacts from vCard text (2.1, 3.0 and 4.0 as exported by Android and iOS):
 * the display name (`FN`, else `N`) and the first phone number (`TEL`). Cards without a number are skipped.
 */
export function parseVCard(text: string): ContactInput[] {
  const contacts: ContactInput[] = [];
  const cards = unfold(text)
    .split(/^BEGIN:VCARD\s*$/im)
    .slice(1);

  for (const card of cards) {
    let fullName = "";
    let structuredName = "";
    let phone = "";
    for (const line of card.split("\n")) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      // `item1.TEL;TYPE=CELL` → `TEL`
      const [rawProperty = "", ...parameters] = line.slice(0, separator).split(";");
      const property = rawProperty.replace(/^.*\./, "").toUpperCase();
      const rawValue = line.slice(separator + 1).trim();
      const value = parameters.some((parameter) => /QUOTED-PRINTABLE/i.test(parameter))
        ? decodeQuotedPrintable(rawValue)
        : rawValue;
      if (property === "FN" && !fullName) fullName = unescapeValue(value).trim();
      else if (property === "N" && !structuredName) structuredName = nameFromStructured(value);
      else if (property === "TEL" && !phone) phone = value.replace(/^tel:/i, "").trim();
    }
    if (!phone) continue;
    contacts.push({ name: fullName || structuredName || phone, phone, relation: "" });
  }
  return contacts;
}
