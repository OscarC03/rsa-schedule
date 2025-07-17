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
  Ferie: '#ffe4e1',
  Permesso: '#fff9c4',
  Malattia: '#e0e7ff',
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
  AbsenceType.Malattia
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
  Malattia: 'Malattia'
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
