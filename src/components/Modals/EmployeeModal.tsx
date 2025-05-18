import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Floor } from "@/types/shift";
import { v4 as uuidv4 } from "uuid";
import clsx from "clsx";
import { Employee } from "@/types/employee";

const floorOptions: Floor[] = ["Piano 1", "Piano 2", "Piano 3"];
const colorOptions = [
  "bg-blue-200", "bg-green-200", "bg-yellow-200", "bg-pink-200", "bg-purple-200"
];

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onAdd: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

export default function EmployeeModal({
  open,
  onClose,
  employees,
  onAdd,
  onEdit,
  onDelete,
}: EmployeeModalProps) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: "",
    canWorkFloors: [] as Floor[],
    isPartTime: false,
    rotationEnabled: true,
    color: colorOptions[0],
  });
  const [error, setError] = useState("");

  function resetForm() {
    setEditing(null);
    setForm({
      name: "",
      canWorkFloors: [],
      isPartTime: false,
      rotationEnabled: true,
      color: colorOptions[0],
    });
    setError("");
  }

  function handleEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      canWorkFloors: emp.canWorkFloors,
      isPartTime: emp.isPartTime,
      rotationEnabled: emp.rotationEnabled,
      color: emp.color,
    });
    setError("");
  }

  function handleDelete(id: string) {
    if (window.confirm("Eliminare il dipendente?")) {
      onDelete(id);
      if (editing?.id === id) resetForm();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }
    if (form.canWorkFloors.length === 0) {
      setError("Seleziona almeno un piano");
      return;
    }
    setError("");
    if (editing) {
      onEdit({ ...editing, ...form });
    } else {
      onAdd({ ...form, id: uuidv4() });
    }
    resetForm();
  }

  function handleFloorChange(floor: Floor) {
    setForm(f => ({
      ...f,
      canWorkFloors: f.canWorkFloors.includes(floor)
        ? f.canWorkFloors.filter(p => p !== floor)
        : [...f.canWorkFloors, floor],
    }));
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { onClose(); resetForm(); }}>
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
              <Dialog.Panel className="w-full max-w-2xl rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Gestione Dipendenti
                </Dialog.Title>
                {/* Lista dipendenti */}
                <div className="mb-6 max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-600">
                        <th>Nome</th>
                        <th>Piani</th>
                        <th>Rotazione</th>
                        <th>Part-time</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} className="border-b last:border-0">
                          <td>
                            <span className={clsx("px-2 py-1 rounded", emp.color)}>{emp.name}</span>
                          </td>
                          <td>
                            {emp.canWorkFloors.join(", ")}
                          </td>
                          <td>
                            {emp.rotationEnabled ? "Sì" : "No"}
                          </td>
                          <td>
                            {emp.isPartTime ? "Sì" : "No"}
                          </td>
                          <td>
                            <button
                              className="text-blue-600 hover:underline mr-2"
                              onClick={() => handleEdit(emp)}
                            >
                              Modifica
                            </button>
                            <button
                              className="text-red-600 hover:underline"
                              onClick={() => handleDelete(emp.id)}
                            >
                              Elimina
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Form aggiunta/modifica */}
                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome e Cognome *</label>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Piani assegnabili *</label>
                    <div className="flex gap-2">
                      {floorOptions.map(floor => (
                        <label key={floor} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={form.canWorkFloors.includes(floor)}
                            onChange={() => handleFloorChange(floor)}
                          />
                          {floor}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.rotationEnabled}
                        onChange={e => setForm(f => ({ ...f, rotationEnabled: e.target.checked }))}
                      />
                      Abilitato alla rotazione tra i piani
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isPartTime}
                        onChange={e => setForm(f => ({ ...f, isPartTime: e.target.checked }))}
                      />
                      Part-time
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Colore</label>
                    <div className="flex gap-2">
                      {colorOptions.map(color => (
                        <button
                          type="button"
                          key={color}
                          className={clsx(
                            "w-6 h-6 rounded-full border-2",
                            color,
                            form.color === color ? "border-blue-600" : "border-gray-300"
                          )}
                          onClick={() => setForm(f => ({ ...f, color }))}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>
                  {error && <div className="text-red-600 text-xs">{error}</div>}
                  <div className="flex justify-end gap-2 mt-2">
                    {editing && (
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                        onClick={resetForm}
                      >
                        Annulla modifica
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {editing ? "Salva modifiche" : "Aggiungi dipendente"}
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