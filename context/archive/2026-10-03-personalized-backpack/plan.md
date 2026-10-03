# Spersonalizowana checklista plecaka (S-06) — plan implementacji

## Overview

Organizator dostaje stronę `/plecak` z checklistą plecaka ewakuacyjnego na 72 h, wyliczaną ze składu rodziny zapisanego w S-05: pozycje bazowe z Poradnika bezpieczeństwa (gov.pl), pozycje dla dzieci i zwierząt, pozycje dla pięciu potrzeb z listy (leki, cukrzyca, alergia, mobilność, dieta) i po jednej pozycji na każdą potrzebę wpisaną ręcznie. Kluczowe pozycje mają ilości liczone dla tej rodziny. Odhaczenia zapisują się w planie (`schemaVersion` 3 → 4), a strona główna dostaje kartę-link z postępem.

Roadmap: `S-06`, change id `personalized-backpack`, prerequisite `S-05` (wdrożone, commit `9d1d93d`). PRD: FR-003 (must-have), NFR (offline-first, UI po polsku, dane nie opuszczają urządzenia). Odblokowuje `S-07` (krok onboardingu „plecak”) i `S-08` (niespakowany plecak jako luka gotowości).

## Current State Analysis

- `src/types.ts`: `HouseholdPlan` ma `schemaVersion: 3`, `places`, `lastKnownPosition`, `members`, `contacts`, `updatedAt`. Domownik: `category` (`adult` / `child` / `pet`) i `needs: MemberNeed[]` — preset ze stałym `kind` (`medication`, `diabetes`, `allergy`, `mobility`, `diet`) albo `{ kind: "custom", label }`. Komentarz przy `PresetNeedKind` mówi wprost, że stałe `kind` są dla reguł S-06.
- `src/lib/services/plan-storage.ts`: `CURRENT_SCHEMA_VERSION = 3`, gałęzie migracji dla v2 i v1 w `parsePlanWithSource`, nieznana wersja → `source: "unreadable"`. Listy parsuje `parseList` (uszkodzony rekord pominięty, reszta przeżywa, limit).
- `src/lib/household.ts`: czyste funkcje S-05 (`PRESET_NEEDS`, `needLabel`, `MAX_RECORDS = 20`, `MAX_NEEDS = 10`). Plecak nie ma tu żadnej treści.
- `src/lib/evacuation-steps.ts:8`: `BACKPACK_STEP` to statyczny krok „Zabierz plecak ewakuacyjny” — **zostaje bez zmian** (decyzja planu).
- Wzorce do powtórzenia: strona `src/pages/domownicy.astro` (link „Wróć do planu”, nagłówek, wyspy `client:only="react"`), karta-link `src/components/HouseholdLinkCard.tsx` (podsumowanie z planu, odświeżenie na `pageshow` przy powrocie z bfcache), zapis w `HouseholdMembersCard.tsx` (`writePlan({ ...readPlan(), pole })`, `STORAGE_ERROR` z `HouseholdFormParts.tsx` przy `false`).
- `scripts/smoke.mjs:33` i `:42` wyliczają strony i pliki precache — `/plecak` trzeba dopisać. Glob w `scripts/generate-sw.mjs` złapie `plecak.html` sam.
- `JEZYK_WIZUALNY.md` nie ma wzorca checklisty; w `src/components/ui/` jest tylko `button`. Wiersz checklisty projektujemy z istniejących tokenów (§4, §10, §13, §15).

## Desired End State

Na telefonie, także w trybie samolotowym:

1. Strona główna ma kartę „Plecak ewakuacyjny” z postępem „Spakowane: 8 z 17” (albo „Nic jeszcze nie spakowano.”) i linkiem do `/plecak`.
2. `/plecak` pokazuje tytuł, krótki kontekst, linię postępu i pozycje w grupach: **Dla wszystkich**, **Dzieci**, **Zwierzęta**, **Potrzeby zdrowotne**. Grupa bez pozycji się nie pokazuje.
3. Ilości dla kluczowych pozycji są liczone dla tej rodziny, z podstawą wyliczenia, np. „Woda pitna — 27 l · 3 osoby × 3 l × 3 doby”.
4. Pozycje z potrzeb mówią, kogo dotyczą, np. „Leki stałe na 7 dni i lista dawek — Ania, Jan”; potrzeba wpisana ręcznie daje pozycję „Zabierz: insulina — Ania”.
5. Odhaczenie zapisuje się od razu. Gdy wymagana ilość wzrośnie (nowy domownik), pozycja wraca jako niespakowana ze stanem „Ilość wzrosła — wcześniej 18 l” (tekst + ikona, kolor uwagi).
6. Przy pustej rodzinie lista pokazuje pozycje bazowe dla 1 osoby i podpowiedź z linkiem „Dodaj domowników, żeby dopasować plecak”.
7. Plan v3 (oraz v2, v1) otwiera się bez utraty danych i bez odhaczeń; pierwszy zapis podnosi go do v4.

