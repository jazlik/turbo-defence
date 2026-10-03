export const LOCATION_PROBLEMS = {
  denied: {
    title: "Brak zgody na lokalizację",
    instruction:
      "Otwórz ustawienia strony w przeglądarce (ikona obok adresu), zezwól na lokalizację i odśwież tę stronę.",
  },
  unavailable: {
    title: "Telefon nie podaje pozycji",
    instruction: "Sprawdź, czy usługi lokalizacji są włączone w ustawieniach systemu, i wyjdź pod otwarte niebo.",
  },
} as const;
