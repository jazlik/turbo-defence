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

| ID   | Change ID               | Outcome (user can …)                                                                                                            | Prerequisites | PRD refs                                                                              | Status   |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- | -------- |
| F-01 | offline-app-shell       | (foundation) aplikacja jest statyczna, otwiera się bez sieci i wdraża się automatycznie z `main`                                | —             | US-01, NFR (cały interfejs po polsku), Access Control                                 | done     |
| S-01 | guided-to-point-offline | wskazać punkt, przytrzymać alarm i w trybie samolotowym iść za strzałką z odległością                                           | F-01          | US-01, FR-004, FR-006, FR-012, FR-014, NFR (pierwszy krok < 2 s od zwolnienia alarmu) | done     |
| S-02 | step-flow-and-fallback  | przejść ewakuację krok po kroku i jednym przyciskiem „niedostępne” przełączyć się na miejsce zapasowe                           | S-01          | US-01, FR-013                                                                         | proposed |
| S-03 | voice-guidance          | słyszeć kolejne kroki po polsku i wyłączyć głos                                                                                 | S-01          | US-01, FR-015                                                                         | proposed |
| S-04 | offline-map-and-route   | pobrać mapę regionu, mieć trasę do punktu odświeżaną przy dostępie do sieci i zobaczyć je offline jako drugi poziom prowadzenia | S-01          | US-01, FR-007, FR-014                                                                 | proposed |
| S-05 | household-members       | dodać domowników i kontakty awaryjne                                                                                            | S-01          | FR-002                                                                                | proposed |
| S-06 | personalized-backpack   | odhaczać checklistę plecaka dopasowaną do składu rodziny                                                                        | S-05          | FR-003                                                                                | proposed |
| S-07 | first-run-onboarding    | przy pierwszym uruchomieniu przejść interaktywny onboarding od domowników do pobrania trasy                                     | S-04, S-06    | US-01, FR-001                                                                         | proposed |
| S-08 | readiness-screen        | zobaczyć jakościowy poziom gotowości i następny quick win                                                                       | S-07          | FR-008, FR-009                                                                        | proposed |
| S-09 | share-plan              | przekazać plan domownikowi, który otwiera go tylko do odczytu i poprawia własne dane                                            | S-08          | FR-010, FR-011                                                                        | proposed |
| S-10 | auto-shelter-and-route  | (po MVP) dostać automatycznie wybrany najbliższy schron z trasą odświeżaną, gdy aplikacja jest otwarta                          | S-04          | FR-004 (rozszerzenie), PRD Non-Goals                                                  | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                  | Chain                                                   | Note                                                                          |
| ------ | ---------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A      | Prowadzenie w kryzysie | `F-01` → `S-01` → `S-02` / `S-03` / `S-04` (równolegle) | Ścieżka głównego kryterium sukcesu; przy celu „szybkość” idzie pierwsza.      |
| B      | Przygotowanie i plan   | `S-05` → `S-06` → `S-07` → `S-08` → `S-09`              | Dołącza do strumienia A w `S-01` (zapis planu), a `S-07` czeka też na `S-04`. |

## Baseline

What's already in place in the codebase as of `2026-10-03` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — framework UI, stylowanie i komponenty ze startera; tylko strona startowa (`src/pages/index.astro`, `astro.config.mjs`).
- **Backend / API:** partial — renderowanie po stronie serwera i endpointy logowania ze startera (`src/pages/api/auth/*`); PRD nie przewiduje serwera.
- **Data:** absent — brak lokalnego zapisu; `supabase/config.toml` bez migracji, nieużywany przez PRD.
- **Auth:** partial — logowanie Supabase ze startera (`src/middleware.ts`); PRD: profil lokalny, bez kont.
- **Deploy / infra:** partial — konfiguracja hostingu (`wrangler.jsonc`), CI w `.github/workflows/ci.yml` ustawione na branch `master` zamiast `main` i wymagające sekretów Supabase.
- **Observability:** absent — świadomie poza MVP (PRD: brak guardrails).
- **Offline / instalowalność:** absent — brak manifestu aplikacji i mechanizmu działania bez sieci.

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
  - Czy synteza mowy po polsku działa offline na telefonach demo (dostępność głosu bez sieci)? — Owner: team. Block: no.
- **Risk:** zależny od możliwości urządzenia; sprawdzenie wcześnie pozwala w razie braku polskiego głosu offline przygotować nagrane komunikaty.
- **Status:** proposed

### S-04: Mapa i trasa offline

