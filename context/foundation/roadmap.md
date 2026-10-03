---
project: "Household Resilience App"
version: 1
status: draft
created: 2026-10-03
updated: 2026-10-03
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: Household Resilience App

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Ludzie znają poradniki kryzysowe, ale nie zamieniają ich w plan dla własnej rodziny, a istniejące narzędzia wymagają sieci dokładnie wtedy, gdy jej nie ma. Aplikacja przenosi wszystkie decyzje ewakuacyjne na czas spokoju (domownicy, plecak, miejsce spotkania, miejsce zapasowe, schron), a w kryzysie, bez sieci, przejmuje kontrolę i prowadzi krok po kroku do punktu. Demo na hackathonie (24 h) ma pokazać cały przepływ 1–8 na scenie, z prowadzeniem do punktu w trybie samolotowym.

## North star

**S-01: Użytkownik po przytrzymaniu alarmu jest prowadzony offline do wskazanego punktu dużą strzałką z odległością** — to gwiazda przewodnia roadmapy, czyli najmniejszy przepływ od początku do końca, którego działanie dowodzi, że produkt ma sens; jest pierwsza, bo przy celu „szybkość do demo” wszystko inne liczy się tylko wtedy, gdy prowadzenie w trybie samolotowym działa na scenie.

## At a glance

| ID   | Change ID               | Outcome (user can …)                                                                                                                                | Prerequisites | PRD refs                                                                              | Status   |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- | -------- |
| F-01 | offline-app-shell       | (foundation) aplikacja jest statyczna, otwiera się bez sieci i wdraża się automatycznie z `main`                                                    | —             | US-01, NFR (cały interfejs po polsku), Access Control                                 | done     |
| S-01 | guided-to-point-offline | wskazać punkt, przytrzymać alarm i w trybie samolotowym iść za strzałką z odległością                                                               | F-01          | US-01, FR-004, FR-006, FR-012, FR-014, NFR (pierwszy krok < 2 s od zwolnienia alarmu) | done     |
| S-02 | step-flow-and-fallback  | przejść ewakuację krok po kroku i jednym przyciskiem „niedostępne” przełączyć się na miejsce zapasowe                                               | S-01          | US-01, FR-013                                                                         | proposed |
| S-03 | voice-guidance          | słyszeć kolejne kroki po polsku i wyłączyć głos                                                                                                     | S-01          | US-01, FR-015                                                                         | done     |
| S-04 | offline-map-and-route   | pobrać mapę regionu, mieć automatycznie wybrany schron PSP z trasą odświeżaną przy dostępie do sieci i iść po niej offline (mapa jako drugi poziom) | S-01          | US-01, FR-004, FR-007, FR-014                                                         | proposed |
| S-05 | household-members       | dodać domowników i kontakty awaryjne                                                                                                                | S-01          | FR-002                                                                                | done     |
| S-06 | personalized-backpack   | odhaczać checklistę plecaka dopasowaną do składu rodziny                                                                                            | S-05          | FR-003                                                                                | done     |
| S-07 | first-run-onboarding    | (usunięte 2026-10-04) zastąpione przez quick winy i mapę gotowości w S-08 | — | — | dropped |
| S-08 | readiness-screen        | zobaczyć na stronie głównej jakościowy poziom gotowości, następny quick win i milestone'y; alarm jest przyklejony na dole, konfiguratory są podstronami                                                                                           | S-06          | FR-008, FR-009                                                                        | proposed |
| S-09 | share-plan              | przekazać plan domownikowi, który otwiera go tylko do odczytu i poprawia własne dane                                                                | S-08          | FR-010, FR-011                                                                        | proposed |
| S-10 | auto-shelter-and-route  | (po MVP) mieć trasę odświeżaną w tle, gdy aplikacja jest zamknięta, i mapę dla kolejnych regionów                                                   | S-04          | FR-007 (rozszerzenie)                                                                 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                  | Chain                                                   | Note                                                                          |
| ------ | ---------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A      | Prowadzenie w kryzysie | `F-01` → `S-01` → `S-02` / `S-03` / `S-04` (równolegle) | Ścieżka głównego kryterium sukcesu; przy celu „szybkość” idzie pierwsza.      |
| B      | Przygotowanie i plan   | `S-05` → `S-06` → `S-08` → `S-09`                        | Dołącza do strumienia A w `S-01` (zapis planu); S-07 usunięte. |

