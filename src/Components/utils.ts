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

// Helper function to generate unique IDs for shifts
const generateShiftId = (): string => {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export async function loadMatrixFromDatabase(year: number, month: number): Promise<Record<string, Record<string, ResourceShift>> | null> {
  try {
    const response = await apiService.getMatrix(year, month);
    if (response.success && response.data) {
      // Ensure all shifts have proper client-side IDs for drag & drop tracking
      const matrix = response.data;
      let generatedIds = 0;
      for (const resourceId of Object.keys(matrix)) {
        for (const date of Object.keys(matrix[resourceId])) {
          const shift = matrix[resourceId][date];
          if (shift && !shift.id) {
            shift.id = generateShiftId();
            generatedIds++;
          }
        }
      }
      console.log(`📊 Loaded matrix: ${generatedIds} shifts got new IDs`);
      return matrix;
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
