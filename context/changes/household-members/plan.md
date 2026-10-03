# Domownicy i kontakty awaryjne (S-05) — plan implementacji

## Overview

Rozszerzamy plan gospodarstwa (`HouseholdPlan`) o dwie listy: domowników (imię, kategoria dorosły / dziecko / zwierzę, flaga „przyjmuje leki”) i kontakty awaryjne (imię, telefon, relacja opcjonalna). Organizator dodaje, edytuje i usuwa rekordy na nowej stronie `/domownicy`, a strona główna dostaje kartę-link z podsumowaniem. Dane zostają w `localStorage` na urządzeniu, bez serwera.

Roadmap: `S-05`, change id `household-members`, prerequisite `S-01` (zamknięte, `context/archive/2026-10-03-guided-to-point-offline/`). PRD: FR-002 (must-have), NFR (offline-first, UI po polsku, dane nie opuszczają urządzenia). Odblokowuje `S-06` (checklista plecaka dopasowana do składu rodziny), a pośrednio `S-07` i `S-09`.

## Current State Analysis

- `src/types.ts`: `HouseholdPlan` ma `schemaVersion: 1`, `evacuationPoint`, `lastKnownPosition`, `updatedAt`. Brak jakichkolwiek danych o ludziach.
- `src/lib/services/plan-storage.ts`: klucz `wrw.plan`, `CURRENT_SCHEMA_VERSION = 1`. `parsePlan` waliduje pole po polu (uszkodzony podobiekt staje się `null`), a każda wersja inna niż bieżąca czyta się jako pusty plan. `readPlan` jest synchroniczny i nie rzuca. Komentarz w kodzie zapowiada, że „future schema versions add their migration branch here”. `plan-storage.test.ts` testuje `parsePlan` (Vitest, środowisko node).
- Wzorzec ekranu przygotowania: `src/components/EvacuationPointCard.tsx` (wyspa React `client:only="react"`, `useState(readPlan)`, zapis przez `{ ...readPlan(), pole }` + `writePlan`, komunikat zapisu/błędu z ikoną i tekstem, pola z `useId` i etykietami, przyciski `Button` z `ui/button`, karta `border-border bg-surface rounded-lg border p-6 shadow-sm`).
- Wzorzec podstrony przygotowania: `src/pages/czujniki.astro` (`<Layout title="… — W razie W">`, link „Wróć do planu”, nagłówek, wyspa). Strona główna `HomeScreen.astro` ma kartę-link „Sprawdź czujniki” do `/czujniki`.
- `scripts/smoke.mjs` sprawdza trasy `/alarm`, `/czujniki` oraz obecność `index.html`, `alarm.html`, `czujniki.html` na liście precache (`build.format: "file"`). Glob w `scripts/generate-sw.mjs` precache'uje cały `dist/`, więc nowa strona trafi tam sama.
- Plan jest czytany też przez `/alarm` (`GuidanceScreen`); nowe pola nie mogą go zepsuć ani spowolnić.

## Desired End State

Na telefonie, także w trybie samolotowym:

1. Strona główna ma kartę „Domownicy i kontakty” z podsumowaniem („Domownicy: 3 · Kontakty: 2” albo „Nikogo jeszcze nie dodano”) i linkiem do `/domownicy`.
2. `/domownicy` pokazuje dwie sekcje: **Domownicy** i **Kontakty awaryjne**. W każdej: lista rekordów (każdy z przyciskami „Edytuj” i „Usuń”), pusty stan i formularz dodawania. Edycja wypełnia ten sam formularz, z przyciskami „Zapisz zmiany” i „Anuluj”.
3. Domownik: imię (wymagane), kategoria (dorosły / dziecko / zwierzę), pole wyboru „Przyjmuje leki”. Kontakt: imię (wymagane), telefon (wymagany), relacja (opcjonalna, np. „babcia”). Telefon na liście jest linkiem `tel:`.
4. Błędy walidacji są pokazane tekstem z ikoną przy polu; zapis i usunięcie potwierdza komunikat w `aria-live`.
5. Dane przeżywają przeładowanie i zamknięcie aplikacji. Istniejący plan w wersji 1 (punkt ewakuacji, ostatnia pozycja) otwiera się bez utraty danych i przy pierwszym zapisie przechodzi na wersję 2.

