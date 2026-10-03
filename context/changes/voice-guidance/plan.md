# Głos prowadzący po polsku (S-03) — plan implementacji

## Overview

Dodajemy do Execution Mode (`/alarm`) polski głos, który czyta prowadzenie: zmiany stanu (start, sygnał GPS, problemy z lokalizacją, „na miejscu”) i odległość po przekroczeniu kolejnych progów w marszu do celu. Głos jest domyślnie włączony, można go wyłączyć, a wybór zostaje na urządzeniu. Całość działa w trybie samolotowym, o ile telefon ma polski głos offline, a ekran `/czujniki` pozwala to sprawdzić zawczasu.

Roadmap: `S-03`, change id `voice-guidance`, prerequisite `S-01` (done, `context/archive/2026-10-03-guided-to-point-offline/`).
PRD: US-01 („Głos czyta kroki domyślnie i można go wyłączyć”), FR-015, NFR (offline-first, interfejs i komunikaty głosowe po polsku, dane nie opuszczają urządzenia).

## Current State Analysis

Po `S-01` mamy działające prowadzenie, ale całkowicie nieme:

- `src/components/GuidanceScreen.tsx` liczy stan prowadzenia inline w renderze (`arrived`, `guiding`, `isStale`, `locationProblem`, `distance`) i pokazuje cztery widoki: brak punktu, szukam sygnału / problem z lokalizacją, prowadzenie, na miejscu. Sekcja treści ma już `aria-live="polite"`. Stopka zawiera link „Wyjdź z trybu alarmu” i warunkowo „Włącz kompas”.
- `src/pages/alarm.astro` to osobny dokument, na który `src/components/AlarmButton.tsx` przechodzi przez `window.location.assign("/alarm")` po przytrzymaniu 2 s.
- `src/components/SensorCheck.tsx` ma wzorzec sekcji czujnika: przycisk sprawdzenia, `ResultBadge` z wynikami `working | denied | unavailable` (tekst + ikona), instrukcja naprawy po polsku.
- `src/lib/services/plan-storage.ts` trzyma `HouseholdPlan` pod kluczem `wrw.plan` z czystym `parsePlan` testowanym w Vitest (`plan-storage.test.ts`). `src/lib/geo.ts` ma `formatDistance` (zaokrąglenie do 10 m, km z jedną cyfrą po przecinku).
- `src/components/hooks/useScreenWakeLock.ts` trzyma ekran włączony na `/alarm`.
- W kodzie nie ma żadnego użycia `speechSynthesis` ani audio.

## Desired End State

Na telefonie pod `https://w-razie-w.jzogala.workers.dev`:

1. Na `/czujniki` sekcja „Głos” z przyciskiem „Sprawdź głos”: telefon mówi zdanie testowe, a wynik to „Działa offline”, „Tylko z siecią” albo „Brak polskiego głosu”, z instrukcją pobrania polskich danych głosowych dla Androida i iOS.
2. W trybie samolotowym po przytrzymaniu alarmu `/alarm` wypowiada cel i stan („Idź do punktu ewakuacji: Szkoła. 480 metrów w linii prostej.”). Jeśli przeglądarka zablokuje mowę, widać bursztynowy przycisk „Włącz głos”; jedno dotknięcie odblokowuje i czyta bieżący stan.
3. W marszu do celu głos podaje odległość po przekroczeniu progów: powyżej 1 km co 500 m, od 1 km do 200 m co 100 m, poniżej 200 m co 50 m. Skoki GPS nie powodują powtórek.
4. Utrata i odzyskanie sygnału GPS, problem z lokalizacją i dojście na miejsce są wypowiadane jednym komunikatem.
5. Przełącznik „Głos: włączony / wyłączony” w stopce `/alarm` natychmiast ucisza lub włącza głos; wybór przeżywa zamknięcie aplikacji i nie trafia do planu przekazywanego domownikom.
6. Brak polskiego głosu na `/alarm` widać jako tekst, a nie jako cichą awarię.

