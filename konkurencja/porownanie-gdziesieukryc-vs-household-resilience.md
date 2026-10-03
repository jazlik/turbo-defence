# GdzieSięUkryć.pl vs Household Resilience App — porównanie

> Stan wiedzy: 3 października 2026.
> Dane o GdzieSięUkryć.pl pochodzą z komunikatów PSP/MSWiA i artykułów prasowych (źródła na końcu).

> **Uwaga o zakresie.** Kolumna „Household Resilience App” opisuje wizję produktu
> (`PROJECT.md`), nie zakres MVP na hackathon. Rozjazdy: **wibracje** są jawnie wycięte
> z Execution Mode (decyzja zespołu), **ćwiczenia** to FR-017 (nice-to-have),
> **przypomnienia** nie istnieją w MVP, a **gamifikacja** ogranicza się do jakościowego
> poziomu gotowości (FR-009) — bez punktów i streaków. Aktualny zakres:
> `context/foundation/prd.md`, sekcje Functional Requirements i Non-Goals.

## W skrócie

Te dwa rozwiązania raczej się **uzupełniają**, niż konkurują.

- **GdzieSięUkryć.pl** odpowiada na pytanie: *„gdzie mogę się schronić tu i teraz?”* — to warstwa **infrastruktury**.
- **Household Resilience App** odpowiada na pytanie: *„co robi moja rodzina, kiedy jesteśmy rozdzieleni i nie możemy się dodzwonić?”* — to warstwa **planu i koordynacji**.

---

## Porównanie

| Wymiar | GdzieSięUkryć.pl | Household Resilience App |
|---|---|---|
| Problem | Brak wiedzy, gdzie jest najbliższe schronienie | Brak przełożenia wiedzy na konkretny plan rodziny |
| Odbiorca | Pojedyncza osoba, każdy obywatel | Gospodarstwo domowe jako grupa |
| Moment użycia | Głównie w chwili zagrożenia | Przed kryzysem (plan, ćwiczenia) i w trakcie (Execution Mode) |
| Dane | Publiczne, wprowadzane przez organy ochrony ludności, weryfikowane przez PSP | Prywatne, tworzone przez rodzinę |
| Personalizacja | Brak, wszyscy widzą to samo | Rdzeń produktu: role, miejsca spotkań, luki |
| Offline | Tak, po pobraniu danych gminy | Tak, offline-first z założenia |
| Tryb kryzysowy | Prosty przepływ: znajdź → mapa → prowadzenie | Krok po kroku, duże komunikaty, głos, wibracje |
| Przygotowanie / nawyk | Brak (narzędzie „na żądanie”) | Ćwiczenia, luki, przypomnienia, gamifikacja |
| Koszt | Za darmo, rządowe | Do ustalenia |

---

## Gdzie się nakładają

- Oba rozwiązania stawiają na **działanie offline**.
- Oba **upraszczają interfejs** pod stres.
- Oba **prowadzą do konkretnego miejsca**. Różnica: u Ciebie to punkt spotkania rodziny,
  w GdzieSięUkryć.pl — publiczny punkt schronienia.

---

## Co z tego wynika dla Twojego pomysłu

1. **Rozszerzenie „Official shelter integration” ma już gotowego kandydata.**
   Nie musisz budować mapy, bo państwo ją buduje i rozwija. Zanim to zaplanujesz, sprawdź jednak,
   czy GdzieSięUkryć.pl udostępnia API albo otwarte dane — tego nie wiem.
   Najprostsza wersja bez integracji: użytkownik wybiera w planie punkt schronienia przy domu,
   szkole dziecka i pracy, a aplikacja przechowuje go lokalnie razem z planem.

2. **Słabości GdzieSięUkryć.pl mogą być Twoimi funkcjami.**
   Przy premierze karta punktu nie mówiła, czym jest obiekt, i nie podawała jego pojemności,
   a nawigacja przekierowywała do Map Google. Rodzina mogłaby dopisać do swojego punktu prywatną
   notatkę lub zdjęcie wejścia i opis dojścia. Tego mapa państwowa nie zrobi, a w stresie
   to właśnie się przydaje.

3. **„Personalized preparedness gaps” zyskują konkretny punkt kontrolny**, np.:
   - „brak wybranego punktu schronienia przy szkole dziecka”,
   - „nie pobrano danych offline dla gminy, w której pracujesz”.

4. **Execution Mode może łączyć oba światy**, np.:
   *„idź do punktu spotkania X; jeśli alarm lotniczy — najbliższy punkt schronienia to Y”*.
   GdzieSięUkryć.pl tej decyzji za użytkownika nie podejmuje.

---

## Ryzyka do obserwowania

- **Darmowe narzędzie państwowe ustawia oczekiwanie ceny na zero** w kategorii „bezpieczeństwo”.
  Model B2C będzie trudniejszy do obrony niż sama wartość produktu.
- **Dystrybucja państwa jest ogromna.** Integracja GdzieSięUkryć.pl z mObywatelem jest zapowiadana,
  choć bez daty. Twoja przewaga musi więc leżeć w warstwie rodzinnej i nawykowej, której aplikacja
  mapowa z natury nie pokrywa — nie w „szukaniu schronienia”.
- **Zależność od jakości cudzych danych.** Media wytykały nierówne pokrycie kraju. Jeśli oprzesz się
  na tej bazie, w części miejscowości użytkownik zobaczy pusty ekran.

---

## Otwarte pytania

- Czy GdzieSięUkryć.pl ma publiczne API lub udostępnia dane w formie otwartej?
- Czy i kiedy usługa trafi do mObywatela — i czy pojawią się tam funkcje wykraczające poza mapę?

---

## Źródła

- KP PSP Sanok (gov.pl), 01.01.2026 —
  https://www.gov.pl/web/kppsp-sanok/gdzie-sie-ukryc--praktyczne-narzedzie-zwiekszajace-bezpieczenstwo-obywateli
- Spider's Web, 22.12.2025 — https://spidersweb.pl/2025/12/rzadowa-mapa-miala-pokazywac-schrony-dziala-fatalnie.html
- Spider's Web, 10.06.2026 — https://spidersweb.pl/2026/06/gdzie-sie-ukryc-2026.html