## Baseline

What's already in place in the codebase as of `2026-10-03`, after `F-01`, `S-01`, `S-03` and `S-02` (refreshed at the S-02 close; S-03 landed on `main` in parallel and was merged into S-02).
Slices below build on these and do NOT re-scaffold them.

- **Frontend:** present — statyczna PWA Astro 7 z wyspami React 19, Tailwind 4 i shadcn/ui; tokeny wizualne w `src/styles/global.css`, tryby `preparation` / `execution` w `src/layouts/Layout.astro`. Ekrany: `/` (plan i alarm), `/czujniki`, `/alarm`, `/design`.
- **Backend / API:** absent — świadomie: `output: "static"`, bez serwera, API i middleware (PRD: dane nie opuszczają urządzenia).
- **Data:** present — plan gospodarstwa `HouseholdPlan` (`src/types.ts`, `schemaVersion: 2`) w localStorage pod kluczem `wrw.plan` (`src/lib/services/plan-storage.ts`) z trzema miejscami w `places` (`meeting`, `backup`, `shelter`); migracja v1 → v2 mapuje dawny `evacuationPoint` na `places.shelter`. Każda zmiana kształtu podnosi wersję i dopisuje migrację w `parsePlan`; nieczytelny wpis zwraca `source: "unreadable"` i nie jest nadpisywany automatycznym zapisem. Przebieg ewakuacji żyje osobno pod kluczem `wrw.run` (`src/lib/services/run-storage.ts`, `schemaVersion: 1`) i jest wznawiany tylko w progu świeżości `RUN_FRESH_MS` (6 h); sekwencja kroków nie jest zapisywana — wylicza ją `buildSteps` z planu (`src/lib/evacuation-steps.ts`).
- **Auth:** absent — świadomie: profil lokalny, bez kont.
- **Offline:** present — service worker Workbox (`scripts/generate-sw.mjs`) precache'uje cały build; `build.format: "file"`, żeby podstrony trafiały w precache.
- **Map & routes:** present (S-04, w realizacji) — lekka paczka mapy w OPFS (`scripts/map/`, `src/workers/map-download.worker.ts`), trasy A/B w `wrw.navigation`, snapshot PSP w `public/data/`, navigation core w `src/lib/navigation.ts` + `useGuidance`.
- **Sensors:** present — `useGeolocation`, `useHeading` (kompas iOS/Android z fallbackiem na azymut z ruchu), `useScreenWakeLock` w `src/components/hooks/`; matematyka geo w `src/lib/geo.ts`.
- **Voice:** present — synteza mowy przez `useVoiceGuidance` (`src/components/hooks/`) i `src/lib/services/speech.ts`; treść komunikatów w `phraseFor` (`src/lib/voice.ts`) jako warianty `GuidanceVoiceState`, ustawienie włącz/wyłącz osobno pod `wrw.voice`. Nowe komunikaty dopisuje się jako wariant stanu, nigdy wołając `speechSynthesis` wprost.
- **Deploy / infra:** present — assets-only Worker `w-razie-w` na Cloudflare; CI (`.github/workflows/ci.yml`) na `main`: lint, `astro check`, `npm test`, build, smoke, deploy z `main` i smoke na żywym adresie.
- **Observability:** absent — świadomie poza MVP (PRD: brak guardrails).
- **Tests:** partial — Vitest tylko dla czystych funkcji w `src/lib/`: geo, plan z migracją v1 → v2, sekwencja kroków (`buildSteps`, `resumeIndex`, `targetPlaceKind`), przebieg ewakuacji (`parseRun` z progiem świeżości) oraz treść i progi głosu (`voice`, `voice-settings`); `scripts/smoke.mjs` sprawdza strony, precache i sekcję „Miejsca” na stronie domowej; brak testów komponentów i E2E (ścieżki z czujnikami weryfikowane ręcznie na telefonie).

