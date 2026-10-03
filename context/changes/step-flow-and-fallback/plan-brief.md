# Kroki ewakuacji i przełączenie na miejsce zapasowe (S-02) — brief planu

> Pełny plan: `context/changes/step-flow-and-fallback/plan.md`

## What & Why

Prowadzenie z S-01 zna jeden cel i jeden ekran. S-02 zamienia je w sekwencję kroków wyliczaną z planu gospodarstwa (plecak → miejsce spotkania → punkt ewakuacji), gdzie każdy ekran pokazuje dokładnie jeden następny krok, a na kroku miejsca spotkania pojawia się jedno wyjście awaryjne „niedostępne”, przełączające cel na miejsce zapasowe. Dwa kryteria akceptacji US-01 — „każdy ekran pokazuje dokładnie jeden następny krok” i „przycisk »niedostępne« przełącza prowadzenie na miejsce zapasowe” — dziś nie przechodzą, więc bez tego slice'u demo nie domyka FR-013 na scenie.

## Starting Point

Po S-01 działa cała trudna warstwa: GPS, kompas z fallbackiem na azymut z marszu, wake lock, strzałka, odległość haversine, progi dojścia i nieaktualnego fixu, przycisk alarmu z przytrzymaniem — wszystko przetestowane w terenie. Czego nie ma: plan (`src/types.ts`, `schemaVersion: 1`) trzyma **jedno** miejsce (`evacuationPoint`), a FR-004 wymaga trzech; nie istnieje pojęcie kroku ani żaden stan przebiegu ewakuacji. Automat przytrzymania jest zamknięty w `AlarmButton` i zahardkodowany na przejście do `/alarm`.

## Desired End State

Organizator ustawia trzy miejsca w sekcji „Miejsca” na stronie domowej. W trybie samolotowym przytrzymuje alarm i dostaje pierwszy krok z jedną akcją, potem prowadzenie strzałką do miejsca spotkania. Przytrzymanie „Punkt niedostępny” przez 2 s natychmiast przestawia cel, strzałkę i odległość na miejsce zapasowe. Po dojściu poniżej 25 m widzi „Jesteś na miejscu” i „Dalej: Idź do punktu ewakuacji”; gdy GPS nie potwierdza dojścia, przechodzi dalej przytrzymaniem i potwierdzeniem. Ostatni krok kończy „Zakończ tryb alarmu”, które czyści przebieg. Ubicie aplikacji w marszu wraca na ten sam krok; przebieg starszy niż 6 godzin startuje od początku.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Model kroku | `navigate` (cel z planu) albo `action` (czynność), sekwencja wyliczana czystą funkcją `buildSteps` | Pole `instruction` to gotowy kontrakt dla głosu w S-03, a typ kroku nie wymaga drugiej migracji dla plecaka w S-06 | Plan |
| Zakres wyjścia awaryjnego | Tylko krok miejsca spotkania; sekwencja biegnie dalej do punktu ewakuacji | Najbliżej litery zarzutu sokratejskiego z FR-013 („sztywna sekwencja nie pasuje, gdy miejsce spotkania jest niedostępne”) i najmniej stanów brzegowych | Plan |
| Przejście między krokami | Potwierdzenie po dojściu (< 25 m, żywy fix), jedna akcja guidance | Miejsce spotkania wymaga czekania na domowników — automat wyprowadziłby użytkownika z punktu zbiórki | Plan |
| Wyjście bez potwierdzenia GPS | Przytrzymanie 2 s + osobne dotknięcie potwierdzenia | Utrata sygnału (klatka schodowa, wejście do schronu) nie może zablokować sekwencji, ale ominięcie kroku ma być trudne do zrobienia przypadkiem | Plan |
| Ochrona „niedostępne” | Przytrzymanie 2 s, bez cofania | Ten sam wyuczony gest co alarm; przełączenie celu w kryzysie nie zdarza się przypadkiem | Plan |
| Stan przebiegu | Osobny klucz `wrw.run`, wznowienie tylko gdy świeższy niż 6 h | Restart telefonu w marszu nie cofa prowadzenia, a przebieg z poprzedniego dnia nie wita nikogo przy drugim podejściu na scenie | Plan |
| Wskazanie kroku w przebiegu | Identyfikator kroku, nie indeks | Po dodaniu miejsca spotkania między przebiegami indeks wskazywałby inny krok; nieznany identyfikator po prostu startuje od początku | Plan |
| Braki danych | Krok bez celu pomijany, przycisk awaryjny ukryty gdy brak miejsca zapasowego | Ekran prowadzenia nigdy nie pokazuje kroku bez celu ani martwego przycisku — „minimum decyzji w kryzysie” | Plan |
| Koniec sekwencji | Istniejący stan „Jesteś na miejscu” + „Zakończ tryb alarmu” czyszczące przebieg | Ponowne użycie stanu sprawdzonego w S-01; wyczyszczenie przebiegu gwarantuje, że kolejny alarm startuje od kroku 1 | Plan |
| UI trzech miejsc | Sekcja „Miejsca” na stronie domowej, `PlaceCard` ×3 | Zero nowych stron i zmian w precache SW; pełne ponowne użycie logiki „Ustaw tutaj” i parsowania współrzędnych | Plan |
| Automat przytrzymania | Wydzielony do hooka `useHoldAction` + `HoldButton` | S-02 dodaje dwa przyciski przytrzymania; trzy kopie automatu zdarzeń wskaźnika to trzy miejsca na ten sam błąd | Plan |
| Migracja planu | `schemaVersion: 1 → 2`, `evacuationPoint → places.shelter` | Konwencja z `CLAUDE.md`; użytkownik po S-01 nie traci jedynego wprowadzonego miejsca | Plan |

