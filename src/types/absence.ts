export type AbsenceType = "ferie" | "permesso" | "malattia";

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string; // ISO date
  endDate: string;   // ISO date
}