Weryfikacja: `npm run lint`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke` przechodzą lokalnie i w CI; ścieżki 1–5 sprawdzone ręcznie na telefonie w trybie samolotowym.

### Key Discoveries:

- **Migracja już ma swoje miejsce.** `parsePlan` dziś odrzuca każdą wersję ≠ bieżącej (`plan-storage.ts`, warunek `schemaVersion !== CURRENT_SCHEMA_VERSION`). Bez dopisania gałęzi dla v1 podniesienie wersji skasowałoby punkt ewakuacji zapisany na telefonach użytkowników, a to jest dane ratunkowe z S-01. Migracja v1→v2 to jedyny element tej zmiany o realnym ryzyku.
- **Zapis to „odczytaj świeże, zmień pole, zapisz”.** Wszystkie dotychczasowe zapisy (`savePoint`, `saveLastKnownPosition`) wołają `readPlan()` tuż przed `writePlan`, więc rozszerzony plan nie ginie, gdy inna wyspa zapisuje swoje pole. Nowe wyspy muszą trzymać ten wzorzec; `useState(readPlan)` służy tylko do wyświetlania.
- **`client:only="react"` jest obowiązkowe** dla wysp czytających `localStorage` (CLAUDE.md): statyczny HTML nie zawiera zapisanych danych, a hydratacja by się rozjechała.
- **Plurale przy liczbach odpadają.** Podsumowanie „Domownicy: 3 · Kontakty: 2” unika odmiany polskich liczebników, której nie warto implementować dla jednej karty.
- **Preparation Mode.** Przyciski i karty wg `JEZYK_WIZUALNY.md` §10–§13: primary stalowy, jedna dominująca akcja na sekcję, destructive (czerwony) tylko dla „Usuń”, cele dotykowe ≥ 44 × 44 px, focus 3 px, błąd/sukces z tekstem i ikoną, tokeny Tailwind zamiast hexów.

## What We're NOT Doing

- Checklista plecaka i jej reguły dopasowania (S-06); tu zapisujemy tylko dane, z których S-06 skorzysta.
- Role domowników i scenariusze (FR-005, nice-to-have, poza MVP), zdjęcia, daty urodzenia, adresy, wiek.
- Opisy potrzeb poza listą (dawki, nazwy leków, instrukcje); lista potrzeb to etykiety, nie dokumentacja medyczna.
- Odpowiednik „organizatora jako domownika” (osoba korzystająca z telefonu nie jest dodawana automatycznie).
- Wysyłanie SMS-ów i wybieranie numeru z poziomu aplikacji (link `tel:` otwiera dialer telefonu).
- Przekazywanie planu między urządzeniami i edycja „własnych danych” przez domownika (S-09, FR-010/011).
- Wpisanie kontaktów do Execution Mode (`/alarm`); w kryzysie prowadzenie do punktu zostaje bez zmian.
- Kroki onboardingu (S-07) — komponenty mają być użyteczne w onboardingu, ale nie budujemy go tutaj.
- Zmiany w CI, `public/_headers`, konfiguracji service workera, nowe zależności.

## Implementation Approach

Dwie fazy, od danych do ekranu. Faza 1 jest czysto logiczna i w pełni objęta testami Vitest (zgodnie z regułą repo: testy tylko dla czystych funkcji w `src/lib/`): typy, migracja v1→v2, walidacja rekordów i czyste operacje na listach. Faza 2 dodaje wyspy React, stronę i kartę-link, i jest weryfikowana lintem, `astro check`, buildem, smoke’iem oraz ręcznie na telefonie.

Logika walidacji i operacji na listach żyje w `src/lib/household.ts` jako czyste funkcje, żeby wyspy zostały cienkie, a S-06/S-07/S-09 mogły z niej korzystać. Persystencja zostaje w `plan-storage.ts`.

## Critical Implementation Details

- **Migracja przed bumpem.** W `parsePlan` gałąź v1 musi zachować `evacuationPoint` i `lastKnownPosition` (po tej samej walidacji co v2) i ustawić `members: []`, `contacts: []`. Dopiero nowy zapis przepisuje plik na v2; sam odczyt niczego nie zapisuje (czytanie nie może mieć skutków ubocznych na `/alarm`).
- **Id rekordów.** `crypto.randomUUID()` istnieje tylko w bezpiecznym kontekście (https, localhost). Aplikacja i tak wymaga go dla geolokalizacji, ale pomocnik id ma mieć awaryjną ścieżkę (znacznik czasu + losowy sufiks), żeby formularz nie rzucał na http w sieci lokalnej podczas testów.

## Phase 1: Model danych, migracja i logika rekordów

### Overview

Plan w wersji 2 niesie listy `members` i `contacts`. Odczyt wersji 1 migruje się bez utraty danych. Walidacja wejścia i operacje dodaj/edytuj/usuń są czystymi funkcjami z testami. Brak zmian w UI.

### Changes Required:

#### 1. Typy

**File**: `src/types.ts`

**Intent**: Dodać typy domownika i kontaktu i rozszerzyć `HouseholdPlan` o dwie listy; podnieść literał wersji do 2.

**Contract**: `MemberCategory = "adult" | "child" | "pet"`. `HouseholdMember { id: string; name: string; category: MemberCategory; takesMedication: boolean }`. `EmergencyContact { id: string; name: string; phone: string; relation: string }` (`relation` to pusty string, gdy nie podano). `HouseholdPlan { schemaVersion: 2; …dotychczasowe pola…; members: HouseholdMember[]; contacts: EmergencyContact[] }`.

#### 2. Odczyt, migracja i zapis planu

**File**: `src/lib/services/plan-storage.ts`

**Intent**: Podnieść `CURRENT_SCHEMA_VERSION` do 2, dodać parsery list (rekord po rekordzie, uszkodzony rekord jest pomijany, reszta zostaje) i gałąź migracji z v1, a pusty plan inicjalizować pustymi listami.

**Contract**: `createEmptyPlan()` zwraca `members: []`, `contacts: []`. `parsePlan(value)`: wersja 2 → pełna walidacja; wersja 1 → pola v1 jak dotąd plus puste listy; inne wersje, nie-obiekt → pusty plan. Parser rekordu odrzuca (pomija) rekord z nieznaną kategorią, pustym lub nie-tekstowym imieniem, brakującym id albo tekstowym polem o złym typie. Pozostałe sygnatury (`readPlan`, `writePlan`, `saveLastKnownPosition`) bez zmian. Zaktualizować komentarz o przyszłych migracjach.

#### 3. Walidacja i operacje na listach

**File**: `src/lib/household.ts` (nowy)

**Intent**: Czyste funkcje: walidacja pól formularzy (z polskimi komunikatami błędów) i niemutujące operacje dodaj/edytuj/usuń na listach, plus podsumowanie do karty głównej.

**Contract**:
- `validateMemberInput({ name, category, takesMedication })` → `{ ok: true, value } | { ok: false, errors: { name?: string } }`; imię po `trim`, 1–60 znaków.
- `validateContactInput({ name, phone, relation })` → `{ ok: true, value } | { ok: false, errors: { name?: string; phone?: string } }`; imię jak wyżej; telefon po `trim` może zawierać tylko cyfry, spacje, `+`, `-`, `(`, `)` i musi mieć 7–15 cyfr; relacja po `trim`, do 40 znaków, opcjonalna.
- `addMember`, `updateMember`, `removeMember` oraz bliźniacze `addContact`, `updateContact`, `removeContact`: przyjmują listę i zwracają nową listę; `update` / `remove` dla nieistniejącego id zwracają listę bez zmian; `add` generuje id i odrzuca dodanie powyżej limitu 20 rekordów na listę (zwraca listę bez zmian, wywołujący sprawdza limit osobno przez wyeksportowane `MAX_RECORDS`).
- `phoneHref(phone)` → `tel:` z samych cyfr i wiodącego `+`.
- `summarizeHousehold(plan)` → `{ members: number; contacts: number }`.
- Pomocnik id: `crypto.randomUUID()` z awaryjną ścieżką opisaną w Critical Implementation Details.

#### 4. Testy

**File**: `src/lib/services/plan-storage.test.ts`, `src/lib/household.test.ts` (nowy)

**Intent**: Pokryć migrację, odporność parsera i walidację.

**Contract**: W `plan-storage.test.ts` zaktualizować `validPlan` do v2 z listami, zmienić przypadek „nieznana wersja” z 2 na 3, dodać testy: v1 zachowuje punkt ewakuacji i ostatnią pozycję oraz daje puste listy; v2 z jednym uszkodzonym rekordem zachowuje pozostałe; pusty plan ma puste listy. W `household.test.ts`: granice długości imienia i relacji, formaty telefonu (z `+48 600 100 200`, z myślnikami, za krótki, za długi, litery), kategoria, niemutowanie wejścia przez operacje, `update`/`remove` nieistniejącego id, limit 20, `phoneHref`, `summarizeHousehold`.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Sprawdzenie typów przechodzi: `npx astro check`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Plan v1 wklejony do `localStorage` (`wrw.plan`, `schemaVersion: 1` z punktem ewakuacji) nadal prowadzi na `/alarm` do tego samego punktu po wdrożeniu zmiany.

**Implementation Note**: Po zakończeniu fazy i przejściu testów automatycznych zatrzymać się na potwierdzenie manualne przed fazą 2.

---

## Phase 2: Ekran `/domownicy` i karta na stronie głównej

### Overview

Organizator widzi, dodaje, edytuje i usuwa domowników i kontakty na osobnej stronie; strona główna pokazuje podsumowanie i prowadzi do niej. Strona jest w precache i działa w trybie samolotowym.

### Changes Required:

#### 1. Sekcja domowników

**File**: `src/components/HouseholdMembersCard.tsx` (nowy)

**Intent**: Wyspa React z listą domowników, pustym stanem i formularzem dodawania/edycji wg wzorca `EvacuationPointCard`.

**Contract**: Stan wyświetlany z `useState(readPlan)`; każdy zapis robi `readPlan()` → podmiana `members` przez operacje z `src/lib/household.ts` → `writePlan` → aktualizacja stanu. Pola: imię (tekst z etykietą), kategoria (grupa przycisków radiowych z etykietami „Dorosły / Dziecko / Zwierzę”), pole wyboru „Przyjmuje leki”. Wiersz listy: imię, kategoria, znacznik „leki” z ikoną i tekstem, przyciski „Edytuj” i „Usuń” (cele ≥ 44 px; „Usuń” w wariancie destructive, bez okna potwierdzenia, z komunikatem „Usunięto: …”). Przy osiągnięciu limitu `MAX_RECORDS` formularz dodawania jest zastąpiony komunikatem. Błędy z `validate…` pokazane przy polu (tekst + ikona, `aria-describedby`, `aria-invalid`). Komunikaty zapisu w `role="status"`/`aria-live="polite"`. Po „Edytuj” fokus przechodzi na pole imienia; po zapisie lub anulowaniu na przycisk „Edytuj” edytowanego wiersza (albo na pole imienia przy dodawaniu), żeby użytkownik klawiatury nie tracił miejsca. Tryb Preparation, tokeny Tailwind, `cn()` dla wariantów.

#### 2. Sekcja kontaktów

**File**: `src/components/EmergencyContactsCard.tsx` (nowy)

**Intent**: Analogiczna wyspa dla kontaktów awaryjnych.

**Contract**: Pola: imię, telefon (`type="tel"`, `inputMode="tel"`, `autoComplete="off"`), relacja (opcjonalna). Wiersz listy: imię, relacja, numer jako link `tel:` (`phoneHref`) o celu dotykowym ≥ 44 px; „Edytuj” / „Usuń” jak wyżej. Ten sam wzorzec zapisu, błędów, fokusu i limitu. Krótka nota w interfejsie, że numery zostają na tym telefonie i nigdzie nie są wysyłane (NFR).

#### 3. Strona i nawigacja

**File**: `src/pages/domownicy.astro` (nowy)

**Intent**: Podstrona w stylu `czujniki.astro`: link „Wróć do planu”, nagłówek „Domownicy i kontakty”, krótki opis po polsku, obie wyspy z `client:only="react"`.

**Contract**: `<Layout title="Domownicy i kontakty — W razie W">`, tryb domyślny (preparation). Trasa `/domownicy`, plik `dist/domownicy.html` dzięki `build.format: "file"`.

#### 4. Karta na stronie głównej

**File**: `src/components/HouseholdLinkCard.tsx` (nowy), `src/components/HomeScreen.astro`

**Intent**: Karta-link z podsumowaniem czytanym z planu, umieszczona obok karty „Sprawdź czujniki”; zastępuje ręczne zliczanie w wielu miejscach jednym komponentem.

**Contract**: Wyspa `client:only="react"` (czyta `localStorage`), wygląd jak istniejąca karta „Sprawdź czujniki”: ikona (Lucide `Users`), tytuł „Domownicy i kontakty”, opis z `summarizeHousehold`: „Domownicy: N · Kontakty: M” albo „Nikogo jeszcze nie dodano”, szewron, całość jest linkiem `<a href="/domownicy">` ≥ 44 px. Opis strony głównej (akapit pod `h1`) pozostaje bez zmian lub dostaje jedno zdanie o domownikach, jeśli brzmi inaczej niż reszta.

#### 5. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Sprawdzać nową trasę i obecność w precache.

**Contract**: Dodać `/domownicy` do pętli tras HTML i `domownicy.html` do listy plików, które muszą być na liście precache w `sw.js`.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Sprawdzenie typów przechodzi: `npx astro check`
- Build przechodzi: `npm run build`
- Smoke przechodzi na buildzie (`npm run preview`, następnie `npm run smoke`), w tym `/domownicy` i `domownicy.html` w precache

#### Manual Verification:

- Na telefonie: dodanie domownika (każda kategoria, z lekami i bez), edycja i usunięcie; to samo dla kontaktu; przeładowanie strony i zamknięcie aplikacji nie gubi danych.
- Walidacja: pusty formularz, za długie imię, telefon z literami i za krótki pokazują błąd tekstem z ikoną, bez koloru jako jedynej wskazówki.
- Tryb samolotowy po pierwszym otwarciu online: strona główna i `/domownicy` ładują się i działają.
- Link `tel:` z listy kontaktów otwiera dialer z właściwym numerem.
- Karta na stronie głównej pokazuje aktualne liczby po powrocie z `/domownicy`.
- Obsługa klawiaturą na komputerze: tab przechodzi przez formularze logicznie, focus jest widoczny, po edycji fokus nie ginie.
- Regresja: punkt ewakuacji na stronie głównej, przytrzymanie alarmu i `/alarm` działają jak przed zmianą.

---

## Phase 3: Zmiana zakresu po przeglądzie — potrzeby domownika i import kontaktów

### Overview

Po obejrzeniu fazy 2 zakres został zmieniony decyzją użytkownika: (a) flaga „przyjmuje leki” zostaje zastąpiona listą potrzeb osoby (propozycje + własne wpisy), bo flaga nie niesie informacji, z której S-06 mógłby dobrać plecak; (b) kontakty można dodać trzema metodami do wyboru: z kontaktów telefonu (Contact Picker API, tylko tam, gdzie działa), z pliku vCard `.vcf` (działa wszędzie, także na iOS) albo ręcznie. Gałąź nie jest wdrożona, więc kształt rekordu zmienia się w ramach `schemaVersion: 2` bez kolejnej migracji.

### Changes Required:

#### 1. Model potrzeb

**File**: `src/types.ts`, `src/lib/household.ts`, `src/lib/services/plan-storage.ts`, testy

**Intent**: Zastąpić `takesMedication: boolean` listą `needs`. Propozycje mają stałe identyfikatory (dla reguł S-06), wpisy własne niosą tekst.

**Contract**: `PresetNeedKind = "medication" | "diabetes" | "allergy" | "mobility" | "diet"`; `MemberNeed = { kind: PresetNeedKind } | { kind: "custom"; label: string }`; `HouseholdMember.needs: MemberNeed[]`. Stałe `PRESET_NEEDS` (kind + polska etykieta), `MAX_NEEDS = 10`, `MAX_NEED_LABEL_LENGTH = 40`. Funkcje: `needLabel(need)`, `toggleNeed(needs, kind)`, `addCustomNeed(needs, label)` → `Validation<MemberNeed[], string>` (puste, za długie, duplikat bez względu na wielkość liter, limit; wpis równy etykiecie propozycji włącza tę propozycję). Parser rekordu pomija nieprawidłowe potrzeby i ucina listę do `MAX_NEEDS`.

#### 2. Import kontaktów (logika)

**File**: `src/lib/vcard.ts` (nowy), `src/lib/services/contact-import.ts` (nowy), `src/lib/household.ts`

**Intent**: Wspólna ścieżka „kandydaci → wybór → dodanie” dla Contact Picker i pliku vCard.

**Contract**: `parseVCard(text): ContactInput[]` (wiele wizytówek, składanie linii, `FN` albo `N`, pierwszy `TEL`, prefiksy grup `itemN.`, `tel:` w wartości, ucieczki `\, \; \n`; relacja pusta). `isContactPickerSupported()` i `pickPhoneContacts()` w `contact-import.ts` (obsługa anulowania i błędów bez rzucania). `prepareCandidates(raw, existing)` → `{ candidates, invalid, duplicates }` (walidacja przez `validateContactInput`, duplikaty po samych cyfrach numeru wobec istniejących i w obrębie listy).

#### 3. Ekran

**File**: `src/components/HouseholdMembersCard.tsx`, `src/components/EmergencyContactsCard.tsx`, `src/components/HouseholdFormParts.tsx`

**Intent**: W formularzu domownika jedno pole „Potrzeby” z dodawaniem i usuwaniem chipów; podpowiedzi (leki, cukrzyca, alergia, wózek, dieta) są tylko w opisie pola, a wpis zgodny z etykietą propozycji (np. „leki”) zapisuje się jako propozycja o stałym `kind`; wiersze listy pokazują potrzeby jako etykiety. W kontaktach przed formularzem wybór metody: „Z kontaktów telefonu” (tylko gdy API jest dostępne), „Z pliku vCard”, „Wpisz ręcznie”; import pokazuje listę kandydatów do zaznaczenia i przycisk „Dodaj wybrane”, z limitem do wolnych miejsc. Komunikaty: dodano ile, pominięto ile (zły numer lub duplikat), brak kontaktów z numerem w pliku.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Sprawdzenie typów przechodzi: `npx astro check`
- Build i smoke przechodzą: `npm run build`, potem `npm run smoke` na podglądzie

#### Manual Verification:

- Potrzeby: wpis „leki” i wpis własny (np. „insulina”) dodają się i usuwają, zapisane potrzeby widać na liście i po przeładowaniu.
- Import z pliku vCard (jeden i wiele kontaktów) pokazuje listę do wyboru; zaznaczone trafiają na listę kontaktów.
- Na telefonie z Chrome na Androidzie działa „Z kontaktów telefonu”; na iOS przycisk się nie pojawia, a vCard działa.

---

## Testing Strategy

### Unit Tests:

- `parsePlan`: v1 → migracja bez utraty danych; v2 z uszkodzonymi rekordami; nieznana wersja; nie-obiekt.
- Walidacja imienia, relacji i telefonu (granice, białe znaki, znaki niedozwolone).
- Operacje na listach są niemutujące, nieistniejące id nie psuje listy, limit 20.
- `phoneHref`, `summarizeHousehold`.

### Integration Tests:

- Brak (zasada repo: tylko czyste funkcje w `src/lib/`). Pokrycie integracyjne to `npm run smoke` na buildzie.

### Manual Testing Steps:

1. Z planem v1 w `localStorage` otworzyć `/` i `/alarm`: punkt jest, brak błędów w konsoli.
2. Dodać dwoje domowników (dorosły z lekami, zwierzę) i dwa kontakty, przeładować, sprawdzić kartę na stronie głównej.
3. Edytować numer telefonu z literówką, zapisać, sprawdzić link `tel:`.
4. Włączyć tryb samolotowy, otworzyć `/domownicy` z ikony PWA, dodać rekord.
5. Spróbować dodać 21. rekord i sprawdzić komunikat o limicie.

## Performance Considerations

Plan zawiera najwyżej 40 małych rekordów, więc rozmiar `localStorage` i koszt parsowania są pomijalne. `/alarm` nie ładuje nowych komponentów; zmienia się tylko kształt obiektu planu, który `readPlan` i tak parsuje synchronicznie.

## Migration Notes

Migracja jednokierunkowa v1→v2 w `parsePlan`; zapis dopiero przy następnym `writePlan`. Brak ścieżki wstecz: telefon z nowszą wersją, który wróciłby do starego kodu, odczytałby plan jako pusty (stare zachowanie dla nieznanej wersji). Akceptowalne, bo wdrożenie idzie tylko do przodu.

## References

- Roadmap: `context/foundation/roadmap.md` (S-05)
- PRD: `context/foundation/prd.md` (FR-002, NFR)
- Wzorzec wyspy i zapisu: `src/components/EvacuationPointCard.tsx`
- Wzorzec podstrony i karty-linku: `src/pages/czujniki.astro`, `src/components/HomeScreen.astro`
- Wzorzec testów: `src/lib/services/plan-storage.test.ts`
- Język wizualny: `JEZYK_WIZUALNY.md` §10, §11, §13, §15

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Model danych, migracja i logika rekordów

#### Automated

- [x] 1.1 Testy przechodzą: `npm test` — d39393d
- [x] 1.2 Lint przechodzi: `npm run lint` — d39393d
- [x] 1.3 Sprawdzenie typów przechodzi: `npx astro check` — d39393d
- [x] 1.4 Build przechodzi: `npm run build` — d39393d

#### Manual

- [x] 1.5 Plan v1 w `localStorage` nadal prowadzi na `/alarm` do tego samego punktu — d39393d

### Phase 2: Ekran `/domownicy` i karta na stronie głównej

#### Automated

- [x] 2.1 Testy przechodzą: `npm test`
- [x] 2.2 Lint przechodzi: `npm run lint`
- [x] 2.3 Sprawdzenie typów przechodzi: `npx astro check`
- [x] 2.4 Build przechodzi: `npm run build`
- [x] 2.5 Smoke przechodzi na buildzie, w tym `/domownicy` i `domownicy.html` w precache

#### Manual

- [x] 2.6 Dodawanie, edycja i usuwanie domowników i kontaktów na telefonie, dane przeżywają przeładowanie
- [x] 2.7 Walidacja pokazuje błędy tekstem z ikoną
- [ ] 2.8 Tryb samolotowy: strona główna i `/domownicy` działają po pierwszym otwarciu online
- [ ] 2.9 Link `tel:` otwiera dialer z właściwym numerem
- [x] 2.10 Karta na stronie głównej pokazuje aktualne liczby
- [x] 2.11 Obsługa klawiaturą: logiczny tab, widoczny focus, fokus nie ginie po edycji
- [x] 2.12 Regresja: punkt ewakuacji, alarm i `/alarm` działają jak przed zmianą

### Phase 3: Zmiana zakresu po przeglądzie — potrzeby domownika i import kontaktów

#### Automated

- [x] 3.1 Testy przechodzą: `npm test`
- [x] 3.2 Lint przechodzi: `npm run lint`
- [x] 3.3 Sprawdzenie typów przechodzi: `npx astro check`
- [x] 3.4 Build i smoke przechodzą

#### Manual

- [x] 3.5 Potrzeby: wpisy (także „leki” jako propozycja) działają i zostają po przeładowaniu
- [x] 3.6 Import z pliku vCard (jeden i wiele kontaktów) działa
- [ ] 3.7 Contact Picker działa na Chrome/Android, a na iOS przycisku nie ma
