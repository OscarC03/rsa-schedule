"use client";

import { generateShift, getLastShiftIndexByResource, replicateScheduleForMonth } from "@/Application Code/Shift Management/ShiftManagement";
import { Resource, ResourceShift, ResourceType, ShiftType } from "@/model/model";
import { useEffect, useRef, useState, useMemo, memo } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactDOM from "react-dom";
import { useReactToPrint } from "react-to-print";

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

// Add this definition at the top with other constants
const shiftTypes: ShiftType[] = [ShiftType.Morning, ShiftType.Afternoon, ShiftType.Split, ShiftType.Night, ShiftType.Free];

// Add this new component for editable cells with double-click functionality
const EditableCell = memo(function EditableCell({
  rowIdx,
  colIdx,
  value,
  onCellDrop,
  coloriTurni,
  onShiftChange
}: {
  rowIdx: number;
  colIdx: number;
  value: ResourceShift | undefined;
  onCellDrop: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  coloriTurni: Record<ShiftType, string>;
  onShiftChange: (rowIdx: number, colIdx: number, shiftType: ShiftType, floor: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: CELL_TYPE,
    item: () => ({ rowIdx, colIdx, value }), // Using a function to get current value when dragging starts
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

  const [isEditing, setIsEditing] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Add state for selected shift type and floor
  const [selectedShift, setSelectedShift] = useState<ShiftType>(value?.shiftType || ShiftType.Free);
  const [selectedFloor, setSelectedFloor] = useState<number>(value?.floor || 0);
  
  // Floor options - changed to only 4 floors
  const floorOptions = [0, 1, 2, 3, 4];

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
    ref.current = node;
    drag(drop(node));
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get position for the menu
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Set initial values based on current cell value
    setSelectedShift(value?.shiftType || ShiftType.Free);
    setSelectedFloor(value?.floor || 0);
    
    // Calculate position with awareness of window boundaries
    const menuWidth = Math.max(CELL_WIDTH, 200); // Slightly increased for floor selection
    
    // Check if menu would overflow right edge of window
    const rightOverflow = (rect.left + menuWidth) > window.innerWidth;
    
    // Position the menu either to right or left of the click depending on space
    const xPos = rightOverflow ? 
      Math.max(5, rect.right - menuWidth) : // If overflow, align to right edge of cell
      rect.left;
    
    // Check if menu would overflow bottom edge (assuming ~280px height with floor selection)
    const menuHeight = 280;
    const bottomOverflow = (rect.bottom + menuHeight) > window.innerHeight;
    
    const yPos = bottomOverflow ?
      Math.max(5, rect.top - menuHeight) : // If overflow, place above the cell
      rect.bottom;
    
    setMenuPosition({
      x: xPos,
      y: yPos
    });
    
    setIsEditing(true);
  };
  
  // Handle shift type selection
  const handleShiftTypeSelect = (shiftType: ShiftType) => {
    setSelectedShift(shiftType);
    
    // Automatically set floor to 0 for Free shift type
    if (shiftType === ShiftType.Free) {
      setSelectedFloor(0);
    }
  };
  
  // Handle floor selection
  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
  };
  
  // Handle final selection confirmation
  const handleConfirmSelection = () => {
    onShiftChange(rowIdx, colIdx, selectedShift, selectedFloor);
    setIsEditing(false);
  };
  
  const closeMenu = () => setIsEditing(false);

  return (
    <>
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
          textAlign: "center"
        }}
        title={value && value.shiftType ? value.shiftType.toString() : ""}
        onDoubleClick={handleDoubleClick}
      >
        {display}
      </div>
      
      {isEditing && document.body && ReactDOM.createPortal(
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            width: "auto",
            minWidth: CELL_WIDTH,
            maxWidth: "250px",
            backgroundColor: "white",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
            borderRadius: 8,
            zIndex: 10000,
            padding: "12px",
            border: "2px solid #4f46e5"
          }}
        >
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 8
          }}>
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "#4f46e5" }}>
              Seleziona tipo turno
            </div>
            {shiftTypes.map(type => (
              <button
                key={type}
                onClick={() => handleShiftTypeSelect(type)}
                style={{
                  backgroundColor: selectedShift === type ? coloriTurni[type] : "#fff",
                  border: `1px solid ${coloriTurni[type]}`,
                  textAlign: "center",
                  padding: "10px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: type === "Free" ? "#6b7280" : "#18181b",
                  transition: "all 0.2s ease",
                  boxShadow: selectedShift === type ? "0 2px 5px rgba(0,0,0,0.1)" : "none"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                }}
                onMouseOut={(e) => {
                  if (selectedShift !== type) {
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {type}
              </button>
            ))}
            
            {/* Floor selection - only show if not Free shift */}
            {selectedShift !== ShiftType.Free && (
              <>
                <div style={{ fontWeight: 700, marginTop: "12px", marginBottom: "4px", color: "#4f46e5" }}>
                  Seleziona piano
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(3, 1fr)", 
                  gap: "8px" 
                }}>
                  {floorOptions.map(floor => (
                    <button
                      key={floor}
                      onClick={() => handleFloorSelect(floor)}
                      style={{
                        backgroundColor: selectedFloor === floor ? "#e0e7ff" : "#fff",
                        border: "1px solid #d1d5db",
                        textAlign: "center",
                        padding: "8px 4px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                        color: "#18181b",
                        transition: "all 0.2s ease",
                        boxShadow: selectedFloor === floor ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                      }}
                      onMouseOut={(e) => {
                        if (selectedFloor !== floor) {
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {floor === 0 ? "Nessuno" : floor.toString()}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <div style={{ 
              display: "flex", 
              gap: "8px",
              marginTop: "12px"
            }}>
              <button
                onClick={handleConfirmSelection}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "#4f46e5",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#ffffff",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#4338ca";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#4f46e5";
                }}
              >
                Conferma
              </button>
              <button
                onClick={closeMenu}
                style={{
                  padding: "8px",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#4b5563",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#e0e0e0";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
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
  const [selectedMonth, setSelectedMonth] = useState<number>(4);
  const printTableRef = useRef<HTMLDivElement>(null);
  // Aggiungi stato per controllo visibilità della tabella di stampa
  const [isPrintingView, setIsPrintingView] = useState(false);
  const printableTableRef = useRef<HTMLDivElement>(null);
  
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
    setSelectedMonth(selectedMonth); // Aggiungi questa riga per tenere traccia del mese selezionato
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
      item: () => ({ rowIdx, colIdx, value }), // Using a function to get current value when dragging starts
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

  function handleShiftTypeChange(rowIdx: number, colIdx: number, shiftType: ShiftType, floor: number = 0) {
    if (colIdx === 0) return; // Skip resource name column
    
    const resource = resources[rowIdx];
    const date = dateArray[colIdx - 1];
    const oldShift = matrix[resource.id][date];
    
    if (!oldShift) return;
    
    // Create a new shift with the selected shift type and floor
    // If shift type is Free, ensure floor is 0
    const newShift: ResourceShift = { 
      ...oldShift, 
      shiftType, 
      floor: shiftType === ShiftType.Free ? 0 : floor 
    };
    
    // Update the matrix with the new shift
    const newMatrix = { ...matrix };
    newMatrix[resource.id] = { ...newMatrix[resource.id], [date]: newShift };
    setMatrix(newMatrix);
  }

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

  // Componente tabella statica per la stampa
  const PrintableTable = () => {
    // Calcola la larghezza della cella per la stampa in base al numero di colonne
    // in modo che tutto si adatti in una singola pagina
    const printCellWidth = Math.max(30, Math.min(60, Math.floor(700 / columns.length)));
    
    // Mappa delle abbreviazioni per i turni
    const abbreviations: Record<ShiftType, string> = {
      Morning: 'M',
      Afternoon: 'A', 
      Split: 'S',
      Night: 'N',
      Free: 'F'
    };
    
    // Funzione per estrarre solo il giorno dalla data (senza il mese)
    const extractOnlyDay = (date: string): string => {
      const currDate = new Date(date);
      return currDate.getDate().toString(); // Ottiene solo il giorno come numero
    };
    
    return (
      <div style={{ padding: "10px", width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "12px", fontSize: "14pt" }}>
          Turni OSS - {mesi.find(m => m.value === selectedMonth)?.label || 'Mensile'}
        </h2>
        
        {/* Legenda abbreviazioni */}
        <div style={{ textAlign: "center", marginBottom: "10px", fontSize: "8pt" }}>
          <span style={{ marginRight: "8px" }}><strong>M</strong>=Mattina</span>
          <span style={{ marginRight: "8px" }}><strong>A</strong>=Pomeriggio</span>
          <span style={{ marginRight: "8px" }}><strong>S</strong>=Spezzato</span>
          <span style={{ marginRight: "8px" }}><strong>N</strong>=Notte</span>
          <span><strong>F</strong>=Libero</span>
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
                        backgroundColor: row[col.key]?.shiftType ? coloriTurni[row[col.key].shiftType as ShiftType] : undefined,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: row[col.key]?.shiftType === "Free" ? "#6b7280" : "#18181b",
                        fontWeight: 600,
                        fontSize: "8pt"
                      }}>
                        {row[col.key]?.shiftType ? 
                          // Usa solo l'iniziale del tipo di turno e il piano se presente
                          row[col.key].floor > 0
                            ? `${abbreviations[row[col.key].shiftType as ShiftType]}${row[col.key].floor}`
                            : abbreviations[row[col.key].shiftType as ShiftType]
                          : ""}
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
    `,
  });

  if (isLoading)
    return (
      <div
        className="p-4 flex items-center justify-center min-h-[100vh] bg-gradient-to-br from-indigo-100 via-white to-blue-100"
        style={{
          fontSize: "1.3rem",
          fontWeight: 600,
          color: "#6366f1",
          borderRadius: 0,
          boxShadow: "none",
          minHeight: "100vh",
          height: "100vh",
          width: "100vw",
        }}
      >
        Caricamento in corso...
      </div>
    );

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
      }}
    >
      {/* ComboBox dei mesi e pulsante stampa */}
      <div
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderRadius: 0,
          padding: "16px 18px",
          boxShadow: "0 2px 8px rgba(79,70,229,0.04)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <h2
          className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-0"
          style={{
            color: "#3730a3",
            letterSpacing: "0.01em",
            textShadow: "0 1px 0 #fff, 0 2px 8px #e0e7ff",
            lineHeight: 1.2,
          }}
        >
          Turni OSS <span style={{
            fontWeight: 400,
            fontSize: "1rem",
            color: "#6366f1",
            background: "#eef2ff",
            borderRadius: 6,
            padding: "2px 10px",
            marginLeft: 8,
            letterSpacing: "0.02em"
          }}>(Copertura fissa)</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label
            htmlFor="mese"
            className="mr-2 font-medium"
            style={{
              color: "#3730a3",
              fontSize: "1.05rem",
              letterSpacing: "0.01em"
            }}
          >
            Seleziona mese:
          </label>
          <select
            id="mese"
            className="border rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-150 text-base"
            style={{
              background: "#fff",
              color: "#3730a3",
              fontWeight: 500,
              borderColor: "#c7d2fe",
              minWidth: 120,
              boxShadow: "0 1px 4px rgba(79,70,229,0.06)",
              cursor: "pointer"
            }}
            defaultValue={4}
            onChange={handleMonthChange}
          >
            {mesi.map(mese => (
              <option className="text-black" key={mese.value} value={mese.value}>{mese.label}</option>
            ))}
          </select>
          
          {/* Pulsante per la stampa */}
          <button
            onClick={handlePrint}
            className="ml-2 flex items-center justify-center gap-1 px-4 py-2 rounded transition-all duration-200"
            style={{
              background: "#4f46e5",
              color: "white",
              fontWeight: 600,
              boxShadow: "0 1px 4px rgba(79,70,229,0.2)",
              border: "none",
              cursor: "pointer",
              minHeight: 40
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#4338ca";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(79,70,229,0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#4f46e5";
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(79,70,229,0.2)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z" />
              <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
            </svg>
            Stampa orario
          </button>
        </div>
      </div>

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
      </div>
      
      {/* Tabella nascosta per la stampa */}
      <div style={{ display: "none" }}>
        <div ref={printableTableRef}>
          <PrintableTable />
        </div>
      </div>
    </div>
  );
}