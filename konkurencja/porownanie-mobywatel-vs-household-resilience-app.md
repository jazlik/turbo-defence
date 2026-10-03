# Poradnik bezpieczeństwa w mObywatelu vs Household Resilience App

_Stan wiedzy na 3 października 2026. Źródła na końcu pliku._

> **Uwaga o zakresie.** Kolumna „Household Resilience App” opisuje wizję produktu
> (`PROJECT.md`), nie zakres MVP na hackathon. Część wymienionych tu wyróżników jest w PRD
> nice-to-have albo poza zakresem: **ćwiczenia/drille** (FR-017, nice-to-have),
> **szyfrowany transfer planu** (Non-Goal, przekazanie w najprostszej formie),
> **preparedness decay** (brak w MVP), **streaki** (odrzucone; zostaje jakościowy poziom
> gotowości, FR-009). Aktualny zakres: `context/foundation/prd.md`, sekcje Functional
> Requirements i Non-Goals.

Najkrócej: poradnik w mObywatelu podaje **wiedzę ogólną** („co robić w kryzysie”). Household
Resilience App zamienia ją w **plan konkretnego domu**, który rodzina przećwiczy i wykona.
To w dużej mierze różne warstwy, ale część funkcji się pokrywa.

---

## Porównanie funkcja po funkcji

| Obszar | Poradnik w mObywatelu | Household Resilience App |
|---|---|---|
| Cel | Edukacja: ogólne zasady dla każdego | Plan działania dla konkretnego gospodarstwa |
| Dla kogo | Jedna osoba, tylko pełnoletnia z mDowodem | Cała rodzina jako jednostka |
| Plan rodzinny | Wzór jest w broszurze papierowej; w aplikacji niepotwierdzony | **Core**: członkowie, kontakty, miejsca spotkań, role |
| Plecak ewakuacyjny | Checklista do odhaczania + eksport do PDF | Pojawia się jako luka w analizie i jako micro-missions |
| Sygnały alarmowe | Odsłuch + znaczenie | Brak w opisie (pasowałyby do Execution Mode) |
| Numery SOS | Lista + przycisk „Zadzwoń” | Brak w opisie |
| Analiza luk | Brak | **Core** (personalized gaps) |
| Ćwiczenia | Brak w aplikacji; MON prowadzi osobne szkolenia stacjonarne | **Core** (drills z wykrywaniem luk) |
| Tryb na czas kryzysu | Brak dedykowanego trybu | **Core** (Execution Mode) |
| Offline | Niepotwierdzone | **Core** (offline-first) |
| Udostępnianie w rodzinie | Brak | QR / szyfrowany transfer lokalny |
| Przypomnienia | Brak informacji | Preparedness decay |
| Gamifikacja | Brak w mObywatelu, ale MON ma osobną aplikację #wGotowości z punktami i nagrodami | Readiness Score, streaki |
| Prywatność | Aplikacja rządowa, logowanie | Lokalnie, bez centralnej chmury |
| Zasięg i cena | Ponad 12 mln użytkowników, darmowa, oficjalna | Start od zera |

---

## Gdzie się pokrywacie

Warstwa treści jest wspólna: zasady bezpieczeństwa, plecak, sygnały, numery alarmowe. Tu nie
warto konkurować. mObywatel jest darmowy, oficjalny i ma ogromny zasięg. Plecak ma tam już
listę do odhaczania i eksport do PDF, sygnały da się odsłuchać, a „Zadzwoń” od razu przenosi
do aplikacji telefonu. Odtwarzanie tego od zera to praca bez wyróżnika.

---

## Gdzie jest przewaga Household Resilience App

Problem, który opisuje pomysł, potwierdza sam rząd. Papierowa broszura zawiera wzór
rodzinnego planu na kryzys, czyli prostego dokumentu do wcześniejszego zaplanowania działań.
Państwo uważa więc taki plan za kluczowy, ale zostawia go na papierze. Wersja cyfrowa,
o ile wiadomo, to pięć sekcji z wiedzą ogólną, bez planu domu, ćwiczeń i trybu wykonania.

