import { MAX_NEEDS, MAX_RECORDS } from "./household";
import type { HouseholdMember, PackedItem, PresetNeedKind } from "@/types";

/**
 * Evacuation backpack for 72 hours, derived from the household — like `buildSteps`, the list is
 * computed on every render and only the ticks are stored. Content follows the Poradnik
 * bezpieczeństwa / KW PSP (gov.pl); the water norm is 3 l per person per day (RCB).
 */

export const DAYS = 3;
export const WATER_L_PER_PERSON_DAY = 3;
export const PET_WATER_L_PER_DAY = 1;
export const MEDICATION_DAYS = 7;

export type BackpackGroup = "everyone" | "children" | "pets" | "needs";

export interface BackpackQuantity {
  amount: number;
  unit: string;
  /** How the amount was computed, e.g. "3 os. × 3 l × 3 doby". */
  basis: string;
}

export interface BackpackItem {
  /** Stable — ticks are stored by this id. */
  id: string;
  group: BackpackGroup;
  label: string;
  detail: string | null;
  quantity: BackpackQuantity | null;
  /** Who the item is for; empty for items for everyone. */
  forNames: string[];
}

const BASE_ITEMS = 18;
const CHILD_ITEMS = 6;
const PET_ITEMS = 5;
const PRESET_NEED_ITEMS = 5;

/** Upper bound of the derived list: fixed items plus one custom item per need of every member. */
export const MAX_PACKED_ITEMS = BASE_ITEMS + CHILD_ITEMS + PET_ITEMS + PRESET_NEED_ITEMS + MAX_RECORDS * MAX_NEEDS;

/** Polish plural: 1 → one, 2–4 (not 12–14) → few, otherwise many. */
function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

type UnitForms = readonly [one: string, few: string, many: string];

const PIECES: UnitForms = ["sztuka", "sztuki", "sztuk"];
const SETS: UnitForms = ["komplet", "komplety", "kompletów"];
const RATIONS: UnitForms = ["racja dzienna", "racje dzienne", "racji dziennych"];
const PORTIONS: UnitForms = ["porcja", "porcje", "porcji"];
const DECLINED_UNITS = [PIECES, SETS, RATIONS, PORTIONS];

const unitFor = (amount: number, forms: UnitForms) => plural(amount, ...forms);

/**
 * "27 l", "3 porcje" — `amount` defaults to the current one; an older amount (e.g. before the
 * household grew) gets its own declension of the same unit.
 */
export function formatAmount(quantity: BackpackQuantity, amount = quantity.amount): string {
  const forms = DECLINED_UNITS.find((candidate) => candidate.includes(quantity.unit));
  return `${String(amount)} ${forms ? unitFor(amount, forms) : quantity.unit}`;
}

const days = `${String(DAYS)} doby`;

/** The organizer is not a household member — members are the people who evacuate with them. */
export const peopleCount = (members: readonly HouseholdMember[]) =>
  1 + members.filter((member) => member.category !== "pet").length;

interface ItemTemplate<TContext> {
  id: string;
  label: string;
  detail?: string;
  quantity?: (context: TContext) => BackpackQuantity;
}

const pieces = (amount: number, basis: string): BackpackQuantity => ({
  amount,
  unit: unitFor(amount, PIECES),
  basis,
});

const sets = (amount: number, basis: string): BackpackQuantity => ({
  amount,
  unit: unitFor(amount, SETS),
  basis,
});

const EVERYONE: readonly ItemTemplate<number>[] = [
  {
    id: "water",
    label: "Woda pitna",
    detail: "Zapas na 3 doby trzymaj w domu — do plecaka weź tyle butelek, ile uniesiesz.",
    quantity: (people) => ({
      amount: people * WATER_L_PER_PERSON_DAY * DAYS,
      unit: "l",
      basis: `${String(people)} os. × ${String(WATER_L_PER_PERSON_DAY)} l × ${days}`,
    }),
  },
  {
    id: "food",
    label: "Jedzenie o długim terminie przydatności",
    detail: "Konserwy z otwieraniem, batony, suchary — bez gotowania.",
    quantity: (people) => {
      const amount = people * DAYS;
      return {
        amount,
        unit: unitFor(amount, RATIONS),
        basis: `${String(people)} os. × ${days}`,
      };
    },
  },
  {
    id: "clothes",
    label: "Ubranie na zmianę i kurtka przeciwdeszczowa",
    detail: "Także bielizna, skarpety i wygodne buty.",
    quantity: (people) => sets(people, `${String(people)} os.`),
  },
  {
    id: "blanket",
    label: "Koc lub śpiwór",
    quantity: (people) => pieces(people, `${String(people)} os.`),
  },
  {
    id: "masks",
    label: "Maseczki ochronne",
    quantity: (people) => pieces(people * DAYS, `${String(people)} os. × ${days}`),
  },
  {
    id: "documents",
    label: "Dokumenty i ich kopie na pendrive",
    detail: "Dowody, paszporty, akty, polisy — w wodoszczelnej koszulce.",
  },
  { id: "cash", label: "Gotówka w drobnych nominałach" },
  { id: "flashlight", label: "Latarka i zapasowe baterie" },
  { id: "radio", label: "Radio na baterie lub korbkę" },
  { id: "powerbank", label: "Powerbank i kabel do telefonu" },
  {
    id: "first-aid",
    label: "Apteczka z folią NRC",
    detail: "Opatrunki, środek do dezynfekcji, leki przeciwbólowe.",
  },
  { id: "fire", label: "Zapalniczka lub zapałki" },
  { id: "knife", label: "Scyzoryk lub multitool" },
  { id: "whistle", label: "Gwizdek" },
  { id: "hygiene", label: "Mydło i żel do dezynfekcji rąk" },
  { id: "trash-bags", label: "Worki na śmieci" },
  { id: "notebook", label: "Notes i długopis" },
  { id: "guide", label: "Poradnik bezpieczeństwa w wersji papierowej" },
];

const CHILDREN: readonly ItemTemplate<number>[] = [
  { id: "child-documents", label: "Dokumenty dziecka", detail: "Legitymacja, paszport lub akt urodzenia." },
  {
    id: "child-clothes",
    label: "Ubrania na zmianę dla dziecka",
    quantity: (children) => sets(children, `${String(children)} ${plural(children, "dziecko", "dzieci", "dzieci")}`),
  },
  { id: "child-snacks", label: "Przekąski i picie dla dziecka" },
  { id: "child-diapers", label: "Pieluchy i chusteczki", detail: "Jeśli potrzebne." },
  { id: "child-toy", label: "Ulubiona zabawka lub książeczka" },
  {
    id: "child-card",
    label: "Kartka z imieniem dziecka i telefonem rodzica",
    detail: "W kieszeni dziecka, na wypadek rozdzielenia.",
  },
];

const PETS: readonly ItemTemplate<number>[] = [
  {
    id: "pet-food",
    label: `Karma na ${days}`,
    quantity: (pets) => {
      const amount = pets * DAYS;
      return {
        amount,
        unit: unitFor(amount, PORTIONS),
        basis: `${String(pets)} ${plural(pets, "zwierzę", "zwierzęta", "zwierząt")} × ${days}`,
      };
    },
  },
  {
    id: "pet-water",
    label: "Woda dla zwierząt",
    quantity: (pets) => ({
      amount: pets * PET_WATER_L_PER_DAY * DAYS,
      unit: "l",
      basis: `${String(pets)} ${plural(pets, "zwierzę", "zwierzęta", "zwierząt")} × ${String(PET_WATER_L_PER_DAY)} l × ${days}`,
    }),
  },
  { id: "pet-leash", label: "Smycz lub transporter" },
  { id: "pet-bowl", label: "Miska" },
  { id: "pet-vaccinations", label: "Książeczka szczepień" },
];

const NEEDS: readonly { kind: PresetNeedKind; label: string }[] = [
  { kind: "medication", label: `Leki stałe na ${String(MEDICATION_DAYS)} dni i lista dawek` },
  { kind: "diabetes", label: "Glukometr, paski, insulina w torbie chłodzącej i glukoza" },
  { kind: "allergy", label: "Leki przeciwalergiczne (i adrenalina, jeśli przepisana)" },
  { kind: "mobility", label: "Sprzęt pomocniczy i zapasowe okulary lub baterie do aparatu słuchowego" },
  { kind: "diet", label: `Jedzenie zgodne z dietą na ${days}` },
];

function fromTemplates<TContext>(
  templates: readonly ItemTemplate<TContext>[],
  group: BackpackGroup,
  context: TContext,
  forNames: string[],
): BackpackItem[] {
  return templates.map((template) => ({
    id: template.id,
    group,
    label: template.label,
    detail: template.detail ?? null,
    quantity: template.quantity ? template.quantity(context) : null,
    forNames,
  }));
}

const namesOf = (members: readonly HouseholdMember[]) => members.map((member) => member.name);

export function buildBackpack(members: readonly HouseholdMember[]): BackpackItem[] {
  const children = members.filter((member) => member.category === "child");
  const pets = members.filter((member) => member.category === "pet");
  const items = fromTemplates(EVERYONE, "everyone", peopleCount(members), []);
  if (children.length > 0) items.push(...fromTemplates(CHILDREN, "children", children.length, namesOf(children)));
  if (pets.length > 0) items.push(...fromTemplates(PETS, "pets", pets.length, namesOf(pets)));

  for (const need of NEEDS) {
    const withNeed = members.filter((member) => member.needs.some((item) => item.kind === need.kind));
    if (withNeed.length === 0) continue;
    items.push({
      id: `need-${need.kind}`,
      group: "needs",
      label: need.label,
      detail: null,
      // The amount is the number of people: a second person with the need un-ticks the item.
      quantity: { amount: withNeed.length, unit: "os.", basis: `${String(withNeed.length)} os. z tą potrzebą` },
      forNames: namesOf(withNeed),
    });
  }

  const seen = new Set<string>();
  for (const member of members) {
    for (const need of member.needs) {
      if (need.kind !== "custom") continue;
      const id = `custom:${member.id}:${need.label.toLocaleLowerCase("pl")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        group: "needs",
        label: `Zabierz: ${need.label}`,
        detail: null,
        quantity: null,
        forNames: [member.name],
      });
    }
  }
  return items;
}

export type PackedStatus = "packed" | "unpacked" | "outdated";

export interface ItemState {
  status: PackedStatus;
  /** The quantity the tick was made for, when the required amount has grown since. */
  previousAmount: number | null;
}

/** A tick counts only while the quantity it was made for still covers the current requirement. */
export function itemState(item: BackpackItem, packed: readonly PackedItem[]): ItemState {
  const record = packed.find((entry) => entry.itemId === item.id);
  if (!record) return { status: "unpacked", previousAmount: null };
  if (!item.quantity) return { status: "packed", previousAmount: null };
  if (record.quantity === null) return { status: "outdated", previousAmount: null };
  return record.quantity < item.quantity.amount
    ? { status: "outdated", previousAmount: record.quantity }
    : { status: "packed", previousAmount: null };
}

/** Keeps only ticks for items on the current list. Run on user-initiated writes only, never on read. */
export function prunePacked(packed: readonly PackedItem[], items: readonly BackpackItem[]): PackedItem[] {
  const ids = new Set(items.map((item) => item.id));
  return packed.filter((entry) => ids.has(entry.itemId)).slice(0, MAX_PACKED_ITEMS);
}

/** Ticking stores the current quantity (also for an outdated item); un-ticking removes the record. */
export function togglePacked(
  packed: readonly PackedItem[],
  item: BackpackItem,
  checked: boolean,
  items: readonly BackpackItem[],
): PackedItem[] {
  const rest = packed.filter((entry) => entry.itemId !== item.id);
  const next = checked ? [...rest, { itemId: item.id, quantity: item.quantity?.amount ?? null }] : rest;
  return prunePacked(next, items);
}

export function summarizeBackpack(items: readonly BackpackItem[], packed: readonly PackedItem[]) {
  return {
    packed: items.filter((item) => itemState(item, packed).status === "packed").length,
    total: items.length,
  };
}
