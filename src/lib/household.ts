import type {
  EmergencyContact,
  HouseholdMember,
  HouseholdPlan,
  MemberCategory,
  MemberNeed,
  PresetNeedKind,
} from "@/types";

export const MAX_RECORDS = 20;
export const MAX_NAME_LENGTH = 60;
export const MAX_RELATION_LENGTH = 40;
export const MAX_NEEDS = 10;
export const MAX_NEED_LABEL_LENGTH = 40;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

export const MEMBER_CATEGORIES: readonly MemberCategory[] = ["adult", "child", "pet"];

export const isMemberCategory = (value: unknown): value is MemberCategory =>
  typeof value === "string" && (MEMBER_CATEGORIES as readonly string[]).includes(value);

export const PRESET_NEEDS: readonly { kind: PresetNeedKind; label: string }[] = [
  { kind: "medication", label: "Leki" },
  { kind: "diabetes", label: "Cukrzyca" },
  { kind: "allergy", label: "Alergia" },
  { kind: "mobility", label: "Ograniczona mobilność" },
  { kind: "diet", label: "Dieta" },
];

export const isPresetNeedKind = (value: unknown): value is PresetNeedKind =>
  PRESET_NEEDS.some((preset) => preset.kind === value);

export function needLabel(need: MemberNeed): string {
  if (need.kind === "custom") return need.label;
  return PRESET_NEEDS.find((preset) => preset.kind === need.kind)?.label ?? "";
}

export const hasNeed = (needs: readonly MemberNeed[], kind: PresetNeedKind) => needs.some((need) => need.kind === kind);

/** Switches a preset on or off. */
export function toggleNeed(needs: readonly MemberNeed[], kind: PresetNeedKind): MemberNeed[] {
  if (hasNeed(needs, kind)) return needs.filter((need) => need.kind !== kind);
  return needs.length >= MAX_NEEDS ? [...needs] : [...needs, { kind }];
}

/** A typed label equal to a preset's label switches that preset on instead of creating a duplicate. */
export function addCustomNeed(needs: readonly MemberNeed[], rawLabel: string): Validation<MemberNeed[], string> {
  const label = rawLabel.trim();
  if (label.length === 0) return { ok: false, errors: "Wpisz nazwę potrzeby." };
  if (label.length > MAX_NEED_LABEL_LENGTH) {
    return { ok: false, errors: `Nazwa potrzeby może mieć najwyżej ${MAX_NEED_LABEL_LENGTH} znaków.` };
  }
  const lower = label.toLocaleLowerCase("pl");
  const preset = PRESET_NEEDS.find((item) => item.label.toLocaleLowerCase("pl") === lower);
  if (preset) {
    return hasNeed(needs, preset.kind)
      ? { ok: false, errors: "Ta potrzeba jest już na liście." }
      : validateNeedCount([...needs, { kind: preset.kind }]);
  }
  if (needs.some((need) => need.kind === "custom" && need.label.toLocaleLowerCase("pl") === lower)) {
    return { ok: false, errors: "Ta potrzeba jest już na liście." };
  }
  return validateNeedCount([...needs, { kind: "custom", label }]);
}

function validateNeedCount(needs: MemberNeed[]): Validation<MemberNeed[], string> {
  return needs.length > MAX_NEEDS
    ? { ok: false, errors: `Najwyżej ${MAX_NEEDS} potrzeb na osobę.` }
    : { ok: true, value: needs };
}

export type MemberInput = Omit<HouseholdMember, "id">;
export type ContactInput = Omit<EmergencyContact, "id">;

export type Validation<TValue, TErrors> = { ok: true; value: TValue } | { ok: false; errors: TErrors };

export interface MemberErrors {
  name?: string;
}

export interface ContactErrors {
  name?: string;
  phone?: string;
  relation?: string;
}

const PHONE_PATTERN = /^[0-9+\-() ]+$/;