Weryfikacja: `npm run lint`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke` przechodzą lokalnie i w CI; przejście 1–6 ręcznie na telefonie w trybie samolotowym.

### Key Discoveries:

- **Gest z przytrzymania alarmu nie przechodzi na `/alarm`.** `AlarmButton.tsx` ładuje nowy dokument, a aktywacja użytkownika jest per dokument. iOS Safari ignoruje `speechSynthesis.speak()` bez gestu (bez błędu, po prostu nie startuje), Chromium może zgłosić błąd `not-allowed`. Stąd wykrywanie blokady i przycisk „Włącz głos” zamiast przebudowy przejścia — przebudowa złamałaby architekturę S-01 (osobna strona, mały bundle, NFR 2 s). Nagrania audio tego nie omijają: `HTMLAudioElement` podlega tej samej polityce odtwarzania.
- **Lista głosów na Chromium przychodzi asynchronicznie.** `speechSynthesis.getVoices()` zwraca pustą tablicę do pierwszego zdarzenia `voiceschanged`; iOS zwraca listę od razu. Kod musi obsłużyć oba przypadki i nie czekać w nieskończoność.
- **Kod języka bywa różny.** Głosy mają `lang` jako `pl-PL`, a na części Androidów `pl_PL` — dopasowanie po prefiksie `pl` po normalizacji.
- **`voice.localService` to wskazówka, nie gwarancja.** Na Androidzie z Google TTS flaga nie zawsze odzwierciedla, czy polskie dane głosowe są pobrane. Ostateczny dowód to test na `/czujniki` w trybie samolotowym — instrukcja w UI musi to powiedzieć.
- **Ustawienie głosu nie należy do `HouseholdPlan`.** Plan wędruje do domowników w S-09; włączenie głosu to preferencja tego telefonu. Osobny klucz `wrw.voice`, osobny czysty parser, bez podnoszenia `schemaVersion` planu.
- **Polska odmiana liczebników jest nietrywialna:** 1 metr; 2–4, 22–24, 32–34… metry; 5–21, 25–31, 12–14, 112–114… metrów; ułamek zawsze „kilometra” („1,5 kilometra”), a pełne kilometry jak metry („2 kilometry”, „5 kilometrów”). To czysta funkcja — idealna do Vitest.
- **Punkt wpięcia dla S-02.** S-02 (`step-flow-and-fallback`) idzie równolegle i doda sekwencję kroków. Hook przyjmuje stan prowadzenia jako unię z wariantami; krok sekwencji dojdzie jako nowy wariant z własnym tekstem, bez zmian w usłudze mowy.

## What We're NOT Doing

- **Komunikaty kierunku** („cel jest po lewej”). Decyzja z planowania: drgający kompas w budynku lub przy metalu dałby fałszywe polecenia, a mylący głos w kryzysie jest gorszy niż cisza. Kierunek zostaje na strzałce.
- **Nagrane komunikaty audio.** Decyzja z planowania: wykrywamy brak polskiego głosu i instruujemy, jak go pobrać. Nagrania nie omijają blokady odtwarzania, a sklejanie liczb z plików zjada czas hackathonu.
- **Przebudowa przejścia alarmu w tej samej stronie**, żeby zachować gest. Za drogie wobec ryzyka dla NFR 2 s.
- **Przycisk „Powtórz”.** Decyzja z planowania: stopka zostaje minimalna (`JEZYK_WIZUALNY.md` §5).
- **Ustawienie głosu w Preparation Mode.** Przełącznik jest tylko na `/alarm`; `/czujniki` dostaje test, nie ustawienie.
- **Mówienie przy zablokowanym ekranie i w tle.** Przeglądarki wstrzymują stronę; zostaje jako znane ograniczenie w PRD.
- **Komunikat przy oddalaniu się od celu.** Progi wyzwalają się tylko w dół; przy oddalaniu głos milczy, a ekran pokazuje rosnącą odległość.
- **Sekwencja kroków i wyjście „niedostępne”** — S-02. Ten slice daje tylko punkt wpięcia.
- **Wybór głosu, tempa, głośności.** Domyślne parametry syntezatora, `lang: "pl-PL"`.
- **Testy komponentów i mockowanie `speechSynthesis`.** Vitest wyłącznie dla czystych funkcji, zgodnie z konwencją repo.

## Implementation Approach

Kolejność „najpierw rozstrzygnij niewiadomą”: czysta logika z testami, potem usługa mowy razem z testem na `/czujniki` — bo ten ekran od razu odpowiada na pytanie z roadmapy, czy polski głos działa offline na telefonach do demo — a dopiero na końcu integracja z `/alarm`, która kosztuje najwięcej pracy w terenie.

Trzy warstwy, każda z jedną odpowiedzialnością:

| Warstwa | Plik | Odpowiedzialność |
| --- | --- | --- |
| Czysta logika | `src/lib/voice.ts` | Odmiana odległości, progi, teksty komunikatów, wybór polskiego głosu |
| Wspólne teksty | `src/lib/guidance-copy.ts` | `LOCATION_PROBLEMS` przeniesione z `GuidanceScreen.tsx`, używane przez ekran i głos |
| Ustawienie | `src/lib/services/voice-settings.ts` | `wrw.voice` w localStorage, odporny odczyt |
| Usługa mowy | `src/lib/services/speech.ts` | `speechSynthesis`: głosy, mówienie, wykrywanie blokady |
| Hook | `src/components/hooks/useVoiceGuidance.ts` | Kiedy i co powiedzieć na `/alarm` |

## Critical Implementation Details

**Wykrywanie blokady.** Po `speak()` czekamy na zdarzenie `start` utterance. Błąd `not-allowed` albo brak `start` w ciągu 1500 ms oznacza blokadę (iOS nie zgłasza błędu, po prostu milczy). Każde odblokowanie musi wywołać `speak()` synchronicznie w obsłudze kliknięcia — jak `requestHeadingPermission()` w S-01; `await` przed `speak()` w handlerze gubi gest na iOS.

**Stabilizacja zmian stanu.** `liveFix` w `GuidanceScreen` przełącza się na `stale` po 20 s ciszy GPS, a przy słabym sygnale może migać. Zmiana rodzaju stanu jest wypowiadana dopiero, gdy utrzyma się 2 s; inaczej głos powtarzałby „utracono sygnał / mam sygnał”. Progi odległości liczymy wyłącznie z żywego fixu — dane z ostatniej pozycji nie generują komunikatów odległości.

**Kolejka.** Każdy nowy komunikat przerywa poprzedni (`cancel()` przed `speak()`): najnowsza informacja wygrywa. Komunikaty są krótkie, więc nie trafiają w znany problem Chromium z urywaniem długich wypowiedzi po ok. 15 s. Jeśli na telefonie testowym `cancel()` tuż przed `speak()` połyka nową wypowiedź (zgłaszany błąd Chromium), dopuszczalne jest krótkie opóźnienie `speak()` — do potwierdzenia w fazie 2, nie zakładać z góry.

**Widoczność strony.** Gdy `document.visibilityState` jest `hidden`, hook przerywa mowę i nie mówi; po powrocie do `visible` raz wypowiada pełny bieżący stan. Przy wyjściu z `/alarm` (odmontowanie) — `cancel()`.

## Phase 1: Logika głosu i ustawienie

### Overview

Czyste funkcje bez UI: odmiana odległości, progi, teksty komunikatów, wybór polskiego głosu i zapis ustawienia. Po tej fazie nic nie słychać, ale cała logika „co powiedzieć” jest sprawdzona testami.

### Changes Required:

#### 1. Logika komunikatów

**File**: `src/lib/voice.ts` (nowy)

**Intent**: Jedno miejsce z wszystkim, co da się policzyć bez przeglądarki: jak wypowiedzieć odległość, kiedy ogłosić próg, jaki tekst powiedzieć przy danym stanie i który głos wybrać.

**Contract**:

- `spokenDistance(meters: number): string` — zaokrąglenie jak `formatDistance` z `src/lib/geo.ts` (poniżej 1000 m do 10 m, powyżej km z jedną cyfrą), ale słowami jednostek z polską odmianą: „1 metr”, „480 metrów”, „22 metry”, „1,5 kilometra”, „2 kilometry” (końcówka „,0” znika), „12 kilometrów”.
- `distanceMark(meters: number): number` — próg, do którego należy odległość: powyżej 1000 m w dół do wielokrotności 500, od 200 do 1000 m do wielokrotności 100, poniżej 200 m do wielokrotności 50.
- `nextDistanceAnnouncement(lastMark: number | null, meters: number): { announce: boolean; mark: number }` — ogłasza, gdy `distanceMark(meters)` spadł poniżej `lastMark`; nigdy nie ogłasza progu 0 (to przejmuje „na miejscu”); gdy odległość urosła o więcej niż jeden krok progu powyżej `lastMark`, przesuwa `lastMark` w górę bez ogłoszenia, żeby ponowne zbliżanie się znów ogłaszało progi. Drganie wokół jednego progu nie ogłasza dwa razy.
- `GuidanceVoiceState` — unia wariantów: `noPoint`; `searching` (`label`); `locationProblem` (`label`, `problem: "denied" | "unavailable"`); `guiding` (`label`, `meters`, `live: boolean`); `arrived` (`label`). To jest punkt wpięcia S-02 — nowy wariant kroku dochodzi tutaj.
- `phraseFor(state: GuidanceVoiceState, previous: GuidanceVoiceState | null): string` — pełny komunikat przy wejściu (`previous === null`) albo krótki przy zmianie. Teksty oparte na tych z `GuidanceScreen.tsx`, np. wejście `guiding`: „Idź do punktu ewakuacji: {label}. {odległość} w linii prostej.”; `searching` → `guiding` na żywo: „Mam sygnał GPS. Do punktu {odległość}.”; `guiding` żywy → nieżywy: „Utracono sygnał GPS. Odległość może być nieaktualna.”; `arrived`: „Jesteś na miejscu. Zostań tutaj i czekaj na pozostałych domowników.”; `locationProblem`: tytuł i instrukcja z `LOCATION_PROBLEMS`. Dane nieżywe przy wejściu: „… według ostatniej znanej pozycji.”
- `pickPolishVoice(voices: readonly { lang: string; localService: boolean }[])` — zwraca najlepszy polski głos i informację, czy jest lokalny: dopasowanie po prefiksie `pl` po normalizacji `_` → `-` i małych literach, lokalny przed sieciowym; `null`, gdy brak polskiego. Typ generyczny, żeby działał na `SpeechSynthesisVoice` i na zwykłych obiektach w testach.

Żeby `phraseFor` i `GuidanceScreen` nie rozjechały się w treści, teksty problemów z lokalizacją (`LOCATION_PROBLEMS`) przenosimy z `GuidanceScreen.tsx` do `src/lib/guidance-copy.ts` i importujemy w obu.

#### 2. Testy logiki

**File**: `src/lib/voice.test.ts` (nowy)

**Intent**: Zabezpieczyć odmianę i progi — błędy w nich słychać dopiero w terenie, w trakcie marszu.

**Contract**:

- Funkcja odmiany (eksportowana do testów, np. `polishUnit(n, ["metr", "metry", "metrów"])`) na 1, 2, 4, 5, 12, 14, 21, 22, 25, 112, 122.
- `spokenDistance` na metrach po zaokrągleniu do 10 m (wielokrotności 10 zawsze dają „metrów”): 10 → „10 metrów”, 480 → „480 metrów”, 494 → „490 metrów”. Na kilometrach: 1000 → „1 kilometr”, 1500 → „1,5 kilometra”, 2000 → „2 kilometry”, 5000 → „5 kilometrów”, 12 000 → „12 kilometrów”, 22 000 → „22 kilometry”.
- `distanceMark`: 2600 → 2500, 1000 → 1000, 999 → 900, 250 → 200, 199 → 150, 30 → 0.
- `nextDistanceAnnouncement`: `lastMark` 500 i odległość 495 (próg 400) → ogłasza; drganie 405 → 395 → 405 wokół progu 400 ogłasza raz; oddalenie o więcej niż krok przesuwa `lastMark` w górę bez ogłoszenia, a ponowne zbliżenie znów ogłasza; próg 0 nigdy nie jest ogłaszany.
- `pickPolishVoice`: lokalny `pl-PL` wygrywa z sieciowym, `pl_PL` jest rozpoznany, brak polskiego → `null`.
- `phraseFor`: wejście w każdy wariant zwraca niepusty tekst (z nazwą celu tam, gdzie jest cel); przejście `guiding` żywy → nieżywy zwraca komunikat o utracie sygnału.

#### 3. Ustawienie głosu

**File**: `src/lib/services/voice-settings.ts` (nowy), `src/lib/services/voice-settings.test.ts` (nowy)

**Intent**: Zapamiętać „głos wł./wył.” na urządzeniu, poza planem gospodarstwa, z tym samym poziomem odporności co `plan-storage`.

**Contract**: Klucz `"wrw.voice"`, kształt `{ enabled: boolean }`. Eksportuje `parseVoiceSettings(value: unknown): { enabled: boolean }` (wszystko poza poprawnym `enabled: false` daje `enabled: true` — domyślnie włączony, FR-015), `readVoiceSettings()` (synchronicznie, nigdy nie rzuca) i `writeVoiceSettings(settings)` (w `try/catch`, jak `writePlan`). Test na `parseVoiceSettings`: `null`, śmieci, `{ enabled: "no" }` → włączony; `{ enabled: false }` → wyłączony.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build przechodzi: `npm run build`

#### Manual Verification:

- Celowe zepsucie odmiany (np. zamiana gałęzi „metry”/„metrów”) wywala test

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testu ręcznego, zanim przejdziesz do fazy 2. Test ręczny da się wykonać z terminala.

---

## Phase 2: Usługa mowy i test głosu na `/czujniki`

### Overview

Cienka obsługa `speechSynthesis` i sekcja „Głos” na `/czujniki`. Ta faza rozstrzyga niewiadomą z roadmapy: czy polski głos działa offline na telefonach do demo — zanim zaczniemy integrację z `/alarm`.

### Changes Required:

#### 1. Usługa mowy

**File**: `src/lib/services/speech.ts` (nowy)

**Intent**: Ukryć różnice platform w jednym miejscu: ładowanie głosów, mówienie po polsku, przerywanie i wykrywanie blokady odtwarzania.

**Contract**:

- `speechSupported(): boolean` — `"speechSynthesis" in window`.
- `loadPolishVoice(): Promise<{ voice: SpeechSynthesisVoice; local: boolean } | null>` — bierze `getVoices()`; jeśli lista jest pusta, czeka na `voiceschanged`, maksymalnie ok. 2 s; wynik przez `pickPolishVoice`.
- `speak(text: string, voice: SpeechSynthesisVoice | null): Promise<"spoken" | "blocked" | "failed">` — `cancel()` poprzedniej wypowiedzi, utterance z `lang: "pl-PL"` i wybranym głosem; `"spoken"` po zdarzeniu `start`, `"blocked"` przy błędzie `not-allowed` albo braku `start` w 1500 ms, `"failed"` przy innym błędzie. Samo wywołanie `speechSynthesis.speak()` następuje synchronicznie wewnątrz `speak()`, zanim funkcja zrobi jakikolwiek `await` — warunek iOS dla wywołań z gestu.
- `stopSpeaking(): void` — `cancel()`.

Żadnego stanu Reacta tutaj — stan żyje w hookach i komponentach.

#### 2. Sekcja „Głos” na `/czujniki`

**File**: `src/components/SensorCheck.tsx`, ewentualnie wydzielony `src/components/VoiceCheck.tsx`

**Intent**: Pozwolić organizatorowi na spokojnie usłyszeć głos prowadzenia i dowiedzieć się, czy zadziała bez sieci — i co zrobić, jeśli nie.

**Contract**: Trzecia sekcja w tym samym stylu co „Lokalizacja” i „Kompas” (ikona `Volume2`, nagłówek „Głos”). Przycisk „Sprawdź głos” wywołuje `speak("Głos prowadzenia działa.", …)` bezpośrednio w obsłudze kliknięcia. Wyniki z tekstem i ikoną (`JEZYK_WIZUALNY.md` §13), rozszerzając `ResultBadge` o nowe warianty zamiast budować drugi komponent:

| Wynik | Warunek | Instrukcja pod spodem |
| --- | --- | --- |
| Działa offline | polski głos, `local: true`, `"spoken"` | „Sprawdź raz w trybie samolotowym — tylko to potwierdza działanie bez sieci.” |
| Tylko z siecią | polski głos, `local: false`, `"spoken"` | Jak pobrać polskie dane głosowe: Android — Ustawienia → System → Języki → Zamiana tekstu na mowę → silnik Google → zainstaluj dane głosowe „polski”; iOS — Ustawienia → Dostępność → Treść mówiona → Głosy → Polski. |
| Brak polskiego głosu | `loadPolishVoice()` → `null` albo `!speechSupported()` | Ta sama instrukcja pobrania; dla braku API: „Ta przeglądarka nie obsługuje głosu — prowadzenie będzie tylko na ekranie.” |
| Nie zadziałało | `"blocked"` / `"failed"` | „Głos się nie odezwał. Sprawdź, czy telefon nie jest wyciszony, i spróbuj ponownie.” |

Styl wyniku „Tylko z siecią” — rola attention (jak „Brak zgody”), „Brak polskiego głosu” — rola danger (jak „Niedostępny”). Ścieżki menu systemowego sprawdzić na telefonie testowym w tej fazie i poprawić tekst, jeśli się różnią.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke przechodzi: `npm run smoke`

#### Manual Verification:

- Na Androidzie „Sprawdź głos” mówi po polsku i pokazuje wynik; w trybie samolotowym głos nadal mówi (albo wynik i instrukcja prowadzą do pobrania danych głosowych, po którym mówi)
- Na iOS (jeśli dostępny) „Sprawdź głos” mówi po polsku w trybie samolotowym
- Wyciszenie lub brak polskiego głosu daje czytelny wynik z instrukcją, a nie pustą sekcję
- Ustalone na telefonie: czy `cancel()` tuż przed `speak()` połyka wypowiedź (wynik zapisany w Notes w `change.md`)

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów na realnym telefonie, zanim przejdziesz do fazy 3. Jeśli żaden telefon do demo nie ma polskiego głosu offline nawet po pobraniu danych, zatrzymaj się i wróć do decyzji o nagranych komunikatach.

---

## Phase 3: Głos na `/alarm`

### Overview

Podłączenie głosu do ekranu prowadzenia: hook decydujący, co i kiedy powiedzieć, przełącznik w stopce, przycisk „Włącz głos” przy blokadzie i tekstowa informacja o braku polskiego głosu. Realizuje FR-015.

### Changes Required:

#### 1. Hook prowadzenia głosem

**File**: `src/components/hooks/useVoiceGuidance.ts` (nowy)

**Intent**: Zamienić strumień stanów prowadzenia w rzadkie, sensowne komunikaty, z pełną kontrolą nad blokadą, ustawieniem i widocznością strony.

**Contract**: `useVoiceGuidance(state: GuidanceVoiceState)` zwraca `{ enabled, toggle, status, unlock }`, gdzie `status` to `"loading" | "ready" | "blocked" | "unavailable" | "off"`.

- Przy montowaniu czyta `readVoiceSettings()` i ładuje głos `loadPolishVoice()`; brak API lub polskiego głosu → `"unavailable"`.
- Gdy głos gotowy i włączony — wypowiada pełny komunikat wejścia (`phraseFor(state, null)`); wynik `"blocked"` ustawia `status: "blocked"`.
- Zmiana rodzaju stanu (wariant albo `live` w `guiding`) jest wypowiadana po 2 s stabilności (`phraseFor(state, previous)`).
- W `guiding` z `live: true` każda nowa odległość idzie przez `nextDistanceAnnouncement`; ogłoszenie → `spokenDistance`. `lastMark` ustawiany przy pierwszym komunikacie z odległością.
- `unlock()` i włączenie przez `toggle()` wywołują `speak()` synchronicznie w obsłudze kliknięcia z pełnym bieżącym stanem — to jest odblokowanie gestem.
- `toggle()` zapisuje `writeVoiceSettings`; wyłączenie natychmiast `stopSpeaking()`.
- Ukrycie strony → `stopSpeaking()` i cisza; powrót → jeden pełny komunikat bieżącego stanu. Odmontowanie → `stopSpeaking()`.

#### 2. Integracja z ekranem prowadzenia

**File**: `src/components/GuidanceScreen.tsx`

**Intent**: Przekazać hookowi stan, który ekran już liczy, i dodać minimalne elementy sterowania w stopce.

**Contract**:

- Z istniejących zmiennych (`point`, `arrived`, `guiding`, `isStale`, `locationProblem`, `distance`, `status`) budujemy `GuidanceVoiceState` — bez zmiany logiki samego ekranu. Przypadek `noPoint` też trafia do hooka (wczesny `return` ekranu trzeba uporządkować tak, żeby hook był wywołany zawsze — reguły hooków).
- Stopka: przełącznik jako `Button variant="secondary"` z ikoną `Volume2` / `VolumeX`, etykietą „Głos: włączony” / „Głos: wyłączony” i `aria-pressed`. Przy `status: "blocked"` nad stopką bursztynowy przycisk główny „Włącz głos” (kolor guidance, min. 44 × 44 px, `JEZYK_WIZUALNY.md` §5 i §15) wywołujący `unlock()`; znika po udanym starcie mowy. Przy `"unavailable"` w miejscu przełącznika tekst z ikoną: „Głos niedostępny na tym telefonie — prowadzenie tylko na ekranie”.
- Bez czerwieni: żaden z tych elementów nie jest akcją awaryjną.
- Kolory przez tokeny Tailwind (`text-guidance`, `bg-background`…), bez wartości hex w komponencie (konwencja w `CLAUDE.md`).

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke przechodzi: `npm run smoke`

#### Manual Verification:

- Na telefonie w trybie samolotowym po przytrzymaniu alarmu głos wypowiada cel i odległość albo widać „Włącz głos”, a jedno dotknięcie uruchamia komunikat
- Cel i instrukcja nadal widoczne w mniej niż 2 s od zwolnienia alarmu (głos nie opóźnia pierwszego renderu)
- W marszu do celu głos podaje odległość na progach, bez powtórek przy staniu w miejscu
- Poniżej 25 m głos mówi „Jesteś na miejscu” jeden raz
- Przełącznik ucisza głos natychmiast, a po zamknięciu i ponownym otwarciu `/alarm` głos pozostaje wyłączony; ponowne włączenie od razu czyta stan
- Wyjście z `/alarm` w trakcie wypowiedzi przerywa głos
- Na telefonie bez polskiego głosu widać tekst „Głos niedostępny…”, a prowadzenie działa normalnie

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów w terenie, zanim przejdziesz do fazy 4.

---

## Phase 4: Weryfikacja offline i domknięcie dokumentów

### Overview

Potwierdzenie całej ścieżki pod publicznym adresem w trybie samolotowym i zapisanie decyzji oraz ograniczeń w dokumentach.

### Changes Required:

#### 1. Konwencje dla agenta

**File**: `CLAUDE.md`

**Intent**: Nowy klucz localStorage i nowy punkt wpięcia muszą być w pliku czytanym na starcie, szczególnie że S-02 równolegle będzie dodawał kroki.

**Contract**: W Key conventions: ustawienie głosu żyje pod `wrw.voice` (`@/lib/services/voice-settings`), poza `HouseholdPlan`; nowe komunikaty prowadzenia dodaje się jako wariant `GuidanceVoiceState` z tekstem w `phraseFor` (`@/lib/voice`), a nie przez bezpośrednie wywołania `speechSynthesis`.

#### 2. Roadmapa

**File**: `context/foundation/roadmap.md`

**Intent**: Oznaczyć slice jako zrobiony i zamknąć jego niewiadomą.

**Contract**: `S-03` → `done` w „At a glance” i w sekcji slice'u; Unknown o polskim głosie offline z dopiskiem, co wyszło na telefonach demo (z fazy 2); wiersz w „Backlog Handoff”.

#### 3. PRD

**File**: `context/foundation/prd.md`

**Intent**: Zapisać znane ograniczenia głosu, żeby nie wróciły jako błędy na scenie.

**Contract**: Przy FR-015 albo w Open Questions/rozstrzygnięciach: głos wymaga polskiego głosu offline na urządzeniu (sprawdzanego na `/czujniki`); po wejściu w alarm przeglądarka może wymagać jednego dotknięcia „Włącz głos”; głos milknie przy zablokowanym ekranie; komunikaty kierunku świadomie pominięte. Bez nowych FR.

### Success Criteria:

#### Automated Verification:

- Pełne CI przechodzi na branchu: lint, `npx astro check`, `npm test`, build, smoke
- Smoke przeciwko wdrożonemu adresowi przechodzi: `BASE_URL=https://w-razie-w.jzogala.workers.dev EXPECT_HEADERS=1 npm run smoke`

