import { Employee } from "@/types/employee";


export const employees: Employee[] = [
  { id: "1", name: "Rossi Anna", canWorkFloors: ["Piano 1", "Piano 2", "Piano 3"], isPartTime: false, color: "bg-blue-200", rotationEnabled: true },
  { id: "2", name: "Bianchi Luca", canWorkFloors: ["Piano 1", "Piano 2"], isPartTime: true, color: "bg-green-200", rotationEnabled: true },
  { id: "3", name: "Verdi Sara", canWorkFloors: ["Piano 2", "Piano 3"], isPartTime: false, color: "bg-yellow-200", rotationEnabled: true },
  { id: "4", name: "Neri Paolo", canWorkFloors: ["Piano 1", "Piano 3"], isPartTime: false, color: "bg-pink-200", rotationEnabled: true },
];