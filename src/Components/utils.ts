import { ResourceShift } from "@/model/model";
import { apiService } from "./apiService";

// Utility per salvare matrice nel database
export async function saveMatrixToDatabase(matrix: Record<string, Record<string, ResourceShift>>, year: number, month: number) {
  try {
    const response = await apiService.saveMatrix(year, month, matrix);
    if (!response.success) {
      console.error('Errore salvataggio matrice:', response.error);
    }
  } catch (error) {
    console.error('Errore salvataggio matrice:', error);
  }
}

export async function loadMatrixFromDatabase(year: number, month: number): Promise<Record<string, Record<string, ResourceShift>> | null> {
  try {
    const response = await apiService.getMatrix(year, month);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Errore caricamento matrice:', error);
    return null;
  }
}

// Funzioni legacy per compatibilità con localStorage (deprecate ma mantenute per backup)
export function getMatrixStorageKey(year: number, month: number) {
  return `rsa-schedule-matrix-${year}-${month.toString().padStart(2, "0")}`;
}

export function saveMatrixToLocalStorage(matrix: Record<string, Record<string, ResourceShift>>, year: number, month: number) {
  // Ora salva nel database invece che localStorage
  saveMatrixToDatabase(matrix, year, month);
}

export function loadMatrixFromLocalStorage(year: number, month: number): Record<string, Record<string, ResourceShift>> | null {
  // Per ora manteniamo sincrono ma questo diventerà asincrono
  // Questa funzione verrà sostituita nelle chiamate
  return null;
}

// Funzione per convertire data in stringa italiana
export const convertDateToString = (date: string): string => {
  const currDate = new Date(date);
  // Ottieni giorno della settimana in italiano, 3 lettere, con la prima maiuscola
  const dayOfWeek = currDate.toLocaleDateString('it-IT', { weekday: 'short' });
  const day = currDate.toLocaleDateString('it-IT', { day: "2-digit" });
  const month = currDate.toLocaleDateString('it-IT', { month: "short" });
  // Es: "Gio 01 mag"
  return `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} ${day} ${month}`;
}

// --- EXPORT/IMPORT/RESET LOGIC ---

// Esporta tutti i dati dei turni dal localStorage in un file JSON
export function handleExportShifts() {
  // Prendi tutte le chiavi che iniziano con "rsa-schedule-matrix-"
  const allKeys = Object.keys(localStorage).filter(k => k.startsWith("rsa-schedule-matrix-"));
  const exportData: Record<string, any> = {};
  allKeys.forEach(key => {
    try {
      exportData[key] = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      // skip
    }
  });
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rsa-schedule-export.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Importa dati dei turni da un file JSON e li salva nel localStorage
export function handleImportShifts(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      if (typeof data === "object" && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith("rsa-schedule-matrix-")) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        });
        alert("Importazione completata!");
        window.location.reload();
      } else {
        alert("File non valido.");
      }
    } catch {
      alert("Errore durante l'importazione.");
    }
  };
  reader.readAsText(file);
  // Reset input per permettere re-import dello stesso file
  e.target.value = "";
}

// Reset di tutti i dati dei turni dal localStorage
export function handleResetShifts() {
  if (window.confirm("Sei sicuro di voler cancellare tutti i turni salvati? L'operazione è irreversibile.")) {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("rsa-schedule-matrix-"));
    allKeys.forEach(key => localStorage.removeItem(key));
    alert("Tutti i turni sono stati rimossi.");
    window.location.reload();
  }
}
