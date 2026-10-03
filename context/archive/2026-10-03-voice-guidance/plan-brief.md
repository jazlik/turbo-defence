# Głos prowadzący po polsku (S-03) — brief planu

> Pełny plan: `context/changes/voice-guidance/plan.md`

## What & Why

W kryzysie użytkownik idzie za strzałką i nie powinien musieć ciągle patrzeć w ekran. Dodajemy do `/alarm` polski głos, który czyta prowadzenie — domyślnie włączony, z możliwością wyłączenia (US-01, FR-015) — i działa w trybie samolotowym. Roadmapa wskazuje tu jedną niewiadomą: czy polski głos w ogóle działa offline na telefonach do demo.

## Starting Point

Po S-01 `/alarm` (`src/components/GuidanceScreen.tsx`) prowadzi do punktu strzałką z odległością w czterech stanach, ale jest całkowicie niemy. `/alarm` to osobny dokument ładowany po przytrzymaniu alarmu, więc gest użytkownika nie przechodzi na ekran prowadzenia — a przeglądarki bez gestu blokują mowę. W kodzie nie ma żadnego użycia `speechSynthesis`.

## Desired End State

Na `/czujniki` organizator słyszy zdanie testowe i dowiaduje się, czy głos działa offline, a jeśli nie — jak pobrać polskie dane głosowe. Po alarmie w trybie samolotowym głos wypowiada cel i odległość (albo jedno dotknięcie „Włącz głos” go uruchamia), podaje odległość na progach w marszu, informuje o utracie i odzyskaniu GPS i mówi „Jesteś na miejscu”. Przełącznik w stopce ucisza głos, a wybór zostaje na telefonie.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego |
| --- | --- | --- |
| Co mówi głos | Zmiany stanu + odległość | Można iść bez patrzenia na ekran; komunikaty kierunku odrzucone, bo drgający kompas dałby fałszywe „skręć” |
| Rytm odległości | Progi adaptacyjne: co 500 m powyżej 1 km, co 100 m do 200 m, potem co 50 m; tylko w dół | Rzadko daleko, często blisko celu; skoki GPS nie generują powtórek |
| Blokada mowy na `/alarm` | Wykrycie + bursztynowy przycisk „Włącz głos” | Jawne, działa na iOS i Androidzie; przebudowa przejścia alarmu zagroziłaby NFR 2 s |
| Brak polskiego głosu offline | Wykryj na `/czujniki` i poinstruuj; na `/alarm` tekst „Głos niedostępny” | Tanie i uczciwe; nagrania nie omijają blokady odtwarzania i zjadają czas |
| Przełącznik | W stopce `/alarm`, zapamiętany pod `wrw.voice` | Wyłączenie raz działa zawsze; preferencja telefonu nie wędruje z planem do domowników (S-09) |
| Test w przygotowaniach | Sekcja „Głos” na `/czujniki` | Ten sam wzorzec co GPS i kompas, problem wychodzi przed kryzysem |
| „Powtórz” | Brak | Stopka Execution Mode zostaje minimalna (`JEZYK_WIZUALNY.md` §5) |
| Punkt wpięcia S-02 | Stan prowadzenia jako unia `GuidanceVoiceState` | Kroki S-02 dochodzą jako nowy wariant z tekstem, bez zmian w usłudze mowy |
| Testy | Vitest dla odmiany, progów, tekstów, wyboru głosu, parsera ustawienia | Błędy w odmianie i progach słychać dopiero w terenie |

## Scope

**In scope:**

- `src/lib/voice.ts` + testy (odmiana, progi, teksty, wybór głosu), `src/lib/services/voice-settings.ts` + test
- `src/lib/services/speech.ts` — ładowanie głosów, mówienie, wykrywanie blokady
- Sekcja „Głos” na `/czujniki` z wynikami i instrukcją
- `useVoiceGuidance` i integracja z `GuidanceScreen`: przełącznik, „Włącz głos”, informacja o braku głosu
- `CLAUDE.md`, roadmapa (S-03 → done), ograniczenia w PRD

**Out of scope:** komunikaty kierunku, nagrane audio, przejście alarmu bez przeładowania, przycisk „Powtórz”, ustawienie głosu w Preparation Mode, mówienie przy zablokowanym ekranie, komunikat przy oddalaniu się, sekwencja kroków (S-02), wybór głosu i tempa, testy komponentów.

## Architecture / Approach

Trzy warstwy: czysta logika w `src/lib/voice.ts` (co powiedzieć), usługa `src/lib/services/speech.ts` (jak to powiedzieć na danej platformie) i hook `useVoiceGuidance` (kiedy mówić). `GuidanceScreen` buduje `GuidanceVoiceState` z wartości, które już liczy, i przekazuje go do hooka. Zmiany stanu są wypowiadane dopiero po 2 s stabilności, odległość tylko z żywego fixu, każdy komunikat przerywa poprzedni, a schowanie strony wycisza głos. Odblokowanie zawsze przez `speak()` wywołane synchronicznie w kliknięciu, jak zgoda na kompas w S-01.

## Phases at a Glance

| Faza | Co dowozi | Główne ryzyko |
| --- | --- | --- |
| 1. Logika głosu i ustawienie | Odmiana, progi, teksty, wybór głosu, `wrw.voice` — z testami | Brak — czyste funkcje |
| 2. Usługa mowy i test na `/czujniki` | Mowa po polsku i diagnoza offline na telefonie | Brak polskiego głosu offline na telefonach demo — wtedy stop i powrót do nagrań |
| 3. Głos na `/alarm` | Komunikaty, przełącznik, „Włącz głos” | Zachowanie blokady i `cancel()` różne na iOS i Androidzie |
| 4. Weryfikacja i dokumenty | Ścieżka w trybie samolotowym, roadmapa, PRD, `CLAUDE.md` | Brak — faza porządkowa |

**Prerequisites:** S-01 (done, w `main`); telefon z Androidem (i iOS, jeśli dostępny) do testów w terenie.
**Estimated effort:** ~1 sesja, 4 fazy; fazy 2 i 3 wymagają telefonu, faza 3 wyjścia w teren.

## Open Risks & Assumptions

- **Polski głos offline może nie być dostępny** na telefonach demo. `voice.localService` na Androidzie bywa niewiarygodne, więc rozstrzyga dopiero test w trybie samolotowym w fazie 2.
- **Wykrycie blokady przez brak `start` w 1500 ms to heurystyka.** Wolny syntezator przy pierwszym uruchomieniu może dać fałszywe „zablokowane”. Skutek jest niegroźny: zbędny przycisk „Włącz głos”.
- **Głos milknie przy zablokowanym ekranie.** `useScreenWakeLock` trzyma ekran włączony, ale ręczne zablokowanie telefonu ucisza prowadzenie — ograniczenie opisane w PRD.
- **S-02 idzie równolegle** i dotyka tego samego `GuidanceScreen.tsx`. Prawdopodobne konflikty przy scalaniu; unia `GuidanceVoiceState` ma je ograniczyć do jednego miejsca.

## Success Criteria (Summary)

- W trybie samolotowym po alarmie użytkownik słyszy po polsku cel, odległość na progach i „Jesteś na miejscu”, a pierwszy krok jest na ekranie w < 2 s.
- Przełącznik ucisza głos natychmiast i na stałe na tym telefonie.
- Telefon bez polskiego głosu offline dowiaduje się o tym na `/czujniki`, przed kryzysem, z instrukcją naprawy.
