import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { AbsenceType, Absence } from "@/types/absence";
import { v4 as uuidv4 } from "uuid";
import { Employee } from "@/types/employee";

interface AbsenceModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onAddAbsence: (absence: Absence) => void;
}

const absenceLabels: Record<AbsenceType, string> = {
  ferie: "Ferie",
  permesso: "Permesso",
  malattia: "Malattia",
};

export default function AbsenceModal({
  open,
  onClose,
  employees,
  onAddAbsence,
}: AbsenceModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<AbsenceType>("ferie");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) return;
    onAddAbsence({
      id: uuidv4(),
      employeeId,
      type,
      startDate,
      endDate,
    });
    setEmployeeId("");
    setType("ferie");
    setStartDate("");
    setEndDate("");
    onClose();
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Gestisci Assenza
                </Dialog.Title>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dipendente</label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      required
                    >
                      <option value="">Seleziona...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo assenza</label>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={type}
                      onChange={e => setType(e.target.value as AbsenceType)}
                    >
                      {Object.entries(absenceLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Dal</label>
                      <input
                        type="date"
                        className="w-full border rounded px-2 py-1"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Al</label>
                      <input
                        type="date"
                        className="w-full border rounded px-2 py-1"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                      onClick={onClose}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Salva
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}