function nameError(name: string): string | undefined {
  if (name.length === 0) return "Wpisz imię.";
  if (name.length > MAX_NAME_LENGTH) return `Imię może mieć najwyżej ${MAX_NAME_LENGTH} znaków.`;
  return undefined;
}

function phoneError(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "").length;
  if (phone.length === 0) return "Wpisz numer telefonu.";
  if (!PHONE_PATTERN.test(phone) || digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
    return `Wpisz numer z ${MIN_PHONE_DIGITS}–${MAX_PHONE_DIGITS} cyfr; dozwolone są spacje oraz znaki + - ( ).`;
  }
  return undefined;
}

export function validateMemberInput(input: MemberInput): Validation<MemberInput, MemberErrors> {
  const name = input.name.trim();
  const error = nameError(name);
  if (error) return { ok: false, errors: { name: error } };
  return { ok: true, value: { name, category: input.category, needs: [...input.needs] } };
}

export function validateContactInput(input: ContactInput): Validation<ContactInput, ContactErrors> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const relation = input.relation.trim();
  const errors: ContactErrors = {};
  const nameProblem = nameError(name);
  const phoneProblem = phoneError(phone);
  if (nameProblem) errors.name = nameProblem;
  if (phoneProblem) errors.phone = phoneProblem;
  if (relation.length > MAX_RELATION_LENGTH) {
    errors.relation = `Relacja może mieć najwyżej ${MAX_RELATION_LENGTH} znaków.`;
  }
  if (errors.name || errors.phone || errors.relation) return { ok: false, errors };
  return { ok: true, value: { name, phone, relation } };
}

/** `crypto.randomUUID` needs a secure context; the fallback keeps forms working on plain http in a local network. */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const add = <T extends { id: string }>(list: readonly T[], input: Omit<T, "id">): T[] =>
  list.length >= MAX_RECORDS ? [...list] : [...list, { ...input, id: createId() } as T];

const update = <T extends { id: string }>(list: readonly T[], id: string, input: Omit<T, "id">): T[] =>
  list.map((item) => (item.id === id ? ({ ...input, id } as T) : item));

const remove = <T extends { id: string }>(list: readonly T[], id: string): T[] => list.filter((item) => item.id !== id);

export const addMember = (list: readonly HouseholdMember[], input: MemberInput) => add(list, input);
export const updateMember = (list: readonly HouseholdMember[], id: string, input: MemberInput) =>
  update(list, id, input);
export const removeMember = (list: readonly HouseholdMember[], id: string) => remove(list, id);

export const addContact = (list: readonly EmergencyContact[], input: ContactInput) => add(list, input);
export const updateContact = (list: readonly EmergencyContact[], id: string, input: ContactInput) =>
  update(list, id, input);
export const removeContact = (list: readonly EmergencyContact[], id: string) => remove(list, id);

/** `tel:` link target: digits plus a leading `+`, without spaces and punctuation. */
export function phoneHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

export function summarizeHousehold(plan: Pick<HouseholdPlan, "members" | "contacts">) {
  return { members: plan.members.length, contacts: plan.contacts.length };
}

const digitsOf = (phone: string) => phone.replace(/\D/g, "");

/**
 * Cleans raw candidates from the phone's contact picker or a vCard file: invalid ones and
 * duplicates (same digits as an existing or earlier contact) are counted, not returned.
 */
export function prepareCandidates(raw: readonly ContactInput[], existing: readonly EmergencyContact[]) {
  const seen = new Set(existing.map((contact) => digitsOf(contact.phone)));
  const candidates: ContactInput[] = [];
  let invalid = 0;
  let duplicates = 0;
  for (const item of raw) {
    const result = validateContactInput(item);
    if (!result.ok) {
      invalid += 1;
      continue;
    }
    const digits = digitsOf(result.value.phone);
    if (seen.has(digits)) {
      duplicates += 1;
      continue;
    }
    seen.add(digits);
    candidates.push(result.value);
  }
  return { candidates, invalid, duplicates };
}
