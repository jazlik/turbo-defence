import type { EmergencyContact, HouseholdMember, HouseholdPlan, MemberCategory } from "@/types";

export const MAX_RECORDS = 20;
export const MAX_NAME_LENGTH = 60;
export const MAX_RELATION_LENGTH = 40;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

export const MEMBER_CATEGORIES: readonly MemberCategory[] = ["adult", "child", "pet"];

export const isMemberCategory = (value: unknown): value is MemberCategory =>
  typeof value === "string" && (MEMBER_CATEGORIES as readonly string[]).includes(value);

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
  return { ok: true, value: { name, category: input.category, takesMedication: input.takesMedication } };
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
