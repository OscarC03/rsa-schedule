"use client";

import { generateShift, getLastShiftIndexByResource, replicateScheduleForMonth } from "@/Application Code/Shift Management/ShiftManagement";
import { Resource, ResourceShift, ResourceType, ShiftType } from "@/model/model";
import { useEffect, useRef, useState, useMemo, memo } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Dimensioni costanti per celle e header
const CELL_HEIGHT = 64;
const CELL_WIDTH = 140;

// Colori pastello per i turni
const coloriTurni: Record<ShiftType, string> = {
  Morning: '#b7eacb',    // verde pastello
  Afternoon: '#ffe5b4',  // arancio pastello
  Split: '#b4d8ff',      // azzurro pastello
  Night: '#c7bfff',      // viola pastello
  Free: '#f3f4f6',       // grigio pastello
};

const CELL_TYPE = "CELL";

const DraggableCell = memo(function DraggableCell({
  rowIdx,
  colIdx,
  value,
  onCellDrop,
  coloriTurni
}: {
  rowIdx: number;
  colIdx: number;
  value: ResourceShift | undefined;
  onCellDrop: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  coloriTurni: Record<ShiftType, string>;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: CELL_TYPE,
    item: { rowIdx, colIdx, value },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: CELL_TYPE,
    drop: (item: any) => {
      if (item.rowIdx !== rowIdx || item.colIdx !== colIdx) {
        onCellDrop(item.rowIdx, item.colIdx, rowIdx, colIdx);
      }
    }
  });

  let display = "";
  if (
    value &&
    typeof value === "object" &&
    value !== null &&
    typeof value.shiftType === "string"
  ) {
    display = value.floor > 0
      ? `${value.shiftType} Piano: ${value.floor}`
      : value.shiftType;
  }

  const setRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <div
      ref={setRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: value && typeof value === "object" && value !== null && typeof value.shiftType === "string"
          ? coloriTurni[value.shiftType]
          : undefined,
        cursor: "move",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        fontWeight: 500,
        userSelect: "none"
      }}
      title={typeof value === "object" && value !== null && typeof value.shiftType === "string" ? value.shiftType : ""}
    >
      {display}
    </div>
  );
});