## Scope

**In scope:**

- `places` (`meeting` / `backup` / `shelter`) w planie + pierwsza migracja schematu, z testami
- `buildSteps`, `resumeIndex`, `targetPlaceKind` w `src/lib/evacuation-steps.ts` + zapis przebiegu w `src/lib/services/run-storage.ts`, z testami
- `PlaceCard` (uogólniony `EvacuationPointCard`) i sekcja „Miejsca” na stronie domowej + asercja w smoke
- Hook `useHoldAction` wydzielony z `AlarmButton` i `HoldButton` dla Execution Mode
- Automat kroków w `GuidanceScreen`: krok akcji, prowadzenie, dojście, „niedostępne”, potwierdzenie dojścia, ekran końcowy
- Zamknięcie S-02 w roadmapie, decyzje w PRD, konwencje w `CLAUDE.md`

**Out of scope:** głos czytający kroki (S-03), mapa i trasa (S-04), domownicy i treść checklisty plecaka (S-05/S-06), onboarding (S-07), ekran gotowości i quick winy (S-08), udostępnianie planu (S-09), edytowalna lista kroków, ekran podsumowania przebiegu, cofanie kroku i powrót z miejsca zapasowego, nowe tokeny, nowe strony, zmiany w service workerze, wibracje, testy komponentów.

## Architecture / Approach

Od środka na zewnątrz, tak jak w S-01: czysta logika z testami → UI przygotowań, które ją zapełnia → ekran, który ją konsumuje.

Sekwencja kroków jest **wyliczana z planu przy każdym wejściu w tryb alarmu**, nie przechowywana. Przechowywany jest wyłącznie przebieg (identyfikator bieżącego kroku + flaga aktywnego fallbacku) w osobnym kluczu `wrw.run`. Rozdzielenie ma dwa konkretne skutki: plan nie puchnie o stan chwilowy, a przebieg czyści się jednym `removeItem`, nie dotykając planu. `GuidanceScreen` przestaje być ekranem jednego celu i staje się ekranem jednego **kroku**: rozwiązuje cel bieżącego kroku z planu i oddaje go niezmienionej warstwie czujników z S-01 — cała matematyka geo, obsługa fixu żywego i nieaktualnego, wake lock oraz kompas zostają bez zmian.

## Phases at a Glance