Druga luka to rodzina jako całość. W mObywatelu poradnik otworzą tylko osoby pełnoletnie
z aktywnym mDowodem, legitymacją studencką lub dokumentem ochrony czasowej; dzieci
w mObywatelu Junior go nie widzą. Plan w Household Resilience App obejmuje wszystkich
domowników, łącznie z tymi, którzy do poradnika w mObywatelu nie mają dostępu. Dane dzieci
to jednak osobny temat prawny (RODO, zgody rodziców).

Najprostsze pozycjonowanie: **mObywatel mówi, co wiedzieć. Household Resilience App mówi,
co Twoja rodzina konkretnie zrobi i kto za co odpowiada.**

---

## Ryzyka

1. **Państwo może dodać plan rodzinny do mObywatela.** Wzór już istnieje, a aplikacja szybko
   dostaje nowe moduły (poradnik w lutym, Odyseusz w lipcu 2026). Najtrudniejsze do
   skopiowania dla aplikacji rządowej są prawdopodobnie offline-first, prywatność bez chmury
   i Execution Mode — to ocena, nie fakt.
2. **Gamifikacja nie jest unikalna.** Aplikacja MON #wGotowości ma już system punktów
   i nagród, który zachęca do budowania odporności na sytuacje kryzysowe, więc Readiness
   Score nie wystarczy jako wyróżnik.
3. **Spójność z oficjalnymi instrukcjami.** Jeśli Execution Mode powie coś innego niż
   poradnik rządowy, aplikacja traci zaufanie. Lepiej oprzeć treści na poradniku i do niego
   linkować. Licencja treści poradnika nie została sprawdzona — trzeba ją zweryfikować przed
   użyciem.
4. **Integracje z systemami państwowymi.** Nie sprawdzono, czy Alert RCB albo baza schronów
   mają publiczne API. Rozszerzenie „Official shelter / alert integration” może nie mieć się
   do czego podpiąć.
5. **Zaangażowanie między kryzysami i dystrybucja.** Konkurencją jest darmowe narzędzie,
   które ludzie już mają. Zainteresowanie rośnie skokowo przy wydarzeniach, czego przykładem
   był Alert RCB po naruszeniu przestrzeni powietrznej. Warto zaplanować, jak wykorzystać
   takie momenty.

---

## Rekomendacja

Oficjalny poradnik warto potraktować jako bazę treści, nie konkurenta. Na przykład oficjalna
lista plecaka może być punktem wyjścia, który aplikacja personalizuje (liczba osób, dzieci,
zwierzęta, leki). Cały wysiłek produktowy warto skupić na tym, czego mObywatel nie robi:
planie domu, analizie luk, ćwiczeniach, trybie wykonania i działaniu offline.

---

## Źródła

- Telepolis – Poradnik bezpieczeństwa w mObywatelu (funkcje 5 podstron):
  https://www.telepolis.pl/tech/aplikacje/mobywatel-poradnik-bezpieczenstwa-nowosc
- Geekweek Interia – dostęp, wymóg pełnoletności i mDowodu, Alert RCB:
  https://geekweek.interia.pl/technologia/news-nowy-alert-rcb-poradnik-bezpieczenstwa-masz-pod-reka-na-tele,nId,23522454
- gov.pl – Poradnik bezpieczeństwa: przeczytaj, przećwicz, zachowaj (wzór planu rodzinnego):
  https://www.gov.pl/web/uw-podlaski/poradnik-bezpieczenstwa--przeczytaj-przecwicz-zachowaj
- Antyweb – aplikacja #wGotowości (punkty i nagrody):
  https://antyweb.pl/nowa-aplikacja-dla-polakow-juz-dostepna-przygotuje-nas-na-kryzys
- Polsat News – moduł Odyseusz w mObywatelu:
  https://www.polsatnews.pl/wiadomosc/2026-07-02/wazna-nowosc-w-mobywatelu-pozycja-obowiazkowa-na-wakacjach/