#### Manual Verification:

- Na telefonie: otwarcie online raz, `/czujniki` → „Sprawdź głos”, tryb samolotowy, przytrzymanie alarmu, dojście do punktu z głosem — całość bez sieci
- `roadmap.md` ma `S-03` jako `done`, a PRD opisuje ograniczenia głosu

**Implementation Note**: Ostatnia faza — po jej zaliczeniu slice jest gotowy do zamknięcia i archiwizacji.

---

## Testing Strategy

### Unit Tests:

- `spokenDistance` i funkcja odmiany: 1, 2, 4, 5, 12, 14, 21, 22, 25, 112, 122; metry po zaokrągleniu; kilometry pełne i ułamkowe
- `distanceMark`: granice pasm 1000 i 200 m, próg 0 poniżej 50 m
- `nextDistanceAnnouncement`: zejście przez próg, drganie wokół progu, oddalenie i ponowne zbliżenie, brak ogłoszenia progu 0
- `pickPolishVoice`: lokalny przed sieciowym, `pl_PL`, brak polskiego
- `phraseFor`: wejście w każdy wariant, utrata i odzyskanie sygnału, dojście
- `parseVoiceSettings`: domyślnie włączony, tylko `enabled: false` wyłącza

### Integration Tests:

Brak — w repo nie ma frameworka do testów integracyjnych ani mocków API przeglądarki i świadomie ich nie dodajemy. `npm run smoke` pilnuje, że `/alarm` i `/czujniki` są w buildzie i w precache (bez zmian w skrypcie — nie dochodzą nowe strony).

