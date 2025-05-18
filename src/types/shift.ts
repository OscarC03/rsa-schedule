export type ShiftType = "Mattina" | "Pomeriggio" | "Notte" | "Riposo";
export type Floor = "Piano 1" | "Piano 2" | "Piano 3";

export interface ShiftAssignment {
  employeeId: string;
  shift: ShiftType;
  floor: Floor;
}

export type DayShifts = {
  [employeeId: string]: ShiftAssignment;
};