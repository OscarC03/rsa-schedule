"use client";

import { memo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ReactDOM from "react-dom";
import { ResourceShift, ShiftType, AbsenceType, Resource, Days, ResourceType } from "@/model/model";
import { CELL_TYPE, CELL_HEIGHT, CELL_WIDTH, shiftTypes, absenceTypes, italianNames, getColorsForDate } from "./constants";

interface EditableCellProps {
  rowIdx: number;
  colIdx: number;
  value: ResourceShift | undefined;
  resource: Resource;
  currentDate: string;
  selectedYear: number;
  selectedMonth: number;
  onCellDrop: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  onShiftChange: (rowIdx: number, colIdx: number, shiftType: ShiftType, floor: number, absence?: AbsenceType, absenceHours?: number) => void;
  onShiftColorChange?: (rowIdx: number, colIdx: number, customColor?: string) => void;
}

export const EditableCell = memo(function EditableCell({
  rowIdx,
  colIdx,
  value,
  resource,
  currentDate,
  selectedYear,
  selectedMonth,
  onCellDrop,
  onShiftChange,
  onShiftColorChange
}: EditableCellProps) {
  // Get colors for this specific date
  const coloriTurni = getColorsForDate(currentDate, selectedYear, selectedMonth);
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
  const [selectedFloor, setSelectedFloor] = useState<number>(value?.floor || 0);  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceType | undefined>(value?.absence);
  const [absenceHours, setAbsenceHours] = useState<number | undefined>(value?.absenceHours);

  // Helper function to convert JavaScript day of week to our Days enum
  const getJSDayOfWeek = (date: Date): Days => {
    const jsDay = date.getDay(); // Sunday = 0, Monday = 1, etc.
    // Convert to our enum: Monday = 1, Tuesday = 2, ..., Sunday = 7
    return jsDay === 0 ? Days.Sunday : jsDay as Days;
  };
  // Helper function to check if a resource should work on a specific date
  const shouldResourceWork = (resource: Resource, dateStr: string): boolean => {
    // Full-time resources work every day
    if (resource.type === ResourceType.FULL_TIME) {
      return true;
    }
    
    // Part-time resources work only on their fixed days
    if (resource.fixedDays.length === 0) {
      return true; // If no fixed days specified, assume they can work any day
    }
    
    const date = new Date(dateStr);
    const dayOfWeek = getJSDayOfWeek(date);
    return resource.fixedDays.includes(dayOfWeek);
  };

  // Check if this is a non-working day for part-time employee
  const isNonWorkingDay = !shouldResourceWork(resource, currentDate);

  // Floor options - aggiornato per i nuovi piani (1, 2, 3=RA)
  const floorOptions = [0, 1, 2, 3];

  // Funzione helper per convertire il numero del piano nel nome
  const getFloorName = (floor: number): string => {
    if (floor === 3) return "RA";
    if (floor === 0) return "";
    return floor.toString();
  };
  // Visualizzazione nome turno e piano in italiano nella cella
  let display = "";
  if (value && typeof value === "object" && value !== null) {
    if (value.absence) {
      // Se ci sono ore di assenza parziali (<8), mostra sia turno che assenza
      if (typeof value.absenceHours === "number" && value.absenceHours > 0 && value.absenceHours < 8) {        // Mostra turno (anche Riposo) + assenza parziale
        if (value.shiftType) {
          const name = italianNames[value.shiftType as ShiftType] || value.shiftType;
          const floorName = getFloorName(value.floor);
          display = floorName ? `${name} (${floorName})` : name;
          display += ` + ${italianNames[value.absence] || value.absence} (${value.absenceHours}h)`;
        } else {
          display = `${italianNames[value.absence] || value.absence} (${value.absenceHours}h)`;
        }
      } else {
        // Se non sono specificate le ore o sono 8, mostra solo assenza (tutto il giorno)
        display = `${italianNames[value.absence] || value.absence}`;
        if (typeof value.absenceHours === "number" && value.absenceHours > 0) {
          display += ` (${value.absenceHours}h)`;
        }
      }
    } else if (typeof value.shiftType === "string") {
      // Gestione speciale per risorse part-time nei giorni di non lavoro
      if (value.shiftType === ShiftType.Free && isNonWorkingDay) {
        display = "Non previsto";
      } else {
        // Mostra sempre il turno, anche "Riposo"
        const name = italianNames[value.shiftType as ShiftType] || value.shiftType;
        const floorName = getFloorName(value.floor);
        display = floorName ? `${name} (${floorName})` : name;
      }
    }
  }

  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node;
    drag(drop(node));
  };
  // Apri il pannello laterale a destra invece che posizionare il menu vicino alla cella
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedShift(value?.shiftType || ShiftType.Free);
    setSelectedFloor(value?.floor || 0);
    setSelectedAbsence(value?.absence);
    setIsEditing(true);
  };
  // Handle right click for color customization
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShiftColorChange && value) {
      // Trigger color customization modal via parent component
      onShiftColorChange(rowIdx, colIdx, value.customColor);
    }
  };
  
  // Handle shift type selection
  const handleShiftTypeSelect = (shiftType: ShiftType) => {
    setSelectedShift(shiftType);
    setSelectedAbsence(undefined);
    // Automatically set floor to 0 for Free shift type
    if (shiftType === ShiftType.Free) {
      setSelectedFloor(0);
    }
  };
  
  // Handle absence selection
  const handleAbsenceSelect = (absence: AbsenceType) => {
    setSelectedAbsence(absence);
    // Non cambiare il turno selezionato, lascia quello già presente
    // setSelectedShift(ShiftType.Free); // RIMUOVI questa riga!
    setSelectedFloor(0);
    setAbsenceHours(undefined); // reset ore assenza
  };
  
  // Handle floor selection
  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
  };
  
  // Handle final selection confirmation
  const handleConfirmSelection = () => {
    onShiftChange(
      rowIdx,
      colIdx,
      selectedShift,
      (selectedShift === ShiftType.MorningI || selectedShift === ShiftType.Free || selectedAbsence) ? 0 : selectedFloor,
      selectedAbsence,
      selectedAbsence ? absenceHours : undefined
    );
    setIsEditing(false);
  };
  
  const closeMenu = () => setIsEditing(false);
  // Get the background color - prioritize custom color if available
  const getBackgroundColor = () => {
    if (value?.customColor) {
      return value.customColor;
    }
    if (value?.absence) {
      return coloriTurni[value.absence];
    }
    if (value?.shiftType) {
      if (value.shiftType === ShiftType.Free && isNonWorkingDay) {
        return "#f8f9fa"; // Light gray for non-working days
      }
      return coloriTurni[value.shiftType];
    }
    return undefined;
  };

  return (
    <>      <div
        ref={setRef}
        style={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: getBackgroundColor(),
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
          border: value?.customColor ? "2px solid #6366f1" : "1px solid #e5e7eb",
          textAlign: "center",
          position: "relative"
        }}        title={`${value && value.shiftType ? value.shiftType.toString() : ""} • Click destro: personalizza colore • Doppio click: modifica turno`}
        onContextMenu={handleRightClick}
        onDoubleClick={handleDoubleClick}
      >
        {display}
        {value?.customColor && (
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '6px',
            height: '6px',
            backgroundColor: '#6366f1',
            borderRadius: '50%',
            border: '1px solid #fff'
          }} />
        )}
      </div>
      {isEditing && document.body && ReactDOM.createPortal(
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: "min(98vw, 350px)",
            maxWidth: 400,
            minWidth: 220,
            backgroundColor: "white",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
            zIndex: 10000,
            padding: "24px 18px 18px 18px",
            borderLeft: "2px solid #4f46e5",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto"
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#4f46e5" }}>
              Modifica turno
            </div>
            <button
              onClick={closeMenu}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.7rem",
                color: "#6366f1",
                cursor: "pointer",
                marginLeft: 8,
                lineHeight: 1
              }}
              aria-label="Chiudi"
              title="Chiudi"
            >
              &times;
            </button>
          </div>
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#4f46e5" }}>
            Seleziona tipo turno
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16
          }}>
            {shiftTypes.map(type => (
              <button
                key={type}
                onClick={() => handleShiftTypeSelect(type)}
                style={{
                  backgroundColor: selectedAbsence ? "#fff" : (selectedShift === type ? coloriTurni[type] : "#fff"),
                  border: `1px solid ${coloriTurni[type]}`,
                  textAlign: "center",
                  padding: "10px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: type === "Free" ? "#6b7280" : "#18181b",
                  transition: "all 0.2s ease",
                  boxShadow: selectedShift === type ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
                  width: "100%",
                  fontSize: "1rem"
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
                {italianNames[type] || type}
              </button>
            ))}
          </div>
          {/* Sezione Assenze */}
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "#4f46e5" }}>
            Assenze
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16
          }}>
            {absenceTypes.map(type => (
              <button
                key={type}
                onClick={() => handleAbsenceSelect(type)}
                style={{
                  backgroundColor: selectedAbsence === type ? coloriTurni[type] : "#fff",
                  border: `1px solid ${coloriTurni[type]}`,
                  textAlign: "center",
                  padding: "10px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#18181b",
                  transition: "all 0.2s ease",
                  boxShadow: selectedAbsence === type ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
                  width: "100%",
                  fontSize: "1rem"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                }}
                onMouseOut={(e) => {
                  if (selectedAbsence !== type) {
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {italianNames[type] || type}
              </button>
            ))}
            {/* Campo input per le ore di assenza */}
            {selectedAbsence && (
              <input
                type="number"
                min={1}
                max={8}
                step={1}
                value={absenceHours ?? ""}
                onChange={e => setAbsenceHours(Number(e.target.value))}
                placeholder="Ore assenza"
                style={{
                  marginTop: 8,
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: "1rem",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              />
            )}
          </div>
          {/* Floor selection - solo se non Free, non MorningI e nessuna assenza */}
          {selectedShift !== ShiftType.Free && selectedShift !== ShiftType.MorningI && !selectedAbsence && (
            <>
              <div style={{ fontWeight: 700, marginTop: "12px", marginBottom: "4px", color: "#4f46e5" }}>
                Seleziona piano
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                marginBottom: 16
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
                      boxShadow: selectedFloor === floor ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      width: "100%",
                      fontSize: "1rem"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                    }}
                    onMouseOut={(e) => {
                      if (selectedFloor !== floor) {
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}                  >
                    {floor === 0 ? "Nessuno" : (floor === 3 ? "RA" : floor.toString())}
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{
            display: "flex",
            gap: "8px",
            marginTop: "auto"
          }}>
            <button
              onClick={handleConfirmSelection}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: "#4f46e5",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                color: "#ffffff",
                fontSize: "1.1rem",
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
                padding: "10px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                color: "#4b5563",
                fontSize: "1.1rem",
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
        </div>,
        document.body
      )}
    </>
  );
});
