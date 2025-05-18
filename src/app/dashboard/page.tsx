"use client";

import { useState } from "react";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { it } from "date-fns/locale";
import { generateMonthlyShifts, floors } from "@/utils/shiftGenerator";
import Calendar from "@/components/Calendar/Calendar";
import AbsenceModal from "@/components/Modals/AbsenceModal";
import EmployeeModal from "@/components/Modals/EmployeeModal";
import { Floor } from "@/types/shift";
import { Absence } from "@/types/absence";
import { employees as initialEmployees } from "@/utils/mockEmployees";
import { Employee } from "@/types/employee";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 5, 1)); // Giugno 2026
  const [filterFloor, setFilterFloor] = useState<Floor | "Tutti">("Tutti");
  const [filterEmployee, setFilterEmployee] = useState<string>("Tutti");
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [shifts, setShifts] = useState(() => generateMonthlyShifts(currentMonth, initialEmployees));
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [absences, setAbsences] = useState<Absence[]>([]);

  function handleShiftUpdate() {
    // Qui in futuro potrai chiamare una API per salvare
  }

  function handleMonthChange(newMonth: Date) {
    setCurrentMonth(newMonth);
    setShifts(generateMonthlyShifts(newMonth, employees));
  }

  function handleAddAbsence(absence: Absence) {
    setAbsences(prev => [...prev, absence]);
  }

  // CRUD dipendenti
  function handleAddEmployee(emp: Employee) {
    setEmployees(prev => {
      const updated = [...prev, emp];
      setShifts(generateMonthlyShifts(currentMonth, updated));
      return updated;
    });
  }
  function handleEditEmployee(emp: Employee) {
    setEmployees(prev => {
      const updated = prev.map(e => (e.id === emp.id ? emp : e));
      setShifts(generateMonthlyShifts(currentMonth, updated));
      return updated;
    });
  }
  function handleDeleteEmployee(id: string) {
    setEmployees(prev => {
      const updated = prev.filter(e => e.id !== id);
      setShifts(generateMonthlyShifts(currentMonth, updated));
      return updated;
    });
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const filteredEmployees = filterEmployee === "Tutti"
    ? employees
    : employees.filter(e => e.id === filterEmployee);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superiore */}
      <header className="sticky top-0 z-10 bg-white shadow flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-blue-900">Gestione Turni RSA</h1>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
            onClick={() => setEmployeeModalOpen(true)}
          >
            Gestisci dipendenti
          </button>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
            onClick={() => setAbsenceModalOpen(true)}
          >
            Gestisci assenze
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filterFloor}
            onChange={e => setFilterFloor(e.target.value as Floor | "Tutti")}
          >
            <option value="Tutti">Tutti i Piani</option>
            {floors.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
          >
            <option value="Tutti">Tutti i Dipendenti</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Navigazione mese */}
      <div className="flex items-center justify-center gap-4 mt-6 mb-2">
        <button
          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => handleMonthChange(subMonths(currentMonth, 1))}
        >
          &larr; Mese precedente
        </button>
        <span className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy", { locale: it })}
        </span>
        <button
          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => handleMonthChange(addMonths(currentMonth, 1))}
        >
          Mese successivo &rarr;
        </button>
      </div>

      {/* Calendario */}
      <Calendar
        days={days}
        employees={filteredEmployees}
        shifts={shifts}
        filterFloor={filterFloor}
        onShiftUpdate={handleShiftUpdate}
        absences={absences}
      />

      {/* Modale assenze */}
      <AbsenceModal
        open={absenceModalOpen}
        onClose={() => setAbsenceModalOpen(false)}
        employees={employees}
        onAddAbsence={handleAddAbsence}
      />

      {/* Modale dipendenti */}
      <EmployeeModal
        open={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        employees={employees}
        onAdd={handleAddEmployee}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
      />
    </div>
  );
}