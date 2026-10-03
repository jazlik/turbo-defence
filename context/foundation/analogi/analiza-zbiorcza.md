# Analiza zbiorcza analogów

Zbiorczy opis 8 rozwiązań podobnych do Household Resilience App (po selekcji z 15, patrz „Usunięte z listy”): core funkcjonalność, mocne strony, braki i oceny. Bez screenów (screeny: `README.md`, wizualia: `jezyk-wizualny.md`).

## Status danych

- Opisy pochodzą z wyników wyszukiwania (sklepy z aplikacjami, media, strony gov.pl). **Nie instalowano aplikacji.**
- **Popularność jest szacunkiem.** Nie sprawdzano liczby pobrań ani ocen.
- ⚠ = opis słabo potwierdzony: RSO (część opisu z wiedzy własnej).

## Metoda oceny

Skala 1–5, wynik to średnia ważona.

| Kryterium | Waga | Co oceniamy |
|---|---:|---|
| Dopasowanie (D) | 30% | Ile elementów z naszego zakresu 4.1 pokrywa |
| Użyteczność w kryzysie (K) | 25% | Prostota, offline, krok po kroku, mapa i trasa |
| Wartość dla preppersów (P) | 20% | Checklisty, zapasy, scenariusze |
| Popularność (Pop) | 15% | Zasięg i realne użycie (szacunek) |
| Hackathon (H) | 10% | Dane, API, inspiracja, możliwość integracji |

## Ranking

| # | Rozwiązanie | Region | D | K | P | Pop | H | **Wynik** |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | #wGotowości (MON) | PL | 5 | 4 | 4 | 4 | 3 | **4,20** |
| 2 | Gdzie się ukryć (MSWiA/PSP) | PL | 4 | 5 | 3 | 4 | 5 | **4,15** |
| 3 | NomadCore | świat | 5 | 3 | 4 | 2 | 4 | **3,75** |
| 4 | Watchtower Survival Pro | świat | 4 | 3 | 4 | 2 | 2 | **3,25** |
| 5 | mObywatel (poradnik) | PL | 3 | 3 | 3 | 5 | 2 | **3,20** |
| 6 | Bridgefy | świat | 2 | 4 | 3 | 4 | 3 | **3,10** |
| 7 | Regionalny System Ostrzegania ⚠ | PL | 2 | 4 | 2 | 4 | 4 | **3,00** |
| 8 | Ready: Emergency Kit Planner | świat | 4 | 2 | 3 | 1 | 2 | **2,65** |

## Polska