### Manual Testing Steps:

1. Telefon z siecią: otwórz publiczny adres, zaczekaj na „Gotowe do pracy offline”.
2. `/czujniki` → „Sprawdź głos”; zanotuj wynik. Włącz tryb samolotowy i sprawdź ponownie. Przy „Tylko z siecią” pobierz polskie dane głosowe według instrukcji i powtórz.
3. W trybie samolotowym przytrzymaj alarm. Usłysz cel i odległość albo dotknij „Włącz głos”. Zmierz stoperem, że cel jest na ekranie w < 2 s.
4. Idź w stronę punktu z odległości > 500 m: komunikaty na progach, bez powtórek przy postoju.
5. Zakryj telefon / wejdź do bramy, żeby stracić fix na > 20 s: jeden komunikat o utracie sygnału; po wyjściu — o odzyskaniu.
6. Poniżej 25 m: jedno „Jesteś na miejscu”.
7. Wyłącz głos przełącznikiem, wyjdź i wejdź ponownie w alarm: cisza i etykieta „Głos: wyłączony”. Włącz: od razu komunikat.
8. Zablokuj ekran i odblokuj: po powrocie jeden pełny komunikat stanu.

## Performance Considerations

Głos nie może opóźnić pierwszego renderu `/alarm` (NFR 2 s): ładowanie głosów i pierwszy `speak()` startują w `useEffect`, po synchronicznym renderze celu z planu, tak jak czujniki w S-01. Synteza mowy działa lokalnie i nie generuje ruchu sieciowego. Brak nowych zasobów do precache.

