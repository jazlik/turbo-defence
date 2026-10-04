import { useId, useRef, useState, type SyntheticEvent } from "react";
import { Baby, Check, PawPrint, Pencil, Plus, Save, Trash2, UserRound, Users, X } from "lucide-react";

import { focusSoon, STORAGE_ERROR, StatusLine, TextField, type RecordFeedback } from "@/components/HouseholdFormParts";
import { Button } from "@/components/ui/button";
import { buildBackpack, prunePacked } from "@/lib/backpack";
import {
  addCustomNeed,
  addMember,
  MAX_RECORDS,
  needLabel,
  removeMember,
  updateMember,
  validateMemberInput,
  type MemberErrors,
  type MemberInput,
} from "@/lib/household";
import { readPlan, writePlan } from "@/lib/services/plan-storage";
import { cn } from "@/lib/utils";
import type { HouseholdMember, MemberCategory } from "@/types";

const CATEGORIES: { value: MemberCategory; label: string; Icon: typeof UserRound }[] = [
  { value: "adult", label: "Dorosły", Icon: UserRound },
  { value: "child", label: "Dziecko", Icon: Baby },
  { value: "pet", label: "Zwierzę", Icon: PawPrint },
];

const categoryLabel = (category: MemberCategory) => CATEGORIES.find((item) => item.value === category)?.label ?? "";

const EMPTY_FORM: MemberInput = { name: "", category: "adult", needs: [] };

