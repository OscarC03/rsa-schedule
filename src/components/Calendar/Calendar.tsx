import { useState } from "react";
import { format, getDay, isWithinInterval, parseISO } from "date-fns";
import clsx from "clsx";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { DayShifts, Floor, ShiftAssignment } from "@/types/shift";
import { Absence } from "@/types/absence";
import { Employee } from "@/types/employee";

interface CalendarProps {
  days: Date[];
  employees: Employee[];
  shifts: Record<string, DayShifts>;
  filterFloor: Floor | "Tutti";
  onShiftUpdate: (
    params: {
      from: { day: string; employeeId: string };
      to: { day: string; employeeId: string };
      assignment: ShiftAssignment;
    }
  ) => void;
  absences: Absence[];
}

const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const absenceColors: Record<string, string> = {
  ferie: "bg-yellow-200 text-yellow-900 border-yellow-400",
  permesso: "bg-blue-200 text-blue-900 border-blue-400",
  malattia: "bg-red-200 text-red-900 border-red-400",
};

function getAbsenceForDay(absences: Absence[], employeeId: string, day: Date) {
  return absences.find(
    a =>
      a.employeeId === employeeId &&
      isWithinInterval(day, {
        start: parseISO(a.startDate),
        end: parseISO(a.endDate),
      })
  );
}

// Draggable turno
function DraggableShift({ id, assignment, disabled }: { id: string; assignment: ShiftAssignment; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...(!disabled ? listeners : {})}
      {...attributes}
      className={clsx(
        "cursor-move select-none transition-shadow",
        isDragging && "ring-2 ring-blue-400 shadow-lg",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={clsx(
          "text-xs font-semibold px-2 py-1 rounded",
          assignment.shift === "Mattina" && "bg-blue-100 text-blue-900",
          assignment.shift === "Pomeriggio" && "bg-green-100 text-green-900",
          assignment.shift === "Notte" && "bg-purple-100 text-purple-900",
          assignment.shift === "Riposo" && "bg-gray-200 text-gray-600"
        )}
      >
        {assignment.shift}
      </span>
      <span className="ml-1 text-[10px] text-gray-500">{assignment.floor}</span>
    </div>
  );
}

// Droppable cella giorno
function DroppableCell({
  id,
  children,
  isOver,
  canDrop,
}: {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
  canDrop: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <td
      ref={setNodeRef}
      className={clsx(
        "text-center align-top p-1 transition-colors",
        isOver && canDrop && "bg-blue-100",
        isOver && !canDrop && "bg-red-100"
      )}
      style={{ minWidth: 70, minHeight: 40 }}
    >
      {children}
    </td>
  );
}

export default function Calendar({
  days,
  employees,
  shifts: initialShifts,
  filterFloor,
  onShiftUpdate,
  absences,
}: CalendarProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const [fromDay, fromEmp] = (active.id as string).split("___");
    const [toDay, toEmp] = (over.id as string).split("___");

    if (!shifts[toDay] || !shifts[toDay][toEmp]) return;

    const fromAssignment = shifts[fromDay][fromEmp];
    const toAssignment = shifts[toDay][toEmp];

    setShifts(prev => {
      const updated = { ...prev };
      updated[fromDay] = { ...updated[fromDay], [fromEmp]: toAssignment };
      updated[toDay] = { ...updated[toDay], [toEmp]: fromAssignment };
      return updated;
    });

    onShiftUpdate({
      from: { day: fromDay, employeeId: fromEmp },
      to: { day: toDay, employeeId: toEmp },
      assignment: fromAssignment,
    });
  }

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={e => setActiveId(e.active.id as string)}
      onDragOver={e => setOverId(e.over?.id as string || null)}
    >
      <div className="overflow-x-auto px-4 pb-8">
        <table className="min-w-full border-collapse bg-white shadow rounded-lg">
          <thead>
            <tr>
              <th className="border-b p-2 text-left bg-gray-100">Dipendente</th>
              {days.map((day, idx) => (
                <th
                  key={idx}
                  className={clsx(
                    "border-b p-2 text-center bg-gray-100",
                    getDay(day) === 0 && "text-red-500"
                  )}
                >
                  <div className="text-xs">{weekDays[(getDay(day) + 6) % 7]}</div>
                  <div className="font-semibold">{format(day, "d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td className="border-r p-2 font-medium whitespace-nowrap">
                  <span className={clsx("px-2 py-1 rounded", emp.color)}>{emp.name}</span>
                  {emp.isPartTime && (
                    <span className="ml-2 text-xs bg-yellow-300 px-1 rounded">PT</span>
                  )}
                </td>
                {days.map(day => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const assignment = shifts[dayKey][emp.id];
                  const cellId = `${dayKey}___${emp.id}`;
                  if (!assignment) return <td key={cellId} className="bg-gray-50" />;
                  if (filterFloor !== "Tutti" && assignment.floor !== filterFloor) {
                    return <td key={cellId} className="bg-gray-50" />;
                  }
                  const isOverCell = overId === cellId;
                  const canDrop = true;

                  // Assenza
                  const absence = getAbsenceForDay(absences, emp.id, day);

                  return (
                    <DroppableCell key={cellId} id={cellId} isOver={isOverCell} canDrop={canDrop}>
                      {absence ? (
                        <div
                          className={clsx(
                            "flex flex-col items-center justify-center border-2 rounded p-1",
                            absenceColors[absence.type]
                          )}
                        >
                          <span className="text-xs font-bold uppercase">
                            {absence.type}
                          </span>
                          <span className="text-[10px]">Assente</span>
                        </div>
                      ) : (
                        <DraggableShift id={cellId} assignment={assignment} disabled={!!absence} />
                      )}
                    </DroppableCell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}