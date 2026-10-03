# Household Resilience App: plik core projektu

Aplikacja do ewakuacji osobistej i planowania kryzysowego dla gospodarstwa domowego. Projekt na hackathon (HackYeah). Ten plik jest głównym źródłem prawdy o tym, co budujemy i dlaczego. Zmiany zakresu wprowadzamy tutaj.

## Źródła prawdy

- `PROJECT.md` — wizja, zasady i zakres produktu.
- `context/foundation/prd.md` — aktualnie ukształtowane wymagania, decyzje i otwarte pytania.
- `JEZYK_WIZUALNY.md` — obowiązujący język wizualny aplikacji oraz wszystkich mockupów, prototypów, wizualizacji, prezentacji i grafik pokazujących produkt.

Nie kopiujemy specyfikacji wizualnej do innych dokumentów. Zadania projektowe i implementacyjne dotyczące warstwy wizualnej mają odwoływać się do `JEZYK_WIZUALNY.md`.

## 1. Problem

Większość ludzi ma dostęp do poradników i informacji kryzysowych, ale nie przekłada ich na konkretny plan działania dla własnego gospodarstwa domowego. Kłopot zaczyna się w momencie kryzysu, szczególnie gdy domownicy są w różnych miejscach, nie mogą się skontaktować, a każdy musi wiedzieć, co robić, bez improwizowania pod presją.

## 2. Rozwiązanie

Aplikacja pomaga rodzinie w trzech krokach:

1. **Przygotować** własny, prywatny i offline-ready plan kryzysowy.
2. **Przećwiczyć** go przed realnym zagrożeniem.
3. **Wykonać** go w uproszczonym trybie działania, gdy sytuacja naprawdę wystąpi.

Segment: B2C, gospodarstwa domowe (rodziny, w drugiej kolejności społeczności lokalne).

## 3. Zasady projektowe

- **Offline-first.** Plan, mapa i najważniejsze instrukcje działają lokalnie, bez internetu.
- **Prywatność.** Dane zostają na urządzeniu. Udostępnianie rodzinie bez centralnej chmury (QR lub szyfrowany transfer lokalny).
- **Minimum decyzji w kryzysie.** Decyzje podejmujemy wcześniej, w trybie przygotowania. W trybie działania użytkownik tylko wykonuje kroki.
- **Konkret zamiast wiedzy ogólnej.** Aplikacja nie jest kolejnym poradnikiem. Zamienia poradniki w plan przypisany do konkretnej rodziny, miejsca i ludzi.
- **Korzystamy z istniejących systemów państwowych** (alerty, schrony) zamiast budować własne bazy tam, gdzie się da.

## 4. Zakres

### 4.1 Must have

1. **Interaktywny onboarding przygotowań.** Po pierwszym uruchomieniu użytkownik jest prowadzony przez kluczowe elementy ewakuacji:
   - jak przygotować plecak ewakuacyjny i co w nim jest (checklista),
   - dokąd się ewakuować,
   - jak zaplanować ewakuację dla całej rodziny lub społeczności.
2. **Household emergency plan.** Członkowie rodziny, kontakty, miejsca spotkań, miejsce zapasowe (backup location), role i podstawowe scenariusze.
3. **Dane offline i udostępnianie.** Zebrane dane są przechowywane lokalnie na urządzeniu i można je przekazać innym członkom rodziny.
4. **Mapa offline i trasa.** Trasa do wskazanego punktu, docelowo do schronu lub bezpiecznego miejsca.
5. **Preparedness gaps.** System pokazuje, czego brakuje, np. brak backup meeting point, brak offline copy planu, nieprzygotowany plecak.
6. **Execution Mode (tryb działania).** W kryzysie aplikacja przełącza się w prosty tryb krok po kroku: duże komunikaty, voice guidance, wibracje, minimum decyzji. Korzysta z wcześniej zebranych danych, zapisanej mapy i trasy offline oraz wcześniej przygotowanej instrukcji.
7. **Przycisk uruchamiający tryb alarmu.** Ręczne wejście w Execution Mode. Pełna automatyzacja (np. z alertów) jest na później.