## Migration Notes

Brak — `wrw.voice` to nowy, niezależny klucz z bezpiecznym domyślnym „włączony”. `HouseholdPlan` i jego `schemaVersion` bez zmian.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-03)
- Wymagania: `context/foundation/prd.md` (US-01, FR-015, NFR)
- Poprzedni slice: `context/archive/2026-10-03-guided-to-point-offline/plan.md`
- Ekran prowadzenia: `src/components/GuidanceScreen.tsx`
- Wzorzec sekcji czujnika: `src/components/SensorCheck.tsx`
- Wzorzec odpornego zapisu i testu parsera: `src/lib/services/plan-storage.ts`, `src/lib/services/plan-storage.test.ts`
- Przejście alarmu do nowego dokumentu: `src/components/AlarmButton.tsx`
- Język wizualny: `JEZYK_WIZUALNY.md` §5, §13, §15

## Progress

> Konwencja: `- [ ]` do zrobienia, `- [x]` zrobione. Po zakończeniu kroku dopisz ` — <commit sha>`. Nie zmieniaj tytułów kroków. Patrz `references/progress-format.md`.

### Phase 1: Logika głosu i ustawienie

#### Automated

- [x] 1.1 Testy przechodzą: `npm test` — c6856cd
- [x] 1.2 Lint przechodzi: `npm run lint` — c6856cd
- [x] 1.3 Typy przechodzą: `npx astro check` — c6856cd
- [x] 1.4 Build przechodzi: `npm run build` — c6856cd