### #wGotowości (MON), 4,20
- **Core:** checklista plecaka ewakuacyjnego (z MON, MSWiA, RCB), zachęta do opracowania i przećwiczenia planu rodzinnego, poradnik bezpieczeństwa offline, zapisy na bezpłatne szkolenia.
- **Dla kogo:** każdy mieszkaniec Polski.
- **Mocne strony:** oficjalne, spójne z komunikacją państwa, offline.
- **Braki:** nie tworzy planu przypisanego do rodziny (role, miejsca spotkań), brak luk w gotowości i trybu działania.
- **Rola dla nas:** główny polski punkt odniesienia. Różnicujemy się konkretem zamiast wiedzy ogólnej.
- **Porównanie zespołu:** [`porownanie-wgotowosci-vs-household-resilience-app.md`](../../../porownanie-wgotowosci-vs-household-resilience-app.md)
- [Źródło](https://www.chip.pl/2026/02/wgotowosci-to-nowa-aplikacja-mon-ktora-chce-nas-przygotowac-na-trudne-czasy)

### Gdzie się ukryć (MSWiA/PSP), 4,15
- **Core:** mapa ok. 83 tys. punktów schronienia (ok. 24 mln osób), trasa przez nawigację, tryb offline po pobraniu danych.
- **Mocne strony:** oficjalna baza, duży zasięg.
- **Braki:** brak powiązania z rodziną, planu B, kontaktów i checklist. Media pisały o niedostępnych miejscach i problemach technicznych. Strona blokuje boty.
- **Rola dla nas:** źródło schronów. Nie budujemy własnej bazy, sprawdzamy dostępność danych lub API.
- **Porównanie zespołu:** [`porownanie-gdziesieukryc-vs-household-resilience.md`](../../../porownanie-gdziesieukryc-vs-household-resilience.md)
- [Źródło](https://www.gov.pl/web/kppsp-pabianice/nowa-aplikacja-gdziesieukrycpl--pomoc-w-szybkim-znalezieniu-miejsca-schronienia-w-sytuacji-zagrozenia)

### mObywatel, poradnik bezpieczeństwa, 3,20
- **Core:** cyfrowy poradnik bezpieczeństwa GOV w ramach aplikacji z największą bazą użytkowników.
- **Mocne strony:** zasięg i zaufanie.
- **Braki:** zwykły poradnik, bez personalizacji, planu, mapy i trybu działania.
- **Rola dla nas:** potwierdza, że dystrybucja poradników już istnieje. Nasz plus to przełożenie ich na plan.
- **Porównanie zespołu:** [`porownanie-mobywatel-vs-household-resilience-app.md`](../../../porownanie-mobywatel-vs-household-resilience-app.md)
- [Źródło](https://www.rmf24.pl/fakty/polska/news-poradnik-bezpieczenstwa-juz-dostepny-w-aplikacji-mobywatel,nId,8064171)

### Regionalny System Ostrzegania (MSWiA) ⚠, 3,00
- **Core:** powiadomienia o lokalnych zagrożeniach publikowane przez Wojewódzkie Centra Zarządzania Kryzysowego, kreator ustawień przy pierwszym uruchomieniu (widoczny na screenie).
- **Braki (hipoteza):** nie mówi, co zrobić po alercie.
- **Rola dla nas:** kandydat do integracji (alert → Execution Mode). Sprawdzić, czy jest otwarte API.

## Globalne

### NomadCore, 3,75
- **Core:** profile rodziny, miejsca spotkań, lista grab-and-go, trasy ewakuacji, zapasy w 13 kategoriach z alertami o terminach, mapy offline, kontakty, udostępnianie planu przez QR. Ekran „Emergency Center” z kafelkami akcji.
- **Mocne strony:** najpełniejszy zakres funkcji zbliżony do naszego, działa bez internetu.
- **Braki:** brak polskich schronów i alertów. Nie potwierdzono trybu działania krok po kroku ani drilli.
- **Rola dla nas:** najbliższy konkurent. Przewaga: lokalizacja, Execution Mode, luki w gotowości.
- [Źródło](https://apps.apple.com/app/id6751544385)

### Watchtower Survival Pro, 3,25
- **Core:** pulpit gotowości z miernikami „Preparedness” i „Current Risk”, alerty na żywo, checklisty go-bag, plan rodziny, śledzenie zapasów, ponad 50 poradników offline.
- **Mocne strony:** wskaźnik gotowości z rekomendacją „co zdobyć najpierw”.
- **Braki:** część funkcji wymaga sieci, nacisk na USA.
- **Rola dla nas:** wzorzec dla Readiness Score i ekranu luk.
- [Źródło](https://apps.apple.com/us/app/-/id6751219165)

### Bridgefy, 3,10
- **Core:** komunikator Bluetooth mesh (do ok. 100 m, dalej przez inne telefony), działa bez internetu.
- **Braki:** tylko komunikacja, bez planu, checklist i map.
- **Rola dla nas:** fallback na brak łączności. Polecić lub zintegrować, nie budować.
- [Źródło](https://techxlab.org/solutions/bridgefy/)

### Ready: Emergency Kit Planner, 2,65
- **Core:** zestaw na 72 godziny spersonalizowany pod rodzinę, rejestr zapasów z ilościami i terminami, przypomnienia, offline-first.
- **Braki:** brak mapy, planu rodziny i trybu działania.
- **Rola dla nas:** wzorzec dla preparedness decay (przypomnienia o wygasających zapasach).
- [Źródło](https://apps.apple.com/app/id6760856696)

## Wnioski i white space

1. **Poradnik to nie plan.** Polskie rozwiązania (#wGotowości, mObywatel) dają wiedzę, ale nie tworzą planu rodziny.
2. **Schrony i alerty rozwiązuje państwo** (Gdzie się ukryć, RSO). Integrujemy, nie budujemy. Alerty dopiero po MVP.
3. **Zagraniczne aplikacje** (NomadCore, Watchtower) mają plan rodziny i zapasy, ale nie znają polskich schronów ani alertów.
4. **Brak wyraźnego trybu działania** w opisanych produktach. Do potwierdzenia przy NomadCore i Watchtower.
5. **Luki w gotowości:** tylko Watchtower ma zbliżony wskaźnik. Nikt nie robi tego dla rodziny.
6. **Komunikacja offline** (Bridgefy) to osobny temat: polecać, nie budować.

## Usunięte z listy

Siedem pozycji usunięto, bo mało wnoszą wobec zakresu PRD (plan rodziny, Execution Mode, schrony z istniejących systemów, alerty po MVP). Poniżej to, co z nich warto zachować.

| Rozwiązanie | Wynik | Powód usunięcia | Rekomendacja do zachowania |
|---|---:|---|---|
| Air Alert | 3,00 | tylko alerty (po MVP), brak planu | **Wzorzec ekranu alarmu:** jeden symbol, duży kontrast, głośny sygnał. Użyć przy projektowaniu startu Execution Mode. |
| HazAdapt | 1,95 | nastawiona na USA, słabo potwierdzona | **Pomysł „Prep Check”:** szybkie sprawdzenie gotowości z jednego ekranu. Inspiracja dla ekranu luk. |
| Survivalist: Survival Guide | 2,60 | ogólne przewodniki | **Struktura checklist:** tagi i poziom trudności przy wpisach. Źródło pomysłów na checklistę plecaka. |
| Briar | 2,70 | tylko komunikacja, brak iOS | **Wzorzec prywatności bez chmury:** przydatny przy udostępnianiu planu przez QR lub transfer lokalny. |
| Prepper AI | 2,30 | ogólna wiedza i czat AI, ryzyko halucynacji | **Czego unikać:** nie dawać AI generującego treść w Execution Mode (sprzeczne z „minimum decyzji”). |
| Kyiv Digital | 2,45 | aplikacja jednego miasta | **Obserwacja:** aplikacja miejska może przekształcić się w narzędzie kryzysowe. Nic do przeniesienia wprost. |
| The Prepper App | 2,90 | zapasy i podręczniki, funkcje niepotwierdzone | brak |

## Do sprawdzenia

- Liczba pobrań i oceny w sklepach, żeby zastąpić szacunki popularności.
- Opis RSO i dostępność jego API.
- Czy NomadCore i Watchtower mają tryb działania i drille.
- Dostępność danych lub API: Gdzie się ukryć.
- Screen dla Gdzie się ukryć.