## Foundations

### F-01: Statyczna powłoka aplikacji działająca offline

- **Outcome:** (foundation) aplikacja buduje się jako statyczna, bez serwera i kont; po pierwszym otwarciu ładuje się w trybie samolotowym; interfejs jest po polsku; każdy merge do `main` wdraża ją pod publiczny adres.
- **Change ID:** offline-app-shell
- **PRD refs:** US-01 (kryterium „całość działa w trybie samolotowym”), NFR (cały interfejs po polsku), Access Control (profil lokalny, brak kont i serwera)
- **Unlocks:** S-01 (ścieżka weryfikacji: prowadzenie testowane w trybie samolotowym na telefonie pod publicznym adresem); usuwa elementy startera sprzeczne z PRD (logowanie, renderowanie po stronie serwera), żeby żaden slice ich nie dziedziczył.
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** sekwencjonowane pierwsze, bo bez działania offline i publicznego adresu nie da się zweryfikować gwiazdy przewodniej na telefonie; zakres to tylko powłoka i wdrożenie, a zapis planu, mapa i treści wchodzą w slice'ach, które ich używają.
- **Status:** done

## Slices

### S-01: Prowadzenie do punktu offline

- **Outcome:** użytkownik może wskazać punkt ewakuacji, przytrzymać przycisk alarmu i w trybie samolotowym iść za dużą strzałką z odległością do punktu; plan zostaje zapisany na urządzeniu.
- **Change ID:** guided-to-point-offline
- **PRD refs:** US-01, FR-004, FR-006, FR-012, FR-014, NFR (pierwszy krok < 2 s od zwolnienia alarmu)
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy strzałka i odległość działają wiarygodnie na telefonach używanych na scenie (dokładność położenia i kompasu w budynku)? — Owner: team. Block: no.
- **Risk:** najwyżej ryzykowny element demo idzie pierwszy; jeśli lokalizacja lub kompas zawiodą, zostaje najwięcej czasu na plan B. Decyzja z planowania: demo na zewnątrz na realnych czujnikach, tryb z symulowaną pozycją odrzucony.
- **Status:** done

### S-02: Kroki ewakuacji i przełączenie na miejsce zapasowe

- **Outcome:** użytkownik może przejść ewakuację jako sekwencję jednego kroku na ekran (miejsce spotkania, potem dalsze kroki) i przyciskiem „niedostępne” przełączyć prowadzenie na miejsce zapasowe.
- **Change ID:** step-flow-and-fallback
- **PRD refs:** US-01, FR-013
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** zamienia prowadzenie do jednego punktu w sekwencję z planu; tani, a bez niego kryterium akceptacji „niedostępne” z US-01 nie przejdzie na scenie.
- **Status:** proposed

### S-03: Głos prowadzący po polsku

- **Outcome:** użytkownik słyszy kolejne kroki po polsku, domyślnie włączone, i może głos wyłączyć.
- **Change ID:** voice-guidance
- **PRD refs:** US-01, FR-015
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-04, S-05
- **Blockers:** —
- **Unknowns:**
  - Czy synteza mowy po polsku działa offline na telefonach demo (dostępność głosu bez sieci)? — Owner: team. Block: no. Stan: `/czujniki` ma test „Sprawdź głos” z instrukcją pobrania polskich danych głosowych; testy na telefonie demo (tryb samolotowy) zaliczone 2026-10-03 — polski głos działa offline.
- **Risk:** zależny od możliwości urządzenia; sprawdzenie wcześnie pozwala w razie braku polskiego głosu offline przygotować nagrane komunikaty.
- **Status:** done

### S-04: Mapa i trasa offline