export default function HouseholdMembersCard() {
  const [members, setMembers] = useState<HouseholdMember[]>(() => readPlan().members);
  const [form, setForm] = useState<MemberInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The form is its own view: the list stays calm, and only one thing asks for attention at a time.
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState<MemberErrors>({});
  const [feedback, setFeedback] = useState<RecordFeedback>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [needError, setNeedError] = useState<string | undefined>();
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = { name: useId(), category: useId(), customNeed: useId() };

  /** `false` when the device refused the write: the caller must not confirm a save that did not happen. */
  const persist = (next: HouseholdMember[]): boolean => {
    const plan = readPlan();
    // Item ids for children, pets and needs are per group: without pruning here, removing one
    // child and adding another would bring back the first child's ticks.
    const packedItems = prunePacked(plan.packedItems, buildBackpack(next));
    const saved = writePlan({ ...plan, members: next, packedItems });
    if (saved) setMembers(next);
    else setFeedback({ text: STORAGE_ERROR, tone: "warning" });
    return saved;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setCustomDraft("");
    setNeedError(undefined);
    setFormOpen(false);
  };

  const openAdd = () => {
    setFeedback(null);
    setFormOpen(true);
    focusSoon(() => nameRef.current);
  };

  const addDraftNeed = (): MemberInput | null => {
    if (customDraft.trim() === "") return form;
    const result = addCustomNeed(form.needs, customDraft);
    if (!result.ok) {
      setNeedError(result.errors);
      return null;
    }
    const next = { ...form, needs: result.value };
    setForm(next);
    setCustomDraft("");
    setNeedError(undefined);
    return next;
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Text typed in "Inna potrzeba" but not yet added is kept rather than silently dropped.
    const withDraft = addDraftNeed();
    if (!withDraft) return;
    const result = validateMemberInput(withDraft);
    if (!result.ok) {
      setErrors(result.errors);
      focusSoon(() => nameRef.current);
      return;
    }
    const current = readPlan().members;
    if (editingId) {
      if (!persist(updateMember(current, editingId, result.value))) return;
      setFeedback({ text: `Zapisano zmiany: ${result.value.name}.` });
      focusSoon(() => document.getElementById(`member-edit-${editingId}`));
    } else {
      if (!persist(addMember(current, result.value))) return;
      setFeedback({ text: `Dodano: ${result.value.name}.` });
      focusSoon(() => document.getElementById("member-add"));
    }
    resetForm();
  };

  const startEdit = (member: HouseholdMember) => {
    setEditingId(member.id);
    setFormOpen(true);
    setForm({ name: member.name, category: member.category, needs: member.needs });
    setCustomDraft("");
    setNeedError(undefined);
    setErrors({});
    setFeedback(null);
    focusSoon(() => nameRef.current);
  };

  const cancelEdit = () => {
    const id = editingId;
    resetForm();
    focusSoon(() => document.getElementById(id ? `member-edit-${id}` : "member-add"));
  };

  const remove = (member: HouseholdMember) => {
    if (!persist(removeMember(readPlan().members, member.id))) return;
    if (editingId === member.id) resetForm();
    setFeedback({ text: `Usunięto: ${member.name}.` });
    focusSoon(() => headingRef.current);
  };

  const atLimit = members.length >= MAX_RECORDS;

  return (
    <section
      aria-labelledby="household-members-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Users className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2
            id="household-members-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl tracking-[-0.015em] outline-none"
          >
            Domownicy
          </h2>
          <p className="text-muted-foreground mt-1">
            Kto z Wami ewakuuje się razem i czego potrzebuje. To pozwoli dobrać plecak do Waszej rodziny.
          </p>
        </div>
      </div>

      {formOpen ? null : members.length === 0 ? (
        <p className="text-muted-foreground mt-6">Domowników: nie dodano</p>
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {members.map((member) => {
            const Icon = CATEGORIES.find((item) => item.value === member.category)?.Icon ?? UserRound;
            return (
              <li key={member.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Icon className="text-core-steel-deep mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium break-words">{member.name}</p>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-sm">
                      <span>{categoryLabel(member.category)}</span>
                    </p>
                    {member.needs.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Potrzeby">
                        {member.needs.map((need) => (
                          <li
                            key={need.kind === "custom" ? `custom-${need.label}` : need.kind}
                            className="bg-core-steel-soft text-core-steel-deep rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {needLabel(need)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    id={`member-edit-${member.id}`}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Edytuj: ${member.name}`}
                    onClick={() => {
                      startEdit(member);
                    }}
                  >
                    <Pencil strokeWidth={2} aria-hidden="true" />
                    Edytuj
                  </Button>
                  <Button
                    type="button"
                    variant="ghost-destructive"
                    size="sm"
                    aria-label={`Usuń: ${member.name}`}
                    onClick={() => {
                      remove(member);
                    }}
                  >
                    <Trash2 strokeWidth={2} aria-hidden="true" />
                    Usuń
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen ? (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <h3 className="font-medium">{editingId ? "Edytuj domownika" : "Dodaj domownika"}</h3>
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

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Kategoria</legend>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ value, label, Icon }) => {
                const selected = form.category === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "border-input bg-surface has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-background flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-2 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-offset-2",
                      selected && "border-primary bg-core-steel-soft text-core-steel-deep font-medium",
                    )}
                  >
                    <input
                      type="radio"
                      name={ids.category}
                      value={value}
                      checked={selected}
                      className="sr-only"
                      onChange={() => {
                        setForm((prev) => ({ ...prev, category: value }));
                      }}
                    />
                    {selected ? (
                      <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                    )}
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-3">
            {form.needs.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Dodane potrzeby">
                {form.needs.map((need, index) => (
                  <li
                    key={need.kind === "custom" ? `custom-${need.label}` : need.kind}
                    className="bg-core-steel-soft text-core-steel-deep flex min-h-11 items-center gap-1 rounded-md pl-3 text-sm font-medium"
                  >
                    {needLabel(need)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Usuń potrzebę: ${needLabel(need)}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, needs: prev.needs.filter((_, i) => i !== index) }));
                      }}
                    >
                      <X strokeWidth={2} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <TextField
              id={ids.customNeed}
              label="Potrzeby"
              hint="opcjonalnie"
              description="Wpisz jedną potrzebę i dotknij „Dodaj”, np. leki, cukrzyca, alergia, wózek, dieta."
              autoComplete="off"
              value={customDraft}
              error={needError}
              onValueChange={(value) => {
                setCustomDraft(value);
                setNeedError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addDraftNeed();
                }
              }}
              action={
                <Button type="button" variant="outline" aria-label="Dodaj potrzebę" onClick={addDraftNeed}>
                  <Plus strokeWidth={2} aria-hidden="true" />
                  Dodaj
                </Button>
              }
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg">
              <Save strokeWidth={2} aria-hidden="true" />
              {editingId ? "Zapisz zmiany" : "Dodaj domownika"}
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={cancelEdit}>
              <X strokeWidth={2} aria-hidden="true" />
              Anuluj
            </Button>
          </div>
        </form>
      ) : atLimit ? (
        <p className="text-muted-foreground border-border mt-6 border-t pt-6 text-sm">
          Osiągnięto limit {MAX_RECORDS} domowników. Usuń kogoś, żeby dodać nową osobę.
        </p>
      ) : (
        <Button
          id="member-add"
          type="button"
          size="lg"
          variant={members.length === 0 ? "default" : "outline"}
          className="mt-6 w-full sm:w-auto"
          onClick={openAdd}
        >
          <Plus strokeWidth={2} aria-hidden="true" />
          Dodaj domownika
        </Button>
      )}

      <StatusLine feedback={feedback} />
    </section>
  );
}