Weryfikacja: `npm run lint`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke` przechodzą lokalnie i w CI; punkty 1–7 sprawdzone ręcznie na telefonie w trybie samolotowym.

### Key Discoveries:

- **Organizator nie jest domownikiem.** `/domownicy` opisuje domowników jako osoby, „które ewakuują się razem z Tobą” (`src/pages/domownicy.astro`). Liczba osób do ilości = 1 + dorośli + dzieci; zwierzęta liczą się osobno w swoich pozycjach.
- **Jeden mechanizm na „lista nie kłamie”.** Odhaczenie pamięta ilość, dla której zostało zrobione. Pozycja jest spakowana tylko, gdy zapamiętana ilość ≥ wymaganej. Dla pozycji z potrzeb ilością jest liczba osób z tą potrzebą — dodanie drugiej osoby przyjmującej leki też cofa odhaczenie, bez osobnej logiki.
- **Lista jest wyliczana, nie zapisywana** — jak `buildSteps`. Zapisujemy tylko odhaczenia po stabilnym `id` pozycji; treść i reguły żyją w jednym pliku `src/lib/backpack.ts`.
- **Źródło treści:** Poradnik bezpieczeństwa / KW PSP ([gov.pl](https://www.gov.pl/web/kwpsp-poznan/plecak-ewakuacyjny--bezpieczenstwa)) — 72 h, woda 3 l na osobę na dobę (RCB). Te same źródła zalecają osobny plecak dla każdego domownika; MVP świadomie trzyma jedną listę gospodarstwa z ilościami (patrz „What We're NOT Doing”).
- **Woda: zapas w domu, nie w plecaku.** Norma RCB (3 l/os./dobę × 3 doby = 9 l/os.) zostaje jako ilość pozycji, a jej opis mówi, że zapas trzymamy w domu, a do plecaka bierzemy tyle butelek, ile się uniesie. Strona KW PSP podaje ok. 4 l na plecak; listy z gov.pl nie uzupełniamy o pozycje spoza niej (decyzja z weryfikacji 1.5).
- **Wiele wysp, jeden klucz.** `/plecak` ma jedną wyspę, ale `/domownicy` i karty miejsc piszą do tego samego `wrw.plan` — zapis odhaczeń idzie przez `readPlan()` tuż przed `writePlan`.

## What We're NOT Doing

- Zmiana kroku „Zabierz plecak” w trybie alarmu (`BACKPACK_STEP`) i komunikatów głosu — plecak to przygotowanie w spokojnym czasie.
- Pozycje dopisywane ręcznie przez organizatora (poza potrzebami domowników).
- Osobne plecaki per domownik i przypisywanie pozycji do osób.
- Daty ważności, przypomnienia o odświeżeniu zapasów (preparedness decay), eksport do PDF.
- Poziom gotowości, quick winy i milestones (S-08, FR-008/009/016) — tu tylko `summarizeBackpack` jako wejście dla S-08.
- Krok onboardingu (S-07) — komponent ma się dać tam osadzić, ale onboardingu nie budujemy.
- Rozróżnianie wieku dzieci (niemowlę vs nastolatek) — pozycje dziecięce są sformułowane warunkowo („jeśli potrzebne”).

## Implementation Approach

Treść, reguły i ilości to czyste funkcje w nowym `src/lib/backpack.ts` z testami Vitest — wyspa tylko wyświetla wynik i woła `togglePacked`. Schemat planu rośnie o jedno pole (`packedItems`) z migracją wszystkich starszych wersji do pustej listy. UI powtarza wzorzec S-05: podstrona + karta-link z odświeżeniem na `pageshow`.

## Critical Implementation Details

- **State sequencing:** czyszczenie odhaczeń (`prunePacked`) działa tylko przy zapisie inicjowanym przez użytkownika (odhaczenie na `/plecak` albo zapis domowników na `/domownicy`), nigdy przy odczycie. Id pozycji dziecięcych, zwierzęcych i `need-*` są grupowe, więc bez czyszczenia przy zapisie domowników usunięcie dziecka i dodanie innego przywróciłoby stare odhaczenia. Wyświetlenie strony z chwilowo pustą listą domowników (np. nieczytelny plan) nie może skasować odhaczeń.
- **Odhaczenie pozycji w stanie „ilość wzrosła”** zapisuje nową, bieżącą ilość (pozycja staje się spakowana); odznaczenie usuwa rekord całkiem.

## Phase 1: Model danych, migracja i reguły plecaka

### Overview

Typy i schemat v4, treść checklisty z regułami i ilościami, logika stanu odhaczeń — wszystko jako czyste funkcje z testami.

### Changes Required:

#### 1. Typy

**File**: `src/types.ts`

**Intent**: Plan przechowuje odhaczenia plecaka razem z ilością, dla której zostały zrobione.

**Contract**: nowy typ `PackedItem { itemId: string; quantity: number | null }`; `HouseholdPlan.schemaVersion: 4` i nowe pole `packedItems: PackedItem[]`. `quantity: null` dla pozycji bez ilości.

#### 2. Schemat i migracja

**File**: `src/lib/services/plan-storage.ts`

**Intent**: Bieżąca wersja 4; v3, v2 i v1 migrują z pustą listą odhaczeń, bez utraty miejsc, pozycji i ludzi.

**Contract**: `CURRENT_SCHEMA_VERSION = 4`; `createEmptyPlan` z `packedItems: []`; gałąź `schemaVersion === 3` (pola jak dziś + `packedItems: []`, `source: "migrated"`); istniejące gałęzie v2/v1 dostają `packedItems: []`. Parser `parsePackedItem` (niepusty `itemId`, `quantity` skończona liczba ≥ 0 albo `null`) przez `parseList` z limitem `MAX_PACKED_ITEMS` (eksportowany z `backpack.ts`, wyliczony z największej możliwej listy: 18 + 6 + 5 + 5 + `MAX_RECORDS` × `MAX_NEEDS` = 234 — mniejszy limit gubiłby odhaczenia). Duplikaty `itemId` — zostaje pierwszy.

#### 3. Treść i reguły checklisty

**File**: `src/lib/backpack.ts` (nowy)

**Intent**: Jedno źródło treści plecaka i reguł dopasowania; lista wyliczana z `members`.

**Contract**:

- `BackpackGroup = "everyone" | "children" | "pets" | "needs"`; `BackpackItem { id; group; label; detail: string | null; quantity: { amount: number; unit: string; basis: string } | null; forNames: string[] }`.
- `buildBackpack(members: HouseholdMember[]): BackpackItem[]` — kolejność: grupy w kolejności powyżej, w grupie kolejność z tablic treści.
- `peopleCount(members) = 1 + dorośli + dzieci`.
- Stałe norm w jednym miejscu: `DAYS = 3`, `WATER_L_PER_PERSON_DAY = 3`, `PET_WATER_L_PER_DAY = 1`, `MEDICATION_DAYS = 7`.
- **Dla wszystkich** (id stabilne, np. `water`, `food`…): woda pitna (`peopleCount × 3 l × 3 doby`, jednostka „l”), jedzenie o długim terminie (`peopleCount × 3` racji dziennych), ubranie na zmianę i kurtka przeciwdeszczowa (`peopleCount` kompletów), koc lub śpiwór (`peopleCount`), maseczki ochronne (`peopleCount × 3`), dokumenty i ich kopie na pendrive, gotówka w drobnych nominałach, latarka i zapasowe baterie, radio na baterie lub korbkę, powerbank i kabel, apteczka z folią NRC, zapalniczka lub zapałki, scyzoryk lub multitool, gwizdek, mydło i żel do dezynfekcji, worki na śmieci, notes i długopis, Poradnik bezpieczeństwa (wersja papierowa).
- **Dzieci** (gdy ≥ 1 dziecko, `forNames` = dzieci): dokumenty dziecka, ubrania na zmianę dla dziecka (liczba dzieci), przekąski i picie dla dziecka, pieluchy i chusteczki (jeśli potrzebne), ulubiona zabawka lub książeczka, kartka z imieniem i telefonem rodzica w kieszeni dziecka.
- **Zwierzęta** (gdy ≥ 1 zwierzę): karma na 3 doby (liczba zwierząt × 3 porcje), woda dla zwierząt (`pets × 1 l × 3 doby`), smycz lub transporter, miska, książeczka szczepień.
- **Potrzeby zdrowotne** (preset; `forNames` = osoby z tą potrzebą, `quantity.amount` = ich liczba, jednostka „os.”): `need-medication` „Leki stałe na 7 dni i lista dawek”, `need-diabetes` „Glukometr, paski, insulina w torbie chłodzącej i glukoza”, `need-allergy` „Leki przeciwalergiczne (i adrenalina, jeśli przepisana)”, `need-mobility` „Sprzęt pomocniczy i zapasowe okulary lub baterie do aparatu”, `need-diet` „Jedzenie zgodne z dietą na 3 doby”.
- **Potrzeby własne**: jedna pozycja na parę (domownik, etykieta): `id = custom:<memberId>:<etykieta małymi literami, locale pl>`, `label = "Zabierz: <etykieta>"`, `forNames = [imię]`, `quantity = null`.
- Kopia: `basis` po polsku bez odmiany liczebników tam, gdzie się da (np. „3 os. × 3 l × 3 doby”).
- `formatAmount(quantity, amount = quantity.amount)` — ilość z jednostką odmienioną dla podanej liczby („3 porcje”, „6 porcji”); używane także dla `previousAmount` w stanie „Ilość wzrosła”.

#### 4. Stan odhaczeń

**File**: `src/lib/backpack.ts`

**Intent**: Wyspa i przyszły S-08 pytają jedną funkcję o stan pozycji i podsumowanie.

**Contract**:

- `itemState(item, packed: PackedItem[]): { status: "packed" | "unpacked" | "outdated"; previousAmount: number | null }` — `outdated`, gdy rekord istnieje, ale `record.quantity < item.quantity.amount`; rekord z `quantity: null` dla pozycji z ilością traktowany jako `outdated` z `previousAmount: null`.
- `togglePacked(packed, item, checked: boolean, items: BackpackItem[]): PackedItem[]` — zaznaczenie wstawia/nadpisuje rekord z bieżącą ilością; odznaczenie usuwa; wynik przechodzi przez `prunePacked(…, items)`.
- `prunePacked(packed, items)` — zostają tylko rekordy, których `itemId` jest na bieżącej liście; limit `MAX_PACKED_ITEMS`.
- `summarizeBackpack(items, packed): { packed: number; total: number }` — liczy tylko status `packed`.

#### 5. Testy

**Files**: `src/lib/backpack.test.ts` (nowy), `src/lib/services/plan-storage.test.ts`

**Intent**: Pokryć reguły, ilości, stan i migrację.

**Contract**: przypadki z sekcji Testing Strategy.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Treść pozycji bazowych i norm (3 l/os./dobę, 72 h) porównana z Poradnikiem bezpieczeństwa / stroną KW PSP; rozbieżności poprawione w `backpack.ts`
- Plan v3 zapisany w przeglądarce przed zmianą otwiera `/` i `/alarm` po buildzie bez utraty miejsc i domowników

**Implementation Note**: Po zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie weryfikacji ręcznej przed fazą 2.

---

## Phase 2: Ekran `/plecak` i karta na stronie głównej

### Overview

Wyspa z checklistą, podstrona, karta-link z postępem i rozszerzenie smoke.

### Changes Required:

#### 1. Wyspa checklisty

**File**: `src/components/BackpackChecklist.tsx` (nowy)

**Intent**: Wyświetla `buildBackpack(plan.members)` w grupach i zapisuje odhaczenia.

**Contract**:

- Stan z `readPlan()`; odświeżenie na `pageshow` z `event.persisted` (wzór `HouseholdLinkCard`), żeby powrót z `/domownicy` pokazał nową listę.
- Linia postępu „Spakowane: X z Y” w `role="status"` / `aria-live="polite"`.
- Grupy jako `<section>` z nagłówkiem `h2`: „Dla wszystkich”, „Dzieci”, „Zwierzęta”, „Potrzeby zdrowotne”; pusta grupa nie renderuje się.
- Wiersz: natywny `<input type="checkbox">` w `<label>` na całą szerokość wiersza, cel ≥ 44 × 44 px, focus 3 px (`focus-visible:ring-[3px]`). Etykieta, pod nią `detail`, ilość (`formatAmount`) z `basis`, `forNames` po przecinku. W grupie „Potrzeby zdrowotne” linii ilości nie ma — ilością jest liczba osób, którą mówią już imiona. Spakowane: stan `selected` z §13 (`bg-core-steel-soft`, `text-core-steel-deep`) + ikona `Check`. `outdated`: ikona `TriangleAlert` + tekst „Ilość wzrosła — wcześniej 18 l” (albo „Ilość wzrosła” przy braku `previousAmount`) w `text-attention-foreground`. Bez hexów, klasy przez `cn()`.
- Zmiana: `togglePacked` na świeżym `readPlan().packedItems` i świeżej liście, potem `writePlan({ ...readPlan(), packedItems })`; przy `false` przywrócenie stanu sprzed kliknięcia i `STORAGE_ERROR` z `HouseholdFormParts`. Odczyt przez `readPlanResult()`: przy `source: "unreadable"` brak zapisu i komunikat, że planu nie da się teraz odczytać — odhaczenie nie może nadpisać nieczytelnego wpisu pustym planem (wzór `saveLastKnownPosition`).
- Pusta rodzina (`members.length === 0`): nad listą podpowiedź z linkiem do `/domownicy`.
- Pod listą stopka źródła: „Na podstawie Poradnika bezpieczeństwa (gov.pl). Plecak na 72 godziny.”

#### 2. Strona

**File**: `src/pages/plecak.astro` (nowy)

**Intent**: Podstrona wzorem `domownicy.astro`.

**Contract**: `<Layout title="Plecak ewakuacyjny — W razie W">`, link „Wróć do planu”, `h1` „Plecak ewakuacyjny”, kontekst „Lista dopasowana do Twojej rodziny. Odhaczaj, co już spakowane — zostaje na tym urządzeniu.”, `<BackpackChecklist client:only="react" />`.

#### 3. Karta na stronie głównej

**Files**: `src/components/BackpackLinkCard.tsx` (nowy), `src/components/HomeScreen.astro`

**Intent**: Karta-link z postępem, pod kartą „Domownicy i kontakty”.

**Contract**: wzór `HouseholdLinkCard` (ikona `Backpack` z lucide, odświeżenie na `pageshow`), tekst z `summarizeBackpack`: „Spakowane: X z Y” albo „Nic jeszcze nie spakowano.”; w `HomeScreen.astro` `client:only="react"`.

#### 4. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Nowa strona serwowana i w precache.

**Contract**: `/plecak` w pętli tras (`:33`), `plecak.html` w pętli precache (`:42`).

#### 5. Czyszczenie odhaczeń przy zapisie domowników

**File**: `src/components/HouseholdMembersCard.tsx`

**Intent**: Odhaczenia pozycji, które zniknęły z listy (usunięte dziecko, zwierzę, ostatnia osoba z potrzebą), nie wracają, gdy pojawi się inna osoba tej kategorii.

**Contract**: `persist` zapisuje `{ ...plan, members: next, packedItems: prunePacked(plan.packedItems, buildBackpack(next)) }` na świeżym `readPlan()`.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke przechodzi na buildzie: `npm run preview` + `npm run smoke`

#### Manual Verification:

- Na telefonie: rodzina 2 dorosłych + dziecko + pies z lekami u jednej osoby i potrzebą własną „insulina” — widoczne wszystkie cztery grupy, ilości (woda 36 l — organizator + 3 osoby), imiona przy pozycjach z potrzeb
- Odhaczenie przeżywa przeładowanie i zamknięcie aplikacji; karta na stronie głównej pokazuje ten sam postęp
- Dodanie domownika na `/domownicy` i powrót przyciskiem wstecz: woda w stanie „Ilość wzrosła — wcześniej 36 l”, postęp spadł o 1
- Usunięcie dziecka: grupa „Dzieci” znika; ponowne dodanie dziecka pokazuje jego pozycje jako niespakowane
- Pusta rodzina: pozycje dla 1 osoby i podpowiedź z linkiem do `/domownicy`
- Tryb samolotowy po pierwszej wizycie: `/plecak` otwiera się i zapisuje odhaczenia
- Czytnik ekranu / klawiatura: checkboxy osiągalne Tabem, stan i postęp odczytywane

**Implementation Note**: Po zielonej weryfikacji automatycznej zatrzymaj się na potwierdzenie weryfikacji ręcznej.

---

## Testing Strategy

### Unit Tests:

- `buildBackpack([])`: tylko grupa `everyone`, ilości dla 1 osoby (woda 9 l).
- 2 dorosłych + 1 dziecko + 1 pies: `peopleCount` 4 (z organizatorem), woda 36 l, grupy `children` i `pets` obecne, karma 3 porcje, woda dla zwierząt 3 l.
- Potrzeby: dwie osoby z `medication` → jedna pozycja `need-medication` z `forNames` obu i `amount` 2; potrzeba bez osób → brak pozycji.
- Potrzeba własna: pozycja z id `custom:<memberId>:insulina`, etykieta „Zabierz: insulina”; ta sama etykieta u dwóch osób → dwie pozycje.
- `itemState`: brak rekordu → `unpacked`; rekord z ilością = wymaganej → `packed`; mniejszą → `outdated` z `previousAmount`; większą (rodzina zmalała) → `packed`; pozycja bez ilości z rekordem → `packed`.
- `togglePacked`: zaznaczenie `outdated` zapisuje bieżącą ilość; odznaczenie usuwa rekord; rekordy spoza bieżącej listy znikają.
- `summarizeBackpack`: `outdated` nie liczy się do spakowanych.
- `parsePlan`: migracja v3 → v4 zachowuje miejsca, domowników, kontakty i daje `packedItems: []`; v2 i v1 też mają `packedItems: []`; uszkodzone rekordy odhaczeń pominięte, reszta zostaje; ujemna lub nieskończona ilość odrzucona.

### Integration Tests:

- `npm run smoke`: `/plecak` jest HTML, `plecak.html` jest w precache.

### Manual Testing Steps:

1. Zbuduj, `npm run preview`, otwórz na telefonie przez sieć lokalną; dodaj rodzinę z punktu 1 weryfikacji fazy 2.
2. Odhacz kilka pozycji, przeładuj, sprawdź kartę na stronie głównej.
3. Dodaj domownika, wróć — sprawdź stan „Ilość wzrosła”.
4. Włącz tryb samolotowy, otwórz `/plecak`, odhacz pozycję, przeładuj.

## Performance Considerations

Lista ma kilkadziesiąt pozycji, wyliczanie przy każdym renderze jest pomijalne. `/alarm` czyta plan raz; dodatkowe pole nie wpływa na czas pierwszego kroku.

## Migration Notes

v3 → v4 dokłada `packedItems: []`. Zapis migrowanego planu następuje dopiero przy pierwszym zapisie inicjowanym przez użytkownika albo przy fixie GPS (`saveLastKnownPosition`), jak dotąd. Wycofanie zmiany po wdrożeniu: starsza wersja aplikacji odczyta plan v4 jako `unreadable` i nie nadpisze go automatycznie. Zapis inicjowany przez użytkownika w starszej wersji (edycja miejsca lub domownika) nadal nadpisze plan pustym — S-06 zamyka tę lukę tylko w `/plecak`; pozostałe wyspy to osobna zmiana.

## References

- Roadmap: `context/foundation/roadmap.md` (S-06)
- PRD: `context/foundation/prd.md` (FR-003)
- Poprzednia zmiana i wzorce: `context/changes/household-members/plan.md`, `src/components/HouseholdLinkCard.tsx`, `src/components/HouseholdMembersCard.tsx`, `src/pages/domownicy.astro`
- Lista wyliczana z planu: `src/lib/evacuation-steps.ts` (`buildSteps`)
- Źródło treści: https://www.gov.pl/web/kwpsp-poznan/plecak-ewakuacyjny--bezpieczenstwa, norma wody 3 l/os./dobę (RCB)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Model danych, migracja i reguły plecaka

#### Automated

- [x] 1.1 Testy przechodzą: `npm test` — c9e0012
- [x] 1.2 Lint przechodzi: `npm run lint` — c9e0012
- [x] 1.3 Typy przechodzą: `npx astro check` — c9e0012
- [x] 1.4 Build przechodzi: `npm run build` — c9e0012

#### Manual

- [x] 1.5 Treść pozycji bazowych i norm porównana z Poradnikiem bezpieczeństwa / stroną KW PSP — c9e0012
- [x] 1.6 Plan v3 otwiera `/` i `/alarm` po buildzie bez utraty miejsc i domowników — c9e0012

### Phase 2: Ekran `/plecak` i karta na stronie głównej

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — ca0ba4b
- [x] 2.2 Typy przechodzą: `npx astro check` — ca0ba4b
- [x] 2.3 Testy przechodzą: `npm test` — ca0ba4b
- [x] 2.4 Build przechodzi: `npm run build` — ca0ba4b
- [x] 2.5 Smoke przechodzi na buildzie: `npm run preview` + `npm run smoke` — ca0ba4b

#### Manual

- [x] 2.6 Rodzina z dzieckiem, psem, lekami i potrzebą własną — wszystkie grupy, ilości i imiona widoczne — ca0ba4b
- [x] 2.7 Odhaczenie przeżywa przeładowanie; karta na stronie głównej pokazuje ten sam postęp — ca0ba4b
- [x] 2.8 Nowy domownik → woda w stanie „Ilość wzrosła”, postęp spadł — ca0ba4b
- [x] 2.9 Usunięcie i ponowne dodanie dziecka — grupa znika, potem wraca niespakowana — ca0ba4b
- [x] 2.10 Pusta rodzina — pozycje dla 1 osoby i podpowiedź z linkiem — ca0ba4b
- [ ] 2.11 Tryb samolotowy — `/plecak` otwiera się i zapisuje odhaczenia
- [ ] 2.12 Klawiatura i czytnik ekranu — checkboxy osiągalne, stan i postęp odczytywane
