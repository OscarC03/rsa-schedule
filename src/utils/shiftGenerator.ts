import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { ShiftType, Floor, DayShifts } from "@/types/shift";
import { Employee } from "@/types/employee";

export const shiftTypes: ShiftType[] = ["Mattina", "Pomeriggio", "Notte", "Riposo"];
export const floors: Floor[] = ["Piano 1", "Piano 2", "Piano 3"];

export function generateMonthlyShifts(
  month: Date,
  employees: Employee[]
): Record<string, DayShifts> {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const assignments: Record<string, DayShifts> = {};

  days.forEach((day, idx) => {
    const dayKey = format(day, "yyyy-MM-dd");
    assignments[dayKey] = {};

    employees.forEach((emp, empIdx) => {
      // Rotazione piani: ogni settimana cambia piano
      const week = Math.floor(idx / 7);
      const floor = emp.canWorkFloors[week % emp.canWorkFloors.length];

      // Turno mock: alterna mattina/pomeriggio/notte/riposo
      let shift: ShiftType;
      if (emp.isPartTime) {
        shift = idx % 6 === empIdx ? "Riposo" : "Mattina";
      } else {
        shift = shiftTypes[(idx + empIdx) % shiftTypes.length];
      }

      assignments[dayKey][emp.id] = {
        employeeId: emp.id,
        shift,
        floor,
      };
    });
  });

  return assignments;
}