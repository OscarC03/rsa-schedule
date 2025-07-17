"use client";

import { generateShift, getLastShiftIndexByResource, replicateScheduleForMonth } from "@/Application Code/Shift Management/ShiftManagement";
import { ResourceShift, ResourceType, ShiftType, AbsenceType } from "@/model/model";
import { useEffect, useRef, useState, useMemo } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useReactToPrint } from "react-to-print";
import {
  EditableCell,
  HeaderToolbar,
  LoadingScreen,
  ShiftSummaryBar,
  CELL_HEIGHT,
  CELL_WIDTH,
  coloriTurni,
  initialMonth,
  initialYear,
  mesi,
  resources,
  loadMatrixFromLocalStorage,
  saveMatrixToLocalStorage,
  convertDateToString
} from "@/Components";

// Temporary PrintableTable component - inline for now
const PrintableTable = ({ columns, rows, selectedMonth }: {
  columns: any[];
  rows: any[];
  selectedMonth: number;
}) => {
  // Calcola la larghezza della cella per la stampa in base al numero di colonne
  // in modo che tutto si adatti in una singola pagina
  const printCellWidth = Math.max(30, Math.min(60, Math.floor(700 / columns.length)));
    // Mappa delle abbreviazioni per i turni
  const abbreviations: Record<string, string> = {
    Morning: 'M',
    MorningI: 'MI',
    Afternoon: 'A', 
    Split: 'S',
    Night: 'N',
    Free: 'F',
    Ferie: 'FE',
    Permesso: 'PE',
    Malattia: 'MA',
    RiposoCompensativo: 'RC',
    Riposo: 'R',
    RiposoCambioDivisa: 'RCD'
  };
    // Funzione per estrarre solo il giorno dalla data (senza il mese)
  const extractOnlyDay = (date: string): string => {
    const currDate = new Date(date);
    return currDate.getDate().toString(); // Ottiene solo il giorno come numero
  };

  // Funzione per convertire il piano in testo per la stampa
  const getFloorText = (floor: number): string => {
    if (floor === 3) return "RA";
    if (floor === 0) return "";
    return floor.toString();
  };
  
  return (
    <div style={{ padding: "10px", width: "100%" }}>
      <h2 style={{ textAlign: "center", marginBottom: "12px", fontSize: "14pt" }}>
        Turni OSS - {mesi.find(m => m.value === selectedMonth)?.label || 'Mensile'}
      </h2>
        {/* Legenda abbreviazioni */}
      <div style={{ textAlign: "center", marginBottom: "10px", fontSize: "8pt" }}>
        <span style={{ marginRight: "8px" }}><strong>M</strong>=Mattina</span>
        <span style={{ marginRight: "8px" }}><strong>MI</strong>=Mattina Inf.</span>
        <span style={{ marginRight: "8px" }}><strong>A</strong>=Pomeriggio</span>
        <span style={{ marginRight: "8px" }}><strong>S</strong>=Spezzato</span>
        <span style={{ marginRight: "8px" }}><strong>N</strong>=Notte</span>
        <span style={{ marginRight: "8px" }}><strong>F</strong>=Libero</span>
        <br />
        <span style={{ marginRight: "8px" }}><strong>FE</strong>=Ferie</span>
        <span style={{ marginRight: "8px" }}><strong>PE</strong>=Permesso</span>
        <span style={{ marginRight: "8px" }}><strong>MA</strong>=Malattia</span>
        <span style={{ marginRight: "8px" }}><strong>RC</strong>=Riposo Comp.</span>
        <span style={{ marginRight: "8px" }}><strong>R</strong>=Riposo</span>
        <span><strong>RCD</strong>=Riposo C.D.</span>
      </div>
      
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  width: `${printCellWidth}px`,
                  background: "#eef2ff",
                  color: "#3730a3",
                  fontWeight: 700,
                  padding: "2px",
                  textAlign: "center",
                  borderBottom: "1px solid #6366f1",
                  fontSize: "8pt",
                  overflow: "hidden"
                }}
              >
                {idx === 0 ? col.name : extractOnlyDay(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col, colIdx) => (
                <td
                  key={col.key}
                  style={{
                    padding: "1px",
                    textAlign: "center",
                    borderBottom: "1px solid #e5e7eb",
                    borderRight: "1px solid #e5e7eb",
                    height: "20px",
                    maxWidth: `${printCellWidth}px`,
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {colIdx === 0 ? (
                    <span style={{
                      fontWeight: 700,
                      fontSize: "8pt",
                      color: "#18181b"
                    }}>{row[col.key]}</span>
                  ) : (
                    <div style={{
                      backgroundColor: row[col.key]?.absence
                        ? coloriTurni[row[col.key].absence]
                        : row[col.key]?.shiftType
                          ? coloriTurni[row[col.key].shiftType as ShiftType]
                          : undefined,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: row[col.key]?.shiftType === "Free" ? "#6b7280" : "#18181b",
                      fontWeight: 600,
                      fontSize: "8pt"
                    }}>
                      {row[col.key]?.absence ? (
                        // Se assenza parziale (<8h), mostra turno (anche Riposo) + assenza
                        (typeof row[col.key].absenceHours === "number" && row[col.key].absenceHours > 0 && row[col.key].absenceHours < 8)
                          ? (
                            <>                              {row[col.key].shiftType
                                ? (row[col.key].floor > 0
                                    ? `${abbreviations[row[col.key].shiftType]}${getFloorText(row[col.key].floor)} + `
                                    : `${abbreviations[row[col.key].shiftType]} + `)
                                : ""}
                              {abbreviations[row[col.key].absence]}
                              {`(${row[col.key].absenceHours}h)`}
                            </>
                          )
                          // Se assenza totale (ore non specificate o 8), mostra solo assenza
                          : (
                            <>
                              {abbreviations[row[col.key].absence]}
                              {typeof row[col.key].absenceHours === "number" && row[col.key].absenceHours > 0
                                ? `(${row[col.key].absenceHours}h)` : ""}
                            </>
                          )                      ) : (
                        row[col.key]?.shiftType
                          ? (row[col.key].floor > 0
                              ? `${abbreviations[row[col.key].shiftType]}${getFloorText(row[col.key].floor)}`
                              : abbreviations[row[col.key].shiftType])
                          : ""
                      )}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function Page() {
  const [shifts, setShifts] = useState<ResourceShift[]>([]);
  const shiftRef = useRef<ResourceShift[]>([]);
  const lastShiftRef = useRef<ResourceShift[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, ResourceShift>>>({});
  const [dateArray, setDateArray] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const printTableRef = useRef<HTMLDivElement>(null);
  // Aggiungi stato per controllo visibilità della tabella di stampa
  const [isPrintingView, setIsPrintingView] = useState(false);  const printableTableRef = useRef<HTMLDivElement>(null);

  // Stato per mese/anno selezionato
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  // Inizializza la matrice per il mese/anno selezionato
  const initSchedule = (
    resourceShifts: ResourceShift[],
    persist = true,
    year = selectedYear,
    month = selectedMonth
  ) => {
    setIsLoading(true);

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
    if (persist) saveMatrixToLocalStorage(mappaTurni, year, month);    setIsLoading(false);
  }

  useEffect(() => {
    // All'avvio mostra Maggio 2025
    const year = selectedYear;
    const month = selectedMonth;
    let loadedMatrix = loadMatrixFromLocalStorage(year, month);
    if (loadedMatrix) {
      // Ricostruisci dateArray da matrix
      const allDates = Object.values(loadedMatrix)
        .flatMap(obj => Object.keys(obj));
      const dateSet = new Set(allDates);
      const dateArray = Array.from(dateSet).sort();
      setDateArray(dateArray);
      setMatrix(loadedMatrix);
      setIsLoading(false);
    } else {
      // Se non c'è, genera i turni per Maggio 2025
      const startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const monthSchedule = generateShift(startDate, resources);
      setShifts(monthSchedule);
      shiftRef.current = monthSchedule;
      initSchedule(monthSchedule, true, year, month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo all'avvio

  // Cambio mese
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = parseInt(e.target.value, 10);
    setSelectedMonth(selectedMonth);
    setIsTableLoading(true);

    const year = selectedYear;
    const month = selectedMonth;

    // Prova a caricare la matrice del mese selezionato
    let loadedMatrix = loadMatrixFromLocalStorage(year, selectedMonth);
    if (loadedMatrix) {
      // Ricostruisci dateArray da matrix
      const allDates = Object.values(loadedMatrix)
        .flatMap(obj => Object.keys(obj));
      const dateSet = new Set(allDates);
      const dateArray = Array.from(dateSet).sort();
      setDateArray(dateArray);
      setMatrix(loadedMatrix);
      setIsTableLoading(false);
    } else {
      // Se non c'è, genera la matrice tramite replicateScheduleForMonth con i turni del mese precedente
      // Trova il mese precedente (gestendo Gennaio)
      let prevMonth = selectedMonth - 1;
      let prevYear = year;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = year - 1;
      }
      let prevMatrix = loadMatrixFromLocalStorage(prevYear, prevMonth);
      let prevShifts: ResourceShift[] = [];
      if (prevMatrix) {
        // Ricostruisci array di ResourceShift dal matrix
        prevShifts = Object.values(prevMatrix).flatMap(obj => Object.values(obj));
      } else {
        // Se non c'è nemmeno il mese precedente, genera da zero
        const prevStartDate = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
        prevShifts = generateShift(prevStartDate, resources);
      }
      const lastShiftIndexByResource = getLastShiftIndexByResource(prevShifts);
      const monthSchedule = replicateScheduleForMonth(
        prevShifts,
        resources,
        lastShiftIndexByResource,
        year,
        selectedMonth
      );
      lastShiftRef.current = monthSchedule;
      initSchedule(monthSchedule, true, year, selectedMonth);
      setIsTableLoading(false);
    }
  };

  // Drag type
  const CELL_TYPE = "CELL";

  // COLUMNS - Update to use the EditableCell component
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
        <EditableCell
          rowIdx={rowIdx}
          colIdx={colIdx + 1}
          value={row[date]}
          onCellDrop={handleCellDrop}
          coloriTurni={coloriTurni}
          onShiftChange={handleShiftTypeChange}
        />
      )
    }))
  ], [dateArray, coloriTurni]);

  // ROWS
  const rows = useMemo(() => {
    // Ordina le risorse: prima full-time, poi part-time (mantenendo l'ordine originale)
    const sortedResources = [
      ...resources.filter(r => r.type === ResourceType.FULL_TIME),
      ...resources.filter(r => r.type !== ResourceType.FULL_TIME)
    ];    return sortedResources.map((resource, rowIdx) => {
      const row: any = { resourceName: resource.firstName + ' ' + resource.lastName.charAt(0) + '.' };
      dateArray.forEach(date => {
        row[date] = matrix[resource.id]?.[date];
      });
      return row;
    });
  }, [resources, dateArray, matrix]);

  function handleCellDrop(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    if (fromCol === 0 || toCol === 0) return;
    const fromResource = resources[fromRow];
    const toResource = resources[toRow];
    const fromDate = dateArray[fromCol - 1];
    const toDate = dateArray[toCol - 1];

    // Deep copy solo delle righe coinvolte
    const newMatrix = { ...matrix };
    newMatrix[fromResource.id] = { ...newMatrix[fromResource.id] };
    newMatrix[toResource.id] = { ...newMatrix[toResource.id] };

    const temp = newMatrix[fromResource.id][fromDate];
    newMatrix[fromResource.id][fromDate] = newMatrix[toResource.id][toDate];
    newMatrix[toResource.id][toDate] = temp;

    setMatrix(newMatrix);
    saveMatrixToLocalStorage(newMatrix, selectedYear, selectedMonth);
  }

  function handleShiftTypeChange(
    rowIdx: number,
    colIdx: number,
    shiftType: ShiftType,
    floor: number = 0,
    absence?: AbsenceType,
    absenceHours?: number
  ) {
    if (colIdx === 0) return; // Skip resource name column

    const resource = resources[rowIdx];
    const date = dateArray[colIdx - 1];
    const oldShift = matrix[resource.id][date];

    if (!oldShift) return;

    const newShift: ResourceShift = {
      ...oldShift,
      shiftType: shiftType,
      floor: (shiftType === ShiftType.Free || shiftType === ShiftType.MorningI || absence) ? 0 : floor,
      absence: absence,
      absenceHours: absence ? absenceHours : undefined
    };

    // Deep copy della riga della risorsa
    const newMatrix = { ...matrix };
    newMatrix[resource.id] = { ...newMatrix[resource.id], [date]: newShift };    setMatrix(newMatrix);
    saveMatrixToLocalStorage(newMatrix, selectedYear, selectedMonth);
  }

  // Funzione di stampa migliorata
  const handlePrint = useReactToPrint({
    contentRef: printableTableRef,
    documentTitle: `Turni OSS - ${mesi.find(m => m.value === selectedMonth)?.label || 'Mensile'}`,
    onBeforePrint: () => {
      setIsPrintingView(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrintingView(false);
    },
    pageStyle: `
      @page {
        size: landscape;
        margin: 4mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table {
          width: 100% !important;
          table-layout: fixed !important;
          font-size: 7pt !important;
        }
        th, td {
          padding: 1px !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
        h2 {
          margin-top: 0 !important;
          margin-bottom: 5px !important;
        }
        div {
          page-break-inside: avoid !important;
        }
      }
    `,  });

  // Funzione per convertire il piano in testo per la stampa
  const getFloorText = (floor: number): string => {
    if (floor === 3) return "RA";
    if (floor === 0) return "";
    return floor.toString();
  };

  if (isLoading)
    return <LoadingScreen />;

  return (
    <div
      className="p-0 sm:p-0 overflow-auto"
      style={{
        background: "linear-gradient(120deg, #f1f5f9 0%, #e0e7ff 100%)",
        minHeight: "100vh",
        minWidth: "100vw",
        height: "100vh",
        width: "100vw",
        borderRadius: 0,
        boxShadow: "none",
        margin: 0,
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0,
        display: "flex",
        flexDirection: "column",
      }}    >      <HeaderToolbar 
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onPrint={handlePrint}
      />

      <ShiftSummaryBar 
        matrix={matrix}
        selectedMonth={selectedMonth}
        mesi={mesi}
      />

      <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {
          !isTableLoading ? (
            <DndProvider backend={HTML5Backend}>
              <div
                ref={printTableRef}
                style={{
                  width: "100vw",
                  height: "100%",
                  background: "rgba(255,255,255,0.98)",
                  borderRadius: 0,
                  boxShadow: "none",
                  overflow: "auto",
                  padding: 0,
                  margin: 0,
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <TableVirtuoso
                  style={{
                    height: "100%",
                    width: "100vw",
                    fontFamily: "inherit",
                    fontSize: "1.05rem",
                    background: "transparent",
                  }}
                  data={rows}
                  fixedHeaderContent={() => (
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={col.key}
                          style={{
                            minWidth: CELL_WIDTH,
                            maxWidth: CELL_WIDTH,
                            width: CELL_WIDTH,
                            background: "linear-gradient(90deg, #eef2ff 0%, #f1f5f9 100%)",
                            position: idx === 0 ? "sticky" : undefined,
                            left: idx === 0 ? 0 : undefined,
                            zIndex: idx === 0 ? 2 : 1,
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: "#3730a3",
                            height: CELL_HEIGHT,
                            textAlign: "center",
                            borderBottom: "2px solid #6366f1",
                            borderTopLeftRadius: idx === 0 ? 0 : 0,
                            borderTopRightRadius: idx === columns.length - 1 ? 0 : 0,
                            boxShadow: idx === 0 ? "2px 0 8px #e0e7ff" : undefined,
                            letterSpacing: "0.01em"
                          }}
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  )}
                  itemContent={(rowIdx, row) => (
                    columns.map((col, colIdx) => (
                      <td
                        key={col.key}
                        style={{
                          minWidth: CELL_WIDTH,
                          maxWidth: CELL_WIDTH,
                          width: CELL_WIDTH,
                          background: colIdx === 0 ? "#fff" : "transparent",
                          position: colIdx === 0 ? "sticky" : undefined,
                          left: colIdx === 0 ? 0 : undefined,
                          zIndex: colIdx === 0 ? 1 : undefined,
                          padding: 0,
                          height: CELL_HEIGHT,
                          textAlign: "center",
                          verticalAlign: "middle",
                          overflow: "hidden",
                          borderBottom: "1px solid #e5e7eb",
                          borderRight: colIdx === columns.length - 1 ? "none" : "1px solid #e5e7eb",
                          borderLeft: colIdx === 0 ? "none" : undefined,
                          backgroundClip: "padding-box",
                          transition: "background 0.2s"
                        }}
                      >
                        {col.render ? col.render(row, rowIdx) : row[col.key]}
                      </td>
                    ))
                  )}
                />
              </div>
            </DndProvider>
          ) : (
            <div
              className="p-4 flex items-center justify-center min-h-[40vh]"
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                color: "#6366f1",
                borderRadius: 0,
                background: "#eef2ff",
                boxShadow: "none",
                minHeight: "100%",
                height: "100%",
                width: "100vw",
              }}
            >
              Caricamento in corso...
            </div>
          )
        }
        {/* Responsive helper for mobile */}
        <div
          className="block sm:hidden mt-4 text-sm text-center"
          style={{
            color: "#6366f1",
            background: "#f1f5f9",
            borderRadius: 8,
            padding: "8px 12px",
            margin: "0 auto",
            maxWidth: 400,
            fontWeight: 500,
            boxShadow: "0 1px 4px #e0e7ff",
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: 700 }}>Suggerimento:</span> Scorri orizzontalmente per vedere tutti i giorni del mese.
        </div>
      </div>      {/* Tabella nascosta per la stampa */}
      <div style={{ display: "none" }}>
        <div ref={printableTableRef}>
          <PrintableTable 
            columns={columns}
            rows={rows}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  );
}