- **Outcome:** użytkownik może pobrać na urządzenie mapę regionu; gdy jest sieć, aplikacja odświeża trasę z jego bieżącej lokalizacji do punktu, a po utracie sieci w trybie prowadzenia otwiera mapę z ostatnią przygotowaną trasą jako drugi poziom pod strzałką. Bez przeliczania trasy offline (PRD: „Mapa i nawigacja offline w MVP”).
- **Change ID:** offline-map-and-route
- **PRD refs:** US-01, FR-007, FR-014
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-05
- **Blockers:** —
- **Unknowns:**
  - Skąd mapa regionu i serwis przygotowujący trasę (otwarte w `PROJECT.md` sekcja 7), czy licencja pozwala pobrać region na urządzenie i ile miejsca zajmie? — Owner: team. Block: no (do rozstrzygnięcia w planie zmiany).
  - Czy aplikacja webowa może odświeżać lokalizację i trasę w tle, gdy nie jest otwarta (przeglądarki mocno to ograniczają)? — Owner: team. Block: no (do rozstrzygnięcia w planie zmiany).
  - Wysyłanie lokalizacji do serwisu tras a NFR „Dane nie opuszczają urządzenia” (PRD Open Question 3). — Owner: team. Block: no (do rozstrzygnięcia w planie zmiany).
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
- **Status:** proposed

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
- **Status:** proposed

### S-07: Onboarding przy pierwszym uruchomieniu

- **Outcome:** organizator przy pierwszym uruchomieniu przechodzi interaktywny onboarding w kolejności przepływu: domownicy i kontakty, plecak, miejsca (spotkanie, zapasowe, schron), zapis planu i pobranie trasy offline.
- **Change ID:** first-run-onboarding
- **PRD refs:** US-01, FR-001
- **Prerequisites:** S-04, S-06
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** spina gotowe kawałki w kroki 1–5 przepływu demo; późno, bo integruje elementy z obu strumieni, a sam z siebie nie dowodzi prowadzenia.
- **Status:** proposed

### S-08: Ekran gotowości

- **Outcome:** organizator widzi jakościowy poziom gotowości (np. „72H Ready”) i następny quick win albo grupę kroków, które najbardziej podnoszą gotowość, zamiast listy braków.
- **Change ID:** readiness-screen
- **PRD refs:** FR-008, FR-009
- **Prerequisites:** S-07
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jakie poziomy gotowości i progi przyjmujemy w MVP i czym poziom różni się od kamienia milowego (Otwarte pytanie 2 z PRD)? — Owner: team. Block: no (wystarczy prosta decyzja na starcie planu).
- **Risk:** krok 6 przepływu demo; zależy od danych z onboardingu, więc idzie po nim.
- **Status:** proposed

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

- **Outcome:** (po MVP) aplikacja co jakiś czas pobiera pozycję użytkownika, wybiera najbliższy schron, wyznacza do niego trasę i zapisuje ją na urządzeniu, żeby była dostępna offline. Nie jest częścią MVP — w MVP punkt wskazuje organizator ręcznie (FR-004, PRD Non-Goals).
- **Change ID:** auto-shelter-and-route
- **PRD refs:** FR-004 (rozszerzenie po MVP), PRD Non-Goals („Bez własnej bazy i propozycji schronów”), NFR „Dane nie opuszczają urządzenia”
- **Prerequisites:** S-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Brak potwierdzonego API z danymi o schronach (dostępność danych PSP / GdzieSięUkryć.pl niezweryfikowana, `konkurencja/porownanie-gdziesieukryc-vs-household-resilience.md:85`). — Owner: team. Block: yes.
  - Konflikt z twardym NFR prywatności: odpytywanie zewnętrznych usług o najbliższy schron i trasę wysyła na zewnątrz pozycję użytkownika. — Owner: team. Block: yes (wymaga wyjątku w NFR albo danych i trasowania na urządzeniu).
  - Periodic Background Sync działa tylko w Chromium, wymaga zainstalowanej PWA i nie daje kontroli nad interwałem (w Chrome praktycznie co kilkanaście godzin, nie co 30 minut) — „co 30 min” realnie oznacza „przy otwarciu aplikacji i cyklicznie, gdy jest otwarta”. — Owner: team. Block: no.
- **Risk:** pomysł zgłoszony w trakcie planowania S-01 i świadomie odłożony; zapisany jako jawny slice, żeby nie wrócił jako niespodzianka w innym zadaniu.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID               | Suggested issue title                                        | Ready for `/10x-plan` | Notes                                                          |
| ---------- | ----------------------- | ------------------------------------------------------------ | --------------------- | -------------------------------------------------------------- |
| F-01       | offline-app-shell       | Statyczna powłoka offline + wdrożenie z main                 | yes                   | Run `/10x-plan offline-app-shell`                              |
| S-01       | guided-to-point-offline | Prowadzenie do punktu offline (alarm, strzałka, odległość)   | yes                   | Zarchiwizowane 2026-10-03; testy w terenie po deployu          |
| S-02       | step-flow-and-fallback  | Kroki ewakuacji i „niedostępne” → miejsce zapasowe           | no                    | Po S-01                                                        |
| S-03       | voice-guidance          | Głos prowadzący po polsku                                    | no                    | Po S-01                                                        |
| S-04       | offline-map-and-route   | Mapa i trasa offline jako drugi poziom                       | no                    | Po S-01; źródło mapy i serwis tras do ustalenia w planie       |
| S-05       | household-members       | Domownicy i kontakty awaryjne                                | no                    | Po S-01                                                        |
| S-06       | personalized-backpack   | Spersonalizowana checklista plecaka                          | no                    | Po S-05                                                        |
| S-07       | first-run-onboarding    | Onboarding przy pierwszym uruchomieniu                       | no                    | Po S-04 i S-06                                                 |
| S-08       | readiness-screen        | Ekran gotowości z poziomem i quick wins                      | no                    | Po S-07                                                        |
| S-09       | share-plan              | Przekazanie planu domownikowi                                | no                    | Po S-08; format do ustalenia w planie                          |
| S-10       | auto-shelter-and-route  | Automatyczny wybór schronu i trasa odświeżana w tle (po MVP) | no                    | Po S-04; dane o schronach i NFR prywatności do rozstrzygnięcia |

## Open Roadmap Questions

1. **„72H Ready” jako poziom gotowości (FR-009, must-have) i jako milestone (FR-016, nice-to-have):** ten sam przykład występuje w obu wymaganiach. Do rozstrzygnięcia, czym w MVP różni się poziom gotowości od kamienia milowego. — Owner: zespół. Block: nie blokuje planowania; rozstrzygnąć na starcie planu S-08.

Rozstrzygnięte 2026-10-03:

- **Offline i prywatność poza NFR:** oba wracają w PRD jako twarde NFR (offline-first, dane nie opuszczają urządzenia). Zakres offline dla mapy i trasy: PRD „Mapa i nawigacja offline w MVP”.

## Parked

- **Własna baza i propozycje schronów** — Why parked: PRD §Non-Goals; punkt wskazywany ręcznie (FR-004). Automatyczny wybór schronu zaplanowany po MVP jako `S-10`.
- **Automatyczny start z alertów (RSO)** — Why parked: PRD §Non-Goals; Execution Mode tylko ręcznie.
- **Warstwa społeczności** — Why parked: PRD §Non-Goals; MVP obsługuje jedno gospodarstwo domowe.
- **Przeliczanie trasy offline** — Why parked: PRD §Non-Goals; w MVP po utracie sieci prowadzenie korzysta z ostatniej trasy przygotowanej przy dostępie do sieci.
- **Szyfrowany transfer planu** — Why parked: PRD §Non-Goals; przekazanie w najprostszej formie (FR-010).
- **Punkty i streaki** — Why parked: PRD §Non-Goals; odrzucone w decyzjach zakresowych.
- **Role domowników i scenariusze (FR-005)** — Why parked: nice-to-have; w MVP jeden wspólny plan.
- **Kamienie milowe gotowości (FR-016)** — Why parked: nice-to-have; cel „szybkość do demo”.
- **Emergency drill (FR-017)** — Why parked: nice-to-have; cel „szybkość do demo”.
- **Wibracje w Execution Mode** — Why parked: decyzja zespołu w US-01 (odstępstwo od `PROJECT.md` 4.1 pkt 6).

## Done

- **F-01: (foundation) aplikacja buduje się jako statyczna, bez serwera i kont; po pierwszym otwarciu ładuje się w trybie samolotowym; interfejs jest po polsku; każdy merge do `main` wdraża ją pod publiczny adres.** — Archived 2026-10-03 → `context/archive/2026-10-03-offline-app-shell/`. Lesson: —.
- **S-01: użytkownik może wskazać punkt ewakuacji, przytrzymać przycisk alarmu i w trybie samolotowym iść za dużą strzałką z odległością do punktu; plan zostaje zapisany na urządzeniu.** — Archived 2026-10-03 → `context/archive/2026-10-03-guided-to-point-offline/`. Lesson: —.