| Faza | Co dowozi | Główne ryzyko |
| --- | --- | --- |
| 1. Fundament: miejsca, kroki, przebieg | Trzy miejsca + migracja v1→v2, `buildSteps`, zapis przebiegu, testy | Migracja musi zachować punkt z S-01; zmiana nazw dotyka dwóch komponentów, build musi zostać zielony |
| 2. Przygotowanie: sekcja „Miejsca” | `PlaceCard` ×3 na stronie domowej, asercja w smoke | Trzy wyspy zapisują jeden klucz — bez `readPlan()` przed każdym zapisem nadpiszą się wzajemnie; strona domowa traci jedną dominującą akcję |
| 3. Prowadzenie: kroki i fallback | Automat kroków, „niedostępne”, potwierdzenie dojścia, ekran końcowy | Wydzielenie automatu przytrzymania rusza kod zweryfikowany w terenie; zapis przebiegu nie może opóźnić pierwszego kroku poza 2 s |
| 4. Weryfikacja i dokumenty | Test w terenie, roadmapa, PRD, `CLAUDE.md` | Brak — faza porządkowa, ale wymaga wyjścia z telefonem |

**Prerequisites:** S-01 (done, wdrożone pod `https://w-razie-w.jzogala.workers.dev`); telefon z Androidem lub iOS; trzy punkty w terenie kilkaset metrów od siebie, żeby przejść sekwencję i fallback; sekrety Cloudflare już w repozytorium.
**Estimated effort:** ~1 sesja, 4 fazy; fazy 2–4 wymagają wyjścia na zewnątrz z telefonem.

## Open Risks & Assumptions

- **Próg świeżości 6 h jest założeniem, nie faktem.** Dobrany tak, żeby przebieg przeżył realny marsz, a nie przeżył nocy przed demem. Do weryfikacji pierwszym testem w terenie; zmiana to jedna stała.
- **Dwa różne poziomy ochrony dwóch akcji w tej samej stopce.** „Niedostępne” to przytrzymanie, „Potwierdź dojście” to przytrzymanie **i** potwierdzenie — decyzja zespołu, uzasadniona tym, że drugie kłamie systemowi o pozycji. Ryzyko: pod presją różnica może być nieczytelna.
- **Przełączenie na miejsce zapasowe jest jednokierunkowe w ramach przebiegu.** Wyjście z trybu alarmu nie czyści przebiegu (bo to warunek wznawiania), więc reset daje tylko „Zakończ tryb alarmu” albo upływ 6 h. Pomyłka jest chroniona gestem przytrzymania, ale nieodwracalna.
- **Wydzielenie automatu przytrzymania rusza jedyny komponent przetestowany w terenie w S-01.** Mitygacja: `AlarmButton` zachowuje niezmieniony DOM, klasy i etykiety — przenosimy wyłącznie logikę czasu; kryterium 3.17 sprawdza brak regresji.
- **Trzy formularze miejsc zagęszczają stronę domową.** Mitygacja: wariant przycisku `primary` tylko na pierwszym miejscu (§3 `JEZYK_WIZUALNY.md`). Jeśli po teście ekran nadal jest zbyt gęsty, naturalnym następnym krokiem jest osobna strona `/miejsca`, którą i tak przewiduje S-07.
- **Gest przytrzymania pozostaje słabo dostępny dla czytników ekranu** (F9 z impl-review S-01). S-02 powtarza podpowiedź `sr-only`, ale dodaje dwa kolejne takie przyciski — dostępna alternatywa bez przytrzymania zostaje decyzją produktową na później.

## Success Criteria (Summary)

- Telefon w trybie samolotowym: każdy ekran prowadzenia pokazuje dokładnie jeden następny krok, a pierwszy krok nadal pojawia się w mniej niż 2 s od zwolnienia alarmu.
- Przytrzymanie „Punkt niedostępny” na kroku miejsca spotkania przestawia cel, strzałkę i odległość na miejsce zapasowe, po czym sekwencja prowadzi do punktu ewakuacji.
- Przebieg przeżywa ubicie aplikacji w marszu, a „Zakończ tryb alarmu” zeruje go tak, że kolejne podejście startuje od kroku pierwszego.