- **Outcome:** użytkownik może pobrać na urządzenie mapę regionu; gdy jest sieć, aplikacja sama wybiera najbliższy pieszo punkt schronienia PSP (i zapasowy) i odświeża trasę z jego bieżącej lokalizacji, a po utracie sieci strzałka prowadzi po ostatniej przygotowanej trasie, z mapą jako drugim poziomem. Bez przeliczania trasy offline (PRD: „Mapa i nawigacja offline w MVP”).
- **Change ID:** offline-map-and-route
- **PRD refs:** US-01, FR-004, FR-007, FR-014
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-05
- **Blockers:** —
- **Unknowns:** rozstrzygnięte w planie zmiany (`context/changes/offline-map-and-route/`): lekka paczka Protomaps/PMTiles dla Małopolski (99 MB) na R2, pobierana do OPFS; trasy piesze z publicznego OSRM (FOSSGIS); punkty schronienia z otwartego zbioru PSP (dane.gov.pl); odświeżanie tylko przy otwartej aplikacji; do serwisu tras trafiają wyłącznie współrzędne (wyjątek w NFR).
- **Risk:** najdroższy element według shape-notes; jako drugi poziom pod strzałką może zostać okrojony (np. mniejszy obszar mapy) bez utraty głównego kryterium sukcesu.
- **Status:** proposed

### S-05: Domownicy i kontakty awaryjne

- **Outcome:** organizator może dodać domowników (z potrzebami: dzieci, leki, zwierzęta) i kontakty awaryjne; dane zapisują się na urządzeniu.
- **Change ID:** household-members
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** rozszerza zapis planu z S-01 o dane rodziny, od których zależą plecak, onboarding i udostępnianie; prosty formularz, niskie ryzyko.
- **Status:** done

### S-06: Spersonalizowana checklista plecaka

- **Outcome:** organizator może odhaczać pozycje checklisty plecaka ewakuacyjnego dobranej do składu rodziny.
- **Change ID:** personalized-backpack
- **PRD refs:** FR-003
- **Prerequisites:** S-05
- **Parallel with:** S-02, S-03, S-04
- **Blockers:** —
- **Unknowns:**
  - Jakie pozycje plecaka i reguły dopasowania przyjmujemy (treść poradnika GOV jako źródło)? — Owner: team. Block: no.
- **Risk:** wartość zależy od treści, nie od techniki; trzymamy prosty zestaw reguł (dzieci, leki, zwierzęta), żeby nie zjadł czasu potrzebnego na prowadzenie.
- **Status:** done

### S-07: Onboarding przy pierwszym uruchomieniu — usunięte

- **Decyzja 2026-10-04:** osobny onboarding odpada. Jego funkcję przejmuje S-08: pierwsze uruchomienie to stan początkowy ekranu gotowości, a wszystkie czynności (w tym „Zainstaluj aplikację” i ilustracje poradnika) są quick winami w katalogu S-08 oraz na mapie gotowości.
- **Status:** dropped

### S-08: Ekran gotowości

- **Outcome:** organizator widzi jakościowy poziom gotowości (np. „72H Ready”) i następny quick win albo grupę kroków, które najbardziej podnoszą gotowość, zamiast listy braków. Strona główna `/` jest ekranem gotowości (Preparation Mode), alarm jest przyklejony na dole, a konfiguratory są podstronami z powrotem „← Gotowość”. Pierwsze uruchomienie to stan początkowy tego ekranu.
- **Change ID:** readiness-screen
- **PRD refs:** FR-008, FR-009
- **Prerequisites:** S-06 (S-04 nie blokuje: milestone „Mapa offline” działa po jego dowiezieniu)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jakie poziomy gotowości i progi przyjmujemy w MVP i czym poziom różni się od kamienia milowego (Otwarte pytanie 2 z PRD)? — Owner: team. Block: no (wystarczy prosta decyzja na starcie planu).
- **Risk:** krok 6 przepływu demo; zastępuje onboarding (S-07 usunięte, decyzja 2026-10-04).
- **Status:** in progress (strona główna z poziomem, quick winami i dokiem alarmu jest wdrożona; do zrobienia: pełna ścieżka `/droga`)

### S-09: Przekazanie planu domownikowi

- **Outcome:** organizator może przekazać plan domownikowi; kopia pokazuje datę wersji, nieprzekazane zmiany pojawiają się jako krok na ekranie gotowości, a domownik otwiera plan tylko do odczytu, poprawia własne dane i może uruchomić prowadzenie.
- **Change ID:** share-plan
- **PRD refs:** FR-010, FR-011
- **Prerequisites:** S-08
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Format przekazania bez serwera (QR, plik, Bluetooth, sieć lokalna — otwarte w `PROJECT.md` sekcja 7) i czy plan z trasą mieści się w wybranym nośniku? — Owner: team. Block: no (do rozstrzygnięcia w planie zmiany).
- **Risk:** krok 7 i drugorzędne kryterium sukcesu (drugi telefon); ostatni, bo przy braku czasu demo przechodzi bez niego na jednym telefonie.
- **Status:** proposed

### S-10: Automatyczny wybór schronu i trasa odświeżana w tle

- **Outcome:** (po MVP) aplikacja odświeża pozycję i trasę także wtedy, gdy nie jest otwarta (Periodic Background Sync tam, gdzie przeglądarka na to pozwala), i oferuje mapę kolejnych regionów. Automatyczny wybór schronu z trasą wszedł do MVP w S-04.
- **Change ID:** auto-shelter-and-route
- **PRD refs:** FR-007 (rozszerzenie po MVP), NFR „Dane nie opuszczają urządzenia”
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Dane o schronach i wyjątek prywatności dla serwisu tras — rozstrzygnięte w S-04 (zbiór PSP z dane.gov.pl, wyjątek w NFR).
  - Periodic Background Sync działa tylko w Chromium, wymaga zainstalowanej PWA i nie daje kontroli nad interwałem (w Chrome praktycznie co kilkanaście godzin, nie co 30 minut) — „co 30 min” realnie oznacza „przy otwarciu aplikacji i cyklicznie, gdy jest otwarta”. — Owner: team. Block: no.
- **Risk:** pomysł zgłoszony w trakcie planowania S-01; automatyczny wybór schronu przeniesiony do S-04 (decyzja zespołu 2026-10-03), tu zostaje tylko praca w tle i kolejne regiony.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID               | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                                                                  |
| ---------- | ----------------------- | ---------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| F-01       | offline-app-shell       | Statyczna powłoka offline + wdrożenie z main               | yes                   | Run `/10x-plan offline-app-shell`                                                      |
| S-01       | guided-to-point-offline | Prowadzenie do punktu offline (alarm, strzałka, odległość) | yes                   | Zarchiwizowane 2026-10-03; testy w terenie zaliczone                                   |
| S-02       | step-flow-and-fallback  | Kroki ewakuacji i „niedostępne” → miejsce zapasowe         | yes                   | Zaimplementowane 2026-10-03; testy w terenie i archiwizacja po deployu                 |
| S-03       | voice-guidance          | Głos prowadzący po polsku                                  | yes                   | Zarchiwizowane 2026-10-03; testy w terenie zaliczone                                   |
| S-04       | offline-map-and-route   | Mapa i trasa offline jako drugi poziom                     | yes                   | Run `/10x-plan offline-map-and-route`; źródło mapy i serwis tras do ustalenia w planie |
| S-05       | household-members       | Domownicy i kontakty awaryjne                              | yes                   | Run `/10x-plan household-members`                                                      |
| S-06       | personalized-backpack   | Spersonalizowana checklista plecaka                        | yes                   | Zarchiwizowane 2026-10-03; testy w terenie zaliczone                                   |
| S-07       | first-run-onboarding    | Usunięte — zastąpione przez S-08                           | —                     | Decyzja 2026-10-04                                                                     |
| S-08       | readiness-screen        | Ekran gotowości z poziomem i quick wins                    | no                    | Po S-06; zastępuje usunięty onboarding S-07 (2026-10-04)                              |
| S-09       | share-plan              | Przekazanie planu domownikowi                              | no                    | Po S-08; format do ustalenia w planie                                                  |
| S-10       | auto-shelter-and-route  | Trasa odświeżana w tle i kolejne regiony (po MVP)          | no                    | Po S-04; wybór schronu już w S-04                                                      |

## Open Roadmap Questions

1. **„72H Ready” jako poziom gotowości (FR-009, must-have) i jako milestone (FR-016, nice-to-have):** ten sam przykład występuje w obu wymaganiach. Do rozstrzygnięcia, czym w MVP różni się poziom gotowości od kamienia milowego. — Owner: zespół. Block: nie blokuje planowania; rozstrzygnąć na starcie planu S-08.

Rozstrzygnięte 2026-10-03:

- **Offline i prywatność poza NFR:** oba wracają w PRD jako twarde NFR (offline-first, dane nie opuszczają urządzenia). Zakres offline dla mapy i trasy: PRD „Mapa i nawigacja offline w MVP”.

## Parked

- **Własna baza schronów** — Why parked: PRD §Non-Goals; korzystamy z otwartego zbioru PSP, automatyczny wybór schronu wszedł w `S-04`.
- **Automatyczny start z alertów (RSO)** — Why parked: PRD §Non-Goals; Execution Mode tylko ręcznie.
- **Warstwa społeczności** — Why parked: PRD §Non-Goals; MVP obsługuje jedno gospodarstwo domowe.
- **Przeliczanie trasy offline** — Why parked: PRD §Non-Goals; w MVP po utracie sieci prowadzenie korzysta z ostatniej trasy przygotowanej przy dostępie do sieci, a po zejściu z trasy prowadzi do niej z powrotem (S-04). Future extension: routing na urządzeniu na lokalnym grafie.
- **Szyfrowany transfer planu** — Why parked: PRD §Non-Goals; przekazanie w najprostszej formie (FR-010).
- **Punkty i streaki** — Why parked: PRD §Non-Goals; odrzucone w decyzjach zakresowych.
- **Role domowników i scenariusze (FR-005)** — Why parked: nice-to-have; w MVP jeden wspólny plan.
- **Kamienie milowe gotowości (FR-016)** — Why parked: nice-to-have; cel „szybkość do demo”.
- **Emergency drill (FR-017)** — Why parked: nice-to-have; cel „szybkość do demo”.
- **Wibracje w Execution Mode** — Why parked: decyzja zespołu w US-01 (odstępstwo od `PROJECT.md` 4.1 pkt 6).

## Done

- **F-01: (foundation) aplikacja buduje się jako statyczna, bez serwera i kont; po pierwszym otwarciu ładuje się w trybie samolotowym; interfejs jest po polsku; każdy merge do `main` wdraża ją pod publiczny adres.** — Archived 2026-10-03 → `context/archive/2026-10-03-offline-app-shell/`. Lesson: —.
- **S-01: użytkownik może wskazać punkt ewakuacji, przytrzymać przycisk alarmu i w trybie samolotowym iść za dużą strzałką z odległością do punktu; plan zostaje zapisany na urządzeniu.** — Archived 2026-10-03 → `context/archive/2026-10-03-guided-to-point-offline/`. Lesson: —.
- **S-03: użytkownik słyszy kolejne kroki po polsku, domyślnie włączone, i może głos wyłączyć.** — Archived 2026-10-03 → `context/archive/2026-10-03-voice-guidance/`. Lesson: —.
- **S-06: organizator może odhaczać pozycje checklisty plecaka ewakuacyjnego dobranej do składu rodziny.** — Archived 2026-10-03 → `context/archive/2026-10-03-personalized-backpack/`. Lesson: —.
- **S-05: organizator może dodać domowników (z potrzebami: dzieci, leki, zwierzęta) i kontakty awaryjne; dane zapisują się na urządzeniu.** — Archived 2026-10-03 → `context/archive/2026-10-03-household-members/`. Lesson: —.