export default function Page() {
  const [shifts, setShifts] = useState<ResourceShift[]>([]);
  const shiftRef = useRef<ResourceShift[]>([]);
  const lastShiftRef = useRef<ResourceShift[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, ResourceShift>>>({});
  const [dateArray, setDateArray] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);

  const resources: Resource[] = [
    // 23 OSS A TEMPO PIENO
    ...Array.from({ length: 23 }, (_, i) => ({
      id: (i + 1).toString(),
      firstName: `OSS${i + 1}`,
      lastName: `FullTime`,
      forbiddenShiftTypes: [],
      type: ResourceType.FULL_TIME,
      fixedDays: []
    })),
    // 1 OSS PART TIME 50%
    {
      id: '24',
      firstName: "OSS24",
      lastName: "PartTime50",
      forbiddenShiftTypes: [],
      type: ResourceType.PART_TIME_50,
      fixedDays: []
    },
    // 3 OSS PART TIME 70%
    ...Array.from({ length: 3 }, (_, i) => ({
      id: (25 + i).toString(),
      firstName: `OSS${25 + i}`,
      lastName: "PartTime70",
      forbiddenShiftTypes: [],
      type: ResourceType.PART_TIME_70,
      fixedDays: []
    }))
  ];

  // Lista mesi da Maggio ad Aprile
  const mesi = [
    { value: 4, label: "Maggio" },
    { value: 5, label: "Giugno" },
    { value: 6, label: "Luglio" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Settembre" },
    { value: 9, label: "Ottobre" },
    { value: 10, label: "Novembre" },
    { value: 11, label: "Dicembre" },
    { value: 0, label: "Gennaio" },
    { value: 1, label: "Febbraio" },
    { value: 2, label: "Marzo" },
    { value: 3, label: "Aprile" },
  ];

  // Funzione chiamata al cambio mese
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = parseInt(e.target.value, 10);
    // Qui puoi chiamare la funzione che preferisci, ad esempio:
    // aggiornaTurniPerMese(selectedMonth);
    setIsTableLoading(true);
    if (lastShiftRef.current.length === 0) {
      lastShiftRef.current = shiftRef.current; // Salva i turni del mese precedente
    }

    console.log("Mese selezionato:", selectedMonth);
    const lastShiftIndexByResource = getLastShiftIndexByResource(lastShiftRef.current);
    console.log("Ultimo indice di turno per risorsa:", lastShiftIndexByResource);
    const monthSchedule = replicateScheduleForMonth(shiftRef.current, resources, lastShiftIndexByResource, 2025, selectedMonth);
    console.log("Turni del mese selezionato:", monthSchedule);
    lastShiftRef.current = monthSchedule; // Salva i turni del mese selezionato nel ref
    initSchedule(monthSchedule);
    setIsTableLoading(false);
  };

  const initSchedule = (resourceShifts: ResourceShift[]) => {
    setIsLoading(true);
    console.log(resourceShifts);

    // Estrai tutte le date distinte ordinate
    const dateSet = new Set(resourceShifts.map(t => t.date));
    const dateArray = Array.from(dateSet).sort();
    setDateArray(dateArray);

    // Costruisci una mappa per accedere velocemente ai turni [risorsa][data] => turno
    const mappaTurni: Record<string, Record<string, ResourceShift>> = {};

    resources.forEach(resource => {
      mappaTurni[resource.id] = {};
    });

    resourceShifts.forEach((value: ResourceShift, index: number, array: ResourceShift[]) => {
      mappaTurni[value.resourceId][value.date] = value;
    });
    
    setMatrix(mappaTurni);
    setIsLoading(false);
  }

  const convertDateToString = (date: string): string => {
    let currDate = new Date(date);
    const dateTxt: string = currDate.toLocaleDateString('it-IT', {day: "2-digit", month: "short"});
    return dateTxt;
  }

  useEffect(() => {
    const startDate = new Date(2025, 4, 1, 0, 0, 0, 0); // Inizio del mese corrente
    const monthSchedule = generateShift(startDate, resources);
    setShifts(monthSchedule);
    shiftRef.current = monthSchedule; // Salva i turni generati nel ref
    initSchedule(monthSchedule);
  }, []);

  // Drag type
  const CELL_TYPE = "CELL";

  // Cell renderer with drag-and-drop
  const DraggableCell = memo(function DraggableCell({ rowIdx, colIdx, value, onCellDrop, coloriTurni }: any) {
    const [{ isDragging }, drag] = useDrag({
      type: "CELL",
      item: { rowIdx, colIdx, value },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });

    const [, drop] = useDrop({
      accept: "CELL",
      drop: (item: any) => {
        if (item.rowIdx !== rowIdx || item.colIdx !== colIdx) {
          onCellDrop(item.rowIdx, item.colIdx, rowIdx, colIdx);
        }
      }
    });

    // FIX: use a callback ref that returns void, not a React element
    const setRef = (node: HTMLDivElement | null) => {
      drag(drop(node));
    };

    return (
      <div
        ref={setRef}
        style={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: value && value.shiftType ? coloriTurni[value.shiftType] : undefined,
          cursor: "move",
          minWidth: CELL_WIDTH,
          maxWidth: CELL_WIDTH,
          width: CELL_WIDTH,
          minHeight: CELL_HEIGHT,
          maxHeight: CELL_HEIGHT,
          height: CELL_HEIGHT,
          fontSize: "1.1rem",
          padding: 0,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          fontWeight: 600,
          userSelect: "none",
          color: value && value.shiftType === "Free" ? "#6b7280" : "#18181b",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          overflow: "hidden"
        }}
        title={value && value.shiftType ? value.shiftType.toString() : ""}
      >
        {value && value.floor > 0
          ? `${value.shiftType} Piano: ${value.floor}`
          : value && value.shiftType
            ? value.shiftType
            : ""}
      </div>
    );
  });

  // COLUMNS
  const columns = useMemo(() => [
    {
      key: "resourceName",
      name: "Risorsa",
      width: CELL_WIDTH,
      render: (row: any) => (
        <span style={{
          fontWeight: 700,
          fontSize: "1.1rem",
          minWidth: CELL_WIDTH,
          maxWidth: CELL_WIDTH,
          width: CELL_WIDTH,
          color: "#18181b",
          display: "block",
          textAlign: "center"
        }}>{row.resourceName}</span>
      )
    },
    ...dateArray.map((date, colIdx) => ({
      key: date,
      name: convertDateToString(date),
      width: CELL_WIDTH,
      render: (row: any, rowIdx: number) => (
        <DraggableCell
          rowIdx={rowIdx}
          colIdx={colIdx + 1}
          value={row[date]}
          onCellDrop={handleCellDrop}
          coloriTurni={coloriTurni}
        />
      )
    }))
  ], [dateArray, coloriTurni]);

  // ROWS
  const rows = useMemo(() =>
    resources.map((resource, rowIdx) => {
      const row: any = { resourceName: resource.firstName };
      dateArray.forEach(date => {
        row[date] = matrix[resource.id]?.[date];
      });
      return row;
    }), [resources, dateArray, matrix]);

  function handleCellDrop(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    if (fromCol === 0 || toCol === 0) return;
    const fromResource = resources[fromRow];
    const toResource = resources[toRow];
    const fromDate = dateArray[fromCol - 1];
    const toDate = dateArray[toCol - 1];

    const newMatrix = { ...matrix };
    const temp = newMatrix[fromResource.id][fromDate];
    newMatrix[fromResource.id][fromDate] = newMatrix[toResource.id][toDate];
    newMatrix[toResource.id][toDate] = temp;
    setMatrix(newMatrix);
  }

  if (isLoading)
    return <div className="p-4">Caricamento in corso...</div>;

  return (
    <div className="p-4 overflow-auto">
      <h2 className="text-xl font-semibold mb-4">Turni OSS - Maggio 2025 (Copertura fissa)</h2>
      {/* ComboBox dei mesi */}
      <div className="mb-4">
        <label htmlFor="mese" className="mr-2 font-medium">Seleziona mese:</label>
        <select
          id="mese"
          className="border rounded p-2"
          defaultValue={4}
          onChange={handleMonthChange}
        >
          {mesi.map(mese => (
            <option className="text-black" key={mese.value} value={mese.value}>{mese.label}</option>
          ))}
        </select>
      </div>
      {
        !isTableLoading ?
          <DndProvider backend={HTML5Backend}>
            <div style={{ width: "100%", height: "80vh", background: "#fff" }}>
              <TableVirtuoso
                style={{ height: "100%", width: "100%" }}
                data={rows}
                fixedHeaderContent={() => (
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={col.key} style={{
                        minWidth: CELL_WIDTH,
                        maxWidth: CELL_WIDTH,
                        width: CELL_WIDTH,
                        background: "#f1f5f9",
                        position: idx === 0 ? "sticky" : undefined,
                        left: idx === 0 ? 0 : undefined,
                        zIndex: idx === 0 ? 2 : 1,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#18181b",
                        height: CELL_HEIGHT,
                        textAlign: "center"
                      }}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                )}
                itemContent={(rowIdx, row) => (
                  columns.map((col, colIdx) => (
                    <td key={col.key} style={{
                      minWidth: CELL_WIDTH,
                      maxWidth: CELL_WIDTH,
                      width: CELL_WIDTH,
                      background: colIdx === 0 ? "#fff" : undefined,
                      position: colIdx === 0 ? "sticky" : undefined,
                      left: colIdx === 0 ? 0 : undefined,
                      zIndex: colIdx === 0 ? 1 : undefined,
                      padding: 0,
                      height: CELL_HEIGHT,
                      textAlign: "center",
                      verticalAlign: "middle",
                      overflow: "hidden"
                    }}>
                      {col.render ? col.render(row, rowIdx) : row[col.key]}
                    </td>
                  ))
                )}
              />
            </div>
          </DndProvider>
          :
          <div className="p-4">Caricamento in corso...</div>
      }
    </div>
  );
}