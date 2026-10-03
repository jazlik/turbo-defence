import type { ContactInput } from "../household";

interface PickedContact {
  name?: string[];
  tel?: string[];
}

interface ContactsManager {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<PickedContact[]>;
}

export type PickResult = { ok: true; contacts: ContactInput[] } | { ok: false };

/** The Contact Picker API exists in Chrome on Android; Safari on iOS and desktop browsers lack it. */
export function isContactPickerSupported(): boolean {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

/** Opens the system contact picker (needs a user gesture). Cancelling or a failure yields `ok: false`. */
export async function pickPhoneContacts(): Promise<PickResult> {
  try {
    const manager = (navigator as Navigator & { contacts: ContactsManager }).contacts;
    const picked = await manager.select(["name", "tel"], { multiple: true });
    const contacts = picked.flatMap((item) => {
      const phone = item.tel?.[0]?.trim();
      if (!phone) return [];
      const name = item.name?.[0]?.trim() ?? "";
      return [{ name: name === "" ? phone : name, phone, relation: "" }];
    });
    return { ok: true, contacts };
  } catch {
    return { ok: false };
  }
}