### 4.2 Nice to have

- **Gamifikacja przygotowań.** Punkty za przygotowanie plecaka, scenariusza itp.; Readiness Score, poziom gotowości, streaki, milestones (np. "72H Ready").
- **Emergency drills.** Krótkie symulacje (blackout, utrata łączności, ewakuacja). Po zakończeniu system pokazuje wykryte luki w planie.
- **Micro-missions.** Krótkie zadania podnoszące gotowość: sprawdź powerbank, ustal kontakt awaryjny, odśwież zapasy.

### 4.3 Możliwe rozszerzenia (po hackathonie)

- **Family plan sharing.** QR lub encrypted local transfer do przekazania planu domownikom bez centralnej chmury.
- **Preparedness decay.** Przypomnienia o wygasających lekach i zapasach oraz o zmianach: adresu, szkoły, pracy, procedur.
- **Official shelter / alert integration.** Wykorzystanie istniejących systemów państwowych zamiast własnej mapy.
- **High-priority alerts.** Agresywny alert pełnoekranowy i przejście od "co się stało?" do "co mam teraz zrobić?".
- **Community / neighbourhood layer.** Opcjonalnie lokalne punkty pomocy, zasoby i koordynacja sąsiedzka.
- **Preparedness challenges.** Rodzinne lub społeczne kampanie zwiększające świadomość i atrakcyjność przygotowań.

## 5. Główny przepływ użytkownika

1. Pierwsze uruchomienie, onboarding: rodzina, plecak, miejsca, ewakuacja.
2. Zapis planu lokalnie, pobranie mapy i trasy offline.
3. Ekran gotowości: luki w przygotowaniu i kolejne kroki.
4. Udostępnienie planu domownikom.
5. (Nice to have) Ćwiczenie scenariusza i punkty.
6. Kryzys: przycisk alarmu, Execution Mode, prowadzenie do punktu.

## 6. Źródła i inspiracje

- Nomad Core
- Aplikacja RSO
- Gdziesieukryć (mapa bunkrów i schronów)
- Poradnik bezpieczeństwa GOV

## 7. Do ustalenia (otwarte decyzje)

Poniższe punkty nie wynikają z wyjściowego planu i trzeba je zdecydować jako zespół:

- Platforma: PWA, aplikacja mobilna natywna czy cross-platform (np. React Native, Flutter).
- Źródło map offline i routingu (np. OpenStreetMap z kafelkami offline) oraz źródło danych o schronach.
- Format i szyfrowanie planu przy udostępnianiu (QR, plik, Bluetooth, lokalna sieć).
- Zakres dema na hackathon: co faktycznie pokażemy na żywo, a co tylko opiszemy.
- Podział ról w zespole i harmonogram.

## 8. Plan na hackathon (propozycja do zatwierdzenia)

Minimalny zestaw, który da spójne demo od początku do końca:

1. Onboarding z checklistą plecaka i planem rodziny.
2. Lokalny zapis planu.
3. Mapa i trasa do jednego punktu (schronu) offline.
4. Ekran luk w przygotowaniu.
5. Execution Mode z prostym prowadzeniem krok po kroku.

Gamifikację i drille dokładamy tylko, jeśli zostanie czas.

## 9. Notatki dla AI i współpracowników

- Ten plik ma pierwszeństwo przed innymi notatkami. Przy sprzecznościach pytaj, nie zgaduj.
- Przed każdym zadaniem dotyczącym UI, komponentów, mockupów, prototypów, wizualizacji, prezentacji lub grafik produktu przeczytaj `JEZYK_WIZUALNY.md` i traktuj go jako źródło prawdy dla warstwy wizualnej.
- Nowe pomysły wpisuj do sekcji 4.2 lub 4.3, nie do 4.1, dopóki zespół tego nie zatwierdzi.
- Domyślny język dokumentacji i interfejsu: polski.
