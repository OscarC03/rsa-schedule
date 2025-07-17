import { ShiftType, AbsenceType } from "@/model/model";

// Dimensioni costanti per celle e header
export const CELL_HEIGHT = 64;
export const CELL_WIDTH = 140;

// Colori pastello per i turni e le assenze
export const coloriTurni: Record<string, string> = {
  Morning: '#b7eacb',    // verde pastello
  MorningI: '#a3e3e6',   // azzurro-verde per MorningI
  Afternoon: '#ffe5b4',  // arancio pastello
  Split: '#b4d8ff',      // azzurro pastello
  Night: '#c7bfff',      // viola pastello
  Free: '#f3f4f6',       // grigio pastello
  Ferie: '#ffe4e1',      // rosa chiaro
  Permesso: '#fff9c4',   // giallo chiaro
  Malattia: '#e0e7ff',   // lilla chiaro
  RiposoCompensativo: '#f0fdf4',  // verde molto chiaro
  Riposo: '#fef3c7',     // ambra chiaro
  RiposoCambioDivisa: '#ede9fe', // viola molto chiaro
};

// Colori alternativi per i turni (per giorni speciali)
export const coloriTurniAlternativi: Record<string, string> = {
  Morning: '#a7d8bd',    // verde più scuro
  MorningI: '#8ed1d7',   // azzurro-verde più scuro
  Afternoon: '#ffd48a',  // arancio più scuro
  Split: '#9bc7ff',      // azzurro più scuro
  Night: '#b8a9ff',      // viola più scuro
  Free: '#e5e7eb',       // grigio più scuro
  Ferie: '#ffb3b3',      // rosa più scuro
  Permesso: '#fff176',   // giallo più scuro
  Malattia: '#c4b5fd',   // lilla più scuro
  RiposoCompensativo: '#dcfce7',  // verde più scuro
  Riposo: '#fed7aa',     // ambra più scuro
  RiposoCambioDivisa: '#ddd6fe', // viola più scuro
};

// Tipo per personalizzazioni colori giornaliere
export interface DayColorCustomization {
  date: string; // formato YYYY-MM-DD
  useAlternativeColors: boolean;
  customColors?: Record<string, string>;
}

// Storage per personalizzazioni colori per giorno
export const getDayColorCustomizations = (year: number, month: number): DayColorCustomization[] => {
  const key = `dayColors_${year}_${month}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const saveDayColorCustomizations = (year: number, month: number, customizations: DayColorCustomization[]) => {
  const key = `dayColors_${year}_${month}`;
  localStorage.setItem(key, JSON.stringify(customizations));
};

// Funzione per ottenere i colori di un giorno specifico
export const getColorsForDate = (date: string, year: number, month: number): Record<string, string> => {
  const customizations = getDayColorCustomizations(year, month);
  const dayCustomization = customizations.find(c => c.date === date);
  
  if (dayCustomization) {
    if (dayCustomization.useAlternativeColors) {
      const customColors = dayCustomization.customColors || {};
      return { ...coloriTurniAlternativi, ...customColors };
    } else if (dayCustomization.customColors) {
      return { ...coloriTurni, ...dayCustomization.customColors };
    }
  }
  
  return coloriTurni;
};

export const CELL_TYPE = "CELL";

// Tipi di turni disponibili
export const shiftTypes: ShiftType[] = [
  ShiftType.Morning,
  ShiftType.MorningI,
  ShiftType.Afternoon,
  ShiftType.Split,
  ShiftType.Night,
  ShiftType.Free
];

// Tipi di assenze disponibili
export const absenceTypes: AbsenceType[] = [
  AbsenceType.Ferie,
  AbsenceType.Permesso,
  AbsenceType.Malattia,
  AbsenceType.RiposoCompensativo,
  AbsenceType.Riposo,
  AbsenceType.RiposoCambioDivisa
];

// Mappa dei nomi italiani per la visualizzazione
export const italianNames: Record<string, string> = {
  Morning: 'Mattina',
  MorningI: 'Mattina Inf.',
  Afternoon: 'Pomeriggio',
  Split: 'Spezzato',
  Night: 'Notte',
  Free: 'Riposo',
  Ferie: 'Ferie',
  Permesso: 'Permesso',
  Malattia: 'Malattia',
  RiposoCompensativo: 'Riposo Compensativo',
  Riposo: 'Riposo',
  RiposoCambioDivisa: 'Riposo Cambio Divisa'
};

// Lista mesi da Maggio ad Aprile
export const mesi = [
  { value: 4, label: "Maggio" },
  { value: 5, label: "Giugno" },
  { value: 6, label: "Luglio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Settembre" },
  { value: 9, label: "Ottobre" },
  { value: 10, label: "Novembre" },
  { value: 11, label: "Dicembre" },
  { value: 0, label: "Gennaio" },
  { value: 1, label: "Febbraio" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Aprile" },
];

// Calcola mese/anno di partenza: Maggio 2025
export const initialMonth = 4; // Maggio (zero-based)
export const initialYear = 2025;