#### Manual

- [x] 1.5 Celowe zepsucie odmiany wywala test — c6856cd

### Phase 2: Usługa mowy i test głosu na `/czujniki`

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint`
- [x] 2.2 Typy przechodzą: `npx astro check`
- [x] 2.3 Testy przechodzą: `npm test`
- [x] 2.4 Build przechodzi: `npm run build`
- [x] 2.5 Smoke przechodzi: `npm run smoke`

#### Manual

- [ ] 2.6 Na Androidzie głos mówi po polsku, także w trybie samolotowym
- [ ] 2.7 Na iOS głos mówi po polsku w trybie samolotowym
- [ ] 2.8 Wyciszenie lub brak polskiego głosu daje czytelny wynik z instrukcją
- [ ] 2.9 Ustalone, czy `cancel()` przed `speak()` połyka wypowiedź

### Phase 3: Głos na `/alarm`

#### Automated

- [ ] 3.1 Lint przechodzi: `npm run lint`
- [ ] 3.2 Typy przechodzą: `npx astro check`
- [ ] 3.3 Testy przechodzą: `npm test`
- [ ] 3.4 Build przechodzi: `npm run build`
- [ ] 3.5 Smoke przechodzi: `npm run smoke`

#### Manual

- [ ] 3.6 Po alarmie głos mówi albo „Włącz głos” uruchamia go jednym dotknięciem
- [ ] 3.7 Cel i instrukcja widoczne w < 2 s od zwolnienia alarmu
- [ ] 3.8 Odległość na progach, bez powtórek przy postoju
- [ ] 3.9 „Jesteś na miejscu” wypowiedziane jeden raz
- [ ] 3.10 Przełącznik ucisza natychmiast, wybór przeżywa ponowne otwarcie
- [ ] 3.11 Wyjście z `/alarm` przerywa głos
- [ ] 3.12 Bez polskiego głosu widać tekst „Głos niedostępny…”

### Phase 4: Weryfikacja offline i domknięcie dokumentów

#### Automated

- [ ] 4.1 Pełne CI przechodzi na branchu (lint, check, test, build, smoke)
- [ ] 4.2 Smoke przeciwko wdrożonemu adresowi przechodzi z `EXPECT_HEADERS=1`

#### Manual

- [ ] 4.3 Cała ścieżka z głosem przechodzi na telefonie w trybie samolotowym
- [ ] 4.4 `roadmap.md` ma `S-03` jako `done`, a PRD opisuje ograniczenia głosu
