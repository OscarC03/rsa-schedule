import { addDays, eachDayOfInterval, format, getISOWeek, startOfMonth, endOfMonth } from "date-fns";
import { Floor, ShiftType } from "@/types/shift";
import { Absence } from "@/types/absence";
import { Employee } from "@/types/employee";

// Esempio di schema turni per piano (da popolare in base a "Schema orario in uso.xlsx")
const SCHEMA_TURNI: Record<Floor, Record<ShiftType, number>> = {
  "Piano 1": { Mattina: 1, Pomeriggio: 2, Notte: 1, Riposo: 1 },
  "Piano 2": { Mattina: 1, Pomeriggio: 2, Notte: 1, Riposo: 1 },
  "Piano 3": { Mattina: 1, Pomeriggio: 2, Notte: 1, Riposo: 1 },
};

// Turni disponibili
const SHIFT_TYPES: ShiftType[] = ["Mattina", "Pomeriggio", "Notte"];

// Utility: controlla se un dipendente è assente in una data
function isAbsent(employeeId: string, date: Date, absences: Absence[]): Absence | undefined {
  return absences.find(a =>
    a.employeeId === employeeId &&
    date >= new Date(a.startDate) &&
    date <= new Date(a.endDate)
  );
}

// Utility: calcola il prossimo piano per la rotazione
function getRotatedFloor(employee: Employee, weekOrMonthIdx: number): Floor {
  const floors = employee.canWorkFloors;
  if (floors.length === 0) return "Piano 1";
  return floors[weekOrMonthIdx % floors.length];
}

// Utility: calcola se il dipendente può lavorare su un piano
function canWorkOnFloor(employee: Employee, floor: Floor) {
  return employee.canWorkFloors.includes(floor);
}

// Utility: calcola se il dipendente è part-time e quanti turni ha già in settimana
function getPartTimeAssignedCount(assignments: Record<string, any>, employeeId: string, week: number) {
  let count = 0;
  for (const dateStr in assignments) {
    const d = new Date(dateStr);
    if (getISOWeek(d) === week) {
      for (const floor in assignments[dateStr]) {
        for (const shift in assignments[dateStr][floor]) {
          if (assignments[dateStr][floor][shift] === employeeId) count++;
        }
      }
    }
  }
  return count;
}

// Utility: dopo un turno notte, giorno dopo = riposo
function hadNightBefore(assignments: Record<string, any>, employeeId: string, date: Date) {
  const prev = addDays(date, -1);
  const prevStr = format(prev, "yyyy-MM-dd");
  if (!assignments[prevStr]) return false;
  for (const floor in assignments[prevStr]) {
    if (assignments[prevStr][floor]?.Notte === employeeId) return true;
  }
  return false;
}

// Funzione principale
export type TurniMap = Record<
  string, // data yyyy-MM-dd
  Record<
    Floor,
    Record<
      ShiftType,
      string // employeeId | "turno scoperto"
    >
  >
>;

interface GenerateTurniParams {
  month: Date;
  employees: Employee[];
  absences: Absence[];
  partTimeMaxWeek?: number; // default: 4
  rotazioneMensile?: boolean; // default: false (settimanale)
}

export function generateTurni({
  month,
  employees,
  absences,
  partTimeMaxWeek = 4,
  rotazioneMensile = false,
}: GenerateTurniParams): TurniMap {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const assignments: TurniMap = {};

  // Stato temporaneo per rotazione e part-time
  const rotationIdx: Record<string, number> = {}; // employeeId -> week/month idx
  const partTimeCount: Record<string, number> = {}; // employeeId_week -> count

  days.forEach(date => {
    const dateStr = format(date, "yyyy-MM-dd");
    assignments[dateStr] = {} as any;

    // Calcola indice di rotazione (settimanale o mensile)
    const weekIdx = getISOWeek(date) - getISOWeek(startOfMonth(month));
    const monthIdx = 0; // sempre 0 per il mese corrente
    const rotIdx = rotazioneMensile ? monthIdx : weekIdx;

    for (const floor of Object.keys(SCHEMA_TURNI) as Floor[]) {
      assignments[dateStr][floor] = {} as any;

      for (const shift of SHIFT_TYPES) {
        const required = SCHEMA_TURNI[floor][shift];
        let assigned = 0;

        // Filtra OSS disponibili per questo turno/piano
        const available = employees.filter(emp => {
          // Non può lavorare su questo piano
          if (!canWorkOnFloor(emp, floor)) return false;
          // Assente in questa data
          if (isAbsent(emp.id, date, absences)) return false;
          // Dopo notte: riposo
          if (hadNightBefore(assignments, emp.id, date)) return false;
          // Part-time: max turni a settimana
          if (emp.isPartTime) {
            const week = getISOWeek(date);
            const key = `${emp.id}_${week}`;
            const count = partTimeCount[key] || 0;
            if (count >= partTimeMaxWeek) return false;
          }
          return true;
        });

        // Ordina per rotazione (solo se abilitato)
        const rotEmp = available.filter(e => e.rotationEnabled)
          .sort((a, b) => {
            const aIdx = rotationIdx[a.id] ?? 0;
            const bIdx = rotationIdx[b.id] ?? 0;
            return aIdx - bIdx;
          });

        // Poi quelli non in rotazione
        const nonRotEmp = available.filter(e => !e.rotationEnabled);

        // Assegna i turni
        for (const emp of [...rotEmp, ...nonRotEmp]) {
          if (assigned >= required) break;
          // Se rotazione, calcola piano giusto
          if (emp.rotationEnabled) {
            const empFloor = getRotatedFloor(emp, rotIdx);
            if (empFloor !== floor) continue;
          }
          // Assegna
          assignments[dateStr][floor][shift] = emp.id;
          assigned++;

          // Aggiorna rotazione
          if (emp.rotationEnabled) {
            rotationIdx[emp.id] = (rotationIdx[emp.id] ?? 0) + 1;
          }
          // Aggiorna part-time
          if (emp.isPartTime) {
            const week = getISOWeek(date);
            const key = `${emp.id}_${week}`;
            partTimeCount[key] = (partTimeCount[key] || 0) + 1;
          }
        }

        // Se non coperto
        if (assigned < required) {
          for (let i = assigned; i < required; i++) {
            assignments[dateStr][floor][shift] = "turno scoperto";
          }
        }
      }
    }
  });

  return assignments;
}