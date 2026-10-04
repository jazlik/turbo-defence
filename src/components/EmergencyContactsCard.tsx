import { useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Contact, FileUp, Pencil, Phone, PenLine, Save, Smartphone, Trash2, X } from "lucide-react";

import { focusSoon, STORAGE_ERROR, StatusLine, TextField, type RecordFeedback } from "@/components/HouseholdFormParts";
import { Button } from "@/components/ui/button";
import {
  addContact,
  filterCandidates,
  MAX_RECORDS,
  phoneHref,
  prepareCandidates,
  removeContact,
  updateContact,
  validateContactInput,
  type ContactErrors,
  type ContactInput,
} from "@/lib/household";
import { isContactPickerSupported, pickPhoneContacts } from "@/lib/services/contact-import";
import { readPlan, writePlan } from "@/lib/services/plan-storage";
import { parseVCard } from "@/lib/vcard";
import { cn } from "@/lib/utils";
import type { EmergencyContact } from "@/types";

const FILTER_THRESHOLD = 8;
const MAX_VISIBLE_CANDIDATES = 50;

type Mode = "choose" | "manual" | "select";

const EMPTY_FORM: ContactInput = { name: "", phone: "", relation: "" };

export default function EmergencyContactsCard() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => readPlan().contacts);
  const [form, setForm] = useState<ContactInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [feedback, setFeedback] = useState<RecordFeedback>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [candidates, setCandidates] = useState<ContactInput[]>([]);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState(0);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = { name: useId(), phone: useId(), relation: useId(), search: useId() };

  /** `false` when the device refused the write: the caller must not confirm a save that did not happen. */
  const persist = (next: EmergencyContact[]): boolean => {
    const saved = writePlan({ ...readPlan(), contacts: next });
    if (saved) setContacts(next);
    else setFeedback({ text: STORAGE_ERROR, tone: "warning" });
    return saved;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setMode("choose");
  };

  const slotsLeft = MAX_RECORDS - contacts.length;

  /** Shared by the phone's contact picker and vCard files: validated candidates go to a selection list. */
  const offerCandidates = (raw: ContactInput[], source: string) => {
    const { candidates: valid, invalid, duplicates } = prepareCandidates(raw, readPlan().contacts);
    if (valid.length === 0) {
      setFeedback({
        text:
          raw.length === 0
            ? `${source}: nie znaleziono kontaktów z numerem telefonu.`
            : `${source}: żaden kontakt nie nadaje się do dodania (zły numer lub już jest na liście).`,
        tone: "warning",
      });
      return;
    }
    setCandidates(valid);
    setChosen(new Set(valid.length === 1 ? [0] : []));
    setSkipped(invalid + duplicates);
    setQuery("");
    setFeedback(null);
    setMode("select");
  };

  const pickFromPhone = async () => {
    setImporting(true);
    setFeedback(null);
    const result = await pickPhoneContacts();
    setImporting(false);
    if (!result.ok) {
      setFeedback({
        text: "Nie udało się otworzyć kontaktów telefonu. Wybierz plik vCard albo wpisz kontakt ręcznie.",
        tone: "warning",
      });
      return;
    }
    if (result.contacts.length > 0) offerCandidates(result.contacts, "Kontakty telefonu");
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setFeedback(null);
    try {
      offerCandidates(parseVCard(await file.text()), "Plik vCard");
    } catch {
      setFeedback({ text: "Nie udało się odczytać pliku. Sprawdź, czy to plik vCard (.vcf).", tone: "warning" });
    }
    setImporting(false);
  };

  const toggleCandidate = (index: number) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < slotsLeft) next.add(index);
      return next;
    });
  };

  const addChosen = () => {
    const current = readPlan().contacts;
    let next = current;
    const picked = candidates.filter((_, index) => chosen.has(index));
    for (const input of picked) next = addContact(next, input);
    if (!persist(next)) return;
    setFeedback({
      text: `Dodano z importu: ${next.length - current.length}${skipped > 0 ? ` (pominięto: ${skipped}, zły numer lub duplikat)` : ""}.`,
    });
    setCandidates([]);
    setMode("choose");
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateContactInput(form);
    if (!result.ok) {
      setErrors(result.errors);
      focusSoon(() => nameRef.current);
      return;
    }
    const current = readPlan().contacts;
    if (editingId) {
      if (!persist(updateContact(current, editingId, result.value))) return;
      setFeedback({ text: `Zapisano zmiany: ${result.value.name}.` });
      focusSoon(() => document.getElementById(`contact-edit-${editingId}`));
    } else {
      if (!persist(addContact(current, result.value))) return;
      setFeedback({ text: `Dodano: ${result.value.name}.` });
    }
    resetForm();
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setMode("manual");
    setForm({ name: contact.name, phone: contact.phone, relation: contact.relation });
    setErrors({});
    setFeedback(null);
    focusSoon(() => nameRef.current);
  };

  const cancelEdit = () => {
    const id = editingId;
    resetForm();
    focusSoon(() => document.getElementById(`contact-edit-${id ?? ""}`));
  };

  const remove = (contact: EmergencyContact) => {
    if (!persist(removeContact(readPlan().contacts, contact.id))) return;
    if (editingId === contact.id) resetForm();
    setFeedback({ text: `Usunięto: ${contact.name}.` });
    focusSoon(() => headingRef.current);
  };

  const atLimit = slotsLeft <= 0;
  const matches = filterCandidates(candidates, query);
  const visible = matches.slice(0, MAX_VISIBLE_CANDIDATES);
  const pickerSupported = isContactPickerSupported();

  return (
    <section
      aria-labelledby="emergency-contacts-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Contact className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2
            id="emergency-contacts-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl tracking-[-0.015em] outline-none"
          >
            Kontakty awaryjne
          </h2>
          <p className="text-muted-foreground mt-1">
            Osoby, do których zadzwonicie, gdy będzie sieć. Numery zostają na tym telefonie i nigdzie nie są wysyłane.
          </p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground mt-6">Kontaktów: nie dodano</p>
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className={cn(
                "flex flex-col gap-2 py-3 sm:flex-row sm:items-center",
                editingId === contact.id && "bg-core-steel-soft -mx-3 rounded-md px-3",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">
                  {contact.name}
                  {contact.relation && <span className="text-muted-foreground font-normal"> · {contact.relation}</span>}
                </p>
                <a
                  href={phoneHref(contact.phone)}
                  className="font-operational text-core-steel-deep focus-visible:ring-ring focus-visible:ring-offset-background -ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
                >
                  <Phone className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {contact.phone}
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  id={`contact-edit-${contact.id}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Edytuj: ${contact.name}`}
                  onClick={() => {
                    startEdit(contact);
                  }}
                >
                  <Pencil strokeWidth={2} aria-hidden="true" />
                  Edytuj
                </Button>
                <Button
                  type="button"
                  variant="ghost-destructive"
                  size="sm"
                  aria-label={`Usuń: ${contact.name}`}
                  onClick={() => {
                    remove(contact);
                  }}
                >
                  <Trash2 strokeWidth={2} aria-hidden="true" />
                  Usuń
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {atLimit && editingId === null ? (
        <p className="text-muted-foreground border-border mt-6 border-t pt-6 text-sm">
          Osiągnięto limit {MAX_RECORDS} kontaktów. Usuń któryś, żeby dodać nowy.
        </p>
      ) : mode === "choose" ? (
        <div className="border-border mt-6 space-y-3 border-t pt-6">
          <h3 className="font-medium">Dodaj kontakt</h3>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setMode("manual");
              focusSoon(() => nameRef.current);
            }}
          >
            <PenLine strokeWidth={2} aria-hidden="true" />
            Wpisz numer telefonu
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void importFile(event)}
          />
          <details>
            <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm">
              Inne sposoby dodania kontaktu
            </summary>
            <div className="space-y-2 pt-2">
              {pickerSupported && (
                <Button type="button" variant="outline" aria-busy={importing} onClick={() => void pickFromPhone()}>
                  <Smartphone strokeWidth={2} aria-hidden="true" />
                  {importing ? "Otwieram kontakty…" : "Z kontaktów telefonu"}
                </Button>
              )}
              <div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="-ml-3"
                  aria-busy={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp strokeWidth={2} aria-hidden="true" />
                  Importuj z pliku vCard
                </Button>
                <p className="text-muted-foreground text-sm">
                  Kontakty z iPhone&apos;a lub iCloud: na iCloud.com otwórz Kontakty, zaznacz osoby i wybierz eksport
                  vCard, zapisz plik w aplikacji Pliki i wskaż go tutaj.
                  {pickerSupported
                    ? ""
                    : " Wybór bezpośrednio z kontaktów telefonu nie jest dostępny w tej przeglądarce. Możesz też skopiować numer z Kontaktów i wkleić go po wybraniu „Wpisz numer telefonu”."}
                </p>
              </div>
            </div>
          </details>
        </div>
      ) : mode === "select" ? (
        <div className="border-border mt-6 space-y-4 border-t pt-6">
          <h3 className="font-medium">Wybierz kontakty do dodania</h3>
          <p className="text-muted-foreground text-sm">
            Zaznaczono: {chosen.size} z {slotsLeft} wolnych miejsc.
          </p>
          {candidates.length > FILTER_THRESHOLD && (
            <TextField
              id={ids.search}
              label="Szukaj w kontaktach"
              type="search"
              autoComplete="off"
              placeholder="imię lub numer"
              value={query}
              onValueChange={setQuery}
            />
          )}
          <ul className="space-y-2">
            {visible.map((index) => {
              const candidate = candidates[index];
              const selected = chosen.has(index);
              const disabled = !selected && chosen.size >= slotsLeft;
              return (
                <li key={`${candidate.phone}-${String(index)}`}>
                  <label
                    className={cn(
                      "border-border flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3",
                      selected && "border-primary bg-core-steel-soft",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      className="accent-primary size-5 shrink-0"
                      onChange={() => {
                        toggleCandidate(index);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{candidate.name}</span>
                      <span className="font-operational text-muted-foreground block text-sm">{candidate.phone}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {matches.length > visible.length && (
            <p className="text-muted-foreground text-sm">
              Pokazano {visible.length} z {matches.length} pasujących. Zawęź wyszukiwanie.
            </p>
          )}
          {matches.length === 0 && <p className="text-muted-foreground text-sm">Brak pasujących kontaktów.</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" size="lg" disabled={chosen.size === 0} onClick={addChosen}>
              <Save strokeWidth={2} aria-hidden="true" />
              Dodaj wybrane ({chosen.size})
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={resetForm}>
              <X strokeWidth={2} aria-hidden="true" />
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="border-border mt-6 space-y-4 border-t pt-6">
          <h3 className="font-medium">{editingId ? "Edytuj kontakt" : "Dodaj kontakt"}</h3>
          <TextField
            id={ids.name}
            label="Imię"
            value={form.name}
            error={errors.name}
            inputRef={nameRef}
            autoComplete="off"
            onValueChange={(name) => {
              setForm((prev) => ({ ...prev, name }));
            }}
          />
          <TextField
            id={ids.phone}
            label="Telefon"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+48 600 100 200"
            value={form.phone}
            error={errors.phone}
            className="font-operational"
            onValueChange={(phone) => {
              setForm((prev) => ({ ...prev, phone }));
            }}
          />
          <TextField
            id={ids.relation}
            label="Relacja"
            hint="opcjonalnie"
            placeholder="np. babcia"
            autoComplete="off"
            value={form.relation}
            error={errors.relation}
            onValueChange={(relation) => {
              setForm((prev) => ({ ...prev, relation }));
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg">
              <Save strokeWidth={2} aria-hidden="true" />
              {editingId ? "Zapisz zmiany" : "Dodaj kontakt"}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={editingId ? cancelEdit : resetForm}>
              <X strokeWidth={2} aria-hidden="true" />
              Anuluj
            </Button>
          </div>
        </form>
      )}

      <StatusLine feedback={feedback} />
    </section>
  );
}
