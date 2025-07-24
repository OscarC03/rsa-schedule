"use client";

// Debug flag - set to false to disable debug logging in production
const DEBUG_MODE = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(message, data);
  }
};

const debugWarn = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.warn(message, data);  }
};

// Helper function to generate unique IDs for shifts
const generateShiftId = (): string => {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

import { generateShift, getLastShiftIndexByResource, replicateScheduleForMonth } from "@/Application Code/Shift Management/ShiftManagement";
import { ResourceShift, ResourceType, ShiftType, AbsenceType } from "@/model/model";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useReactToPrint } from "react-to-print";
import {
  EditableCell,
  HeaderToolbar,
  LoadingScreen,
  ShiftSummaryBar,
  ColorCustomizationModal,  ShiftColorCustomizationModal,
  CELL_HEIGHT,
  CELL_WIDTH,
  coloriTurni,
  italianNames,  initialMonth,
  initialYear,
  mesi,
  resources,
  loadMatrixFromDatabase,
  saveMatrixToDatabase,
  convertDateToString,
  getDayColorCustomizations,
  getColorsForDate
} from "@/Components";
import { ProtectedRoute } from "@/Components/ProtectedRoute";

// Enhanced PrintableTable component - optimized for A4 landscape printing with perfect readability
const PrintableTable = ({ columns, rows, selectedMonth, selectedYear }: {
  columns: any[];
  rows: any[];
  selectedMonth: number;
  selectedYear: number;
}) => {  // Calcola dimensioni ottimali per A4 landscape con leggibilità perfetta
  // A4 landscape: 297mm x 210mm, SENZA margini = area utile 297mm x 210mm
  const resourceColumnWidth = "32mm"; // Colonna risorsa ridotta per dare più spazio ai giorni
  const dateColumnsCount = columns.length - 1;
  const remainingWidth = 297 - 32; // 265mm per le colonne date
  const dateColumnWidth = `${Math.floor(remainingWidth / dateColumnsCount)}mm`;
  
  // Funzione per estrarre solo il giorno dalla data
  const extractOnlyDay = (date: string): string => {
    const currDate = new Date(date);
    return currDate.getDate().toString();
  };

  // Funzione per convertire il piano in testo
  const getFloorText = (floor: number): string => {
    if (floor === 3) return "RA";
    if (floor === 0) return "";
    return floor.toString();
  };
  // Genera il display del turno con traduzioni italiane
  const generateShiftDisplay = (shift: any) => {
    if (!shift) return "";
    
    if (shift.absence) {
      // Se assenza parziale (<8h), mostra turno + assenza
      if (typeof shift.absenceHours === "number" && shift.absenceHours > 0 && shift.absenceHours < 8) {
        const shiftPart = shift.shiftType && shift.floor > 0 
          ? `${italianNames[shift.shiftType] || shift.shiftType}${getFloorText(shift.floor)}`
          : italianNames[shift.shiftType] || shift.shiftType || "";
        const absencePart = `${italianNames[shift.absence] || shift.absence}(${shift.absenceHours}h)`;
        return shiftPart ? `${shiftPart} + ${absencePart}` : absencePart;
      } else {
        // Assenza totale
        const absenceHours = typeof shift.absenceHours === "number" && shift.absenceHours > 0 
          ? `(${shift.absenceHours}h)` : "";
        return `${italianNames[shift.absence] || shift.absence}${absenceHours}`;
      }
    } else if (shift.shiftType) {
      // Solo turno
      return shift.floor > 0 
        ? `${italianNames[shift.shiftType] || shift.shiftType}${getFloorText(shift.floor)}`
        : italianNames[shift.shiftType] || shift.shiftType;
    }
    return "";
  };

  // Ottieni colori per shift (stesso sistema del calendario)
  const getShiftColors = (shift: any, date: string) => {
    if (!shift) return { backgroundColor: 'transparent', color: '#000' };
    
    // Usa colore personalizzato se presente
    if (shift.customColor) {
      return { 
        backgroundColor: shift.customColor, 
        color: shift.shiftType === 'Free' ? '#6b7280' : '#000'
      };
    }
    
    // Ottieni i colori personalizzati per la data (se presenti)
    const dateColors = getColorsForDate(date, selectedYear, selectedMonth);
    
    // Usa colori in base al tipo
    if (shift.absence) {
      return { 
        backgroundColor: dateColors[shift.absence] || coloriTurni[shift.absence] || '#e5e7eb', 
        color: '#000'
      };
    } else if (shift.shiftType) {
      return { 
        backgroundColor: dateColors[shift.shiftType] || coloriTurni[shift.shiftType] || '#e5e7eb', 
        color: shift.shiftType === 'Free' ? '#6b7280' : '#000'
      };
    }
    
    return { backgroundColor: 'transparent', color: '#000' };
  };  return (
    <div style={{ 
      width: "100%",
      height: "100%",
      margin: "0",
      padding: "0",
      fontFamily: "Arial, sans-serif",
      fontSize: "10pt", // Leggermente aumentato per migliore leggibilità
      lineHeight: "1.1", // Migliorato per leggibilità
      color: "#000",
      backgroundColor: "#fff",
      boxSizing: "border-box"
    }}>
      {/* Header compatto - solo essenziale */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "3mm", // Leggermente aumentato
        paddingBottom: "1.5mm"
      }}>
        <h1 style={{ 
          fontSize: "14pt", // Aumentato per migliore leggibilità
          fontWeight: "bold", 
          color: "#000",
          margin: "0 0 1.5mm 0"
        }}>
          Turni OSS - {mesi.find(m => m.value === selectedMonth)?.label || 'Mensile'} {selectedYear}
        </h1>
      </div>
      
      {/* Main Table - occupa tutto lo spazio con spaziatura ottimizzata */}
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse",
        border: "none",
        tableLayout: "fixed",
        fontSize: "8pt" // Leggermente aumentato
      }}>        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  width: idx === 0 ? resourceColumnWidth : dateColumnWidth,
                  padding: "2mm 1mm", // Padding aumentato per migliore leggibilità
                  textAlign: "center",
                  backgroundColor: "#f0f0f0",
                  color: "#000",
                  fontWeight: "bold",
                  fontSize: "8pt", // Aumentato per migliore leggibilità
                  border: "0.3pt solid #999",
                  verticalAlign: "middle",
                  lineHeight: "1.1",
                  height: "6mm" // Aumentato per migliore spaziatura
                }}
              >
                {idx === 0 ? "Risorsa" : (
                  <div>
                    <div style={{ fontSize: "6pt", color: "#666", marginBottom: "0.3mm" }}>
                      {new Date(col.key).toLocaleDateString('it-IT', { weekday: 'short' })}
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "8pt" }}>
                      {extractOnlyDay(col.key)}
                    </div>
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col, colIdx) => {
                const shift = row[col.key];
                const colors = colIdx === 0 ? { backgroundColor: '#f8f8f8', color: '#000' } : getShiftColors(shift, col.key);
                
                return (                  <td
                    key={col.key}
                    style={{
                      width: colIdx === 0 ? resourceColumnWidth : dateColumnWidth,
                      padding: "1.5mm 0.5mm", // Padding aumentato per migliore leggibilità
                      textAlign: "center",
                      verticalAlign: "middle",
                      border: "0.3pt solid #999",
                      backgroundColor: colors.backgroundColor,
                      color: colors.color,
                      fontSize: colIdx === 0 ? "7pt" : "7pt", // Aumentato per migliore leggibilità
                      fontWeight: colIdx === 0 ? "bold" : "600",
                      lineHeight: "1.1", // Migliorato per leggibilità
                      height: "5mm", // Aumentato per migliore spaziatura
                      overflow: "hidden",
                      wordWrap: "break-word"
                    }}
                  >                    {colIdx === 0 ? (
                      <div style={{ 
                        color: "#000",
                        fontSize: "7pt", // Aumentato per migliore leggibilità
                        fontWeight: "bold"
                      }}>
                        {row[col.key]}
                      </div>
                    ) : (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        height: "100%",
                        fontSize: "6pt", // Leggermente aumentato
                        fontWeight: "700",
                        textAlign: "center",
                        padding: "0.2mm" // Aggiunto padding interno per migliore leggibilità
                      }}>
                        {generateShiftDisplay(shift)}
                      </div>
                    )}
                  </td>
                );
              })}
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
  // Stati per il modal di personalizzazione colori
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [selectedDateForColors, setSelectedDateForColors] = useState<string>('');
  const [colorChangeCounter, setColorChangeCounter] = useState(0);

  // Stati per il modal di personalizzazione colore turno
  const [isShiftColorModalOpen, setIsShiftColorModalOpen] = useState(false);
  const [selectedShiftForColors, setSelectedShiftForColors] = useState<ResourceShift | null>(null);
  const [selectedResourceName, setSelectedResourceName] = useState<string>('');

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
    if (persist) {
      saveMatrixToDatabase(mappaTurni, year, month);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    // All'avvio mostra Maggio 2025
    const loadInitialData = async () => {
      const year = selectedYear;
      const month = selectedMonth;

      // Prova a caricare la matrice del mese selezionato dal database
      const loadedMatrix = await loadMatrixFromDatabase(year, month);
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
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo all'avvio
  // Cambio mese
  const handleMonthChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = parseInt(e.target.value, 10);
    setSelectedMonth(selectedMonth);
    setIsTableLoading(true);

    const year = selectedYear;
    const month = selectedMonth;

    // Prova a caricare la matrice del mese selezionato dal database
    const loadedMatrix = await loadMatrixFromDatabase(year, selectedMonth);
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
      const prevMatrix = await loadMatrixFromDatabase(prevYear, prevMonth);
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
  const CELL_TYPE = "CELL";  // Ordina le risorse una volta sola e riutilizza
  const sortedResources = useMemo(() => [
    ...resources.filter(r => r.type === ResourceType.FULL_TIME),
    ...resources.filter(r => r.type !== ResourceType.FULL_TIME)
  ], [resources]);  // Gestione click su turno per personalizzazione colore - definito prima delle colonne
  const handleShiftColorChange = useCallback((shift: ResourceShift, resourceId: string, date: string) => {
    debugLog('🎨 Color change request (new approach):', { 
      resourceId, 
      date, 
      shiftData: shift,
      shiftId: shift.id,
      hasShiftId: !!shift.id,
      timestamp: Date.now()
    });
    
    // Prima di tutto, verifichiamo lo stato della matrice
    debugLog('🔍 Matrix debug for resource:', {
      resourceId,
      hasResourceInMatrix: !!matrix[resourceId],
      datesInResource: matrix[resourceId] ? Object.keys(matrix[resourceId]).length : 0,
      targetDate: date,
      hasTargetDate: !!matrix[resourceId]?.[date]
    });
    
    // Verifica che il turno esista ancora nella posizione corretta
    const currentShift = matrix[resourceId]?.[date];
      debugLog('🔍 Debug ID check:', {
      shiftId: shift.id,
      currentShiftId: currentShift?.id,
      hasShiftId: !!shift.id,
      hasCurrentShiftId: !!currentShift?.id,
      idsMatch: currentShift && currentShift.id === shift.id,
      currentShiftType: currentShift?.shiftType,
      originalShiftType: shift.shiftType
    });
    
    // Debug: controlla quanti turni hanno ID nella matrice
    let totalShifts = 0;
    let shiftsWithId = 0;
    for (const [rId, resourceMatrix] of Object.entries(matrix)) {
      for (const [d, s] of Object.entries(resourceMatrix)) {
        if (s) {
          totalShifts++;
          if (s.id) {
            shiftsWithId++;
          }
        }
      }
    }
    debugLog('📊 Matrix ID statistics:', {
      totalShifts,
      shiftsWithId,
      percentageWithId: totalShifts > 0 ? Math.round((shiftsWithId / totalShifts) * 100) : 0
    });
      if (currentShift && currentShift.id === shift.id) {
      debugLog('🎨 Shift found in expected position:', { 
        resourceId,
        date,
        currentShift: currentShift.shiftType
      });
      
      // Create a shift object with the CURRENT position coordinates
      const shiftWithCurrentPosition = {
        ...currentShift,
        resourceId: resourceId, // Use current resource ID
        date: date // Use current date
      };
      
      setSelectedShiftForColors(shiftWithCurrentPosition); // Usa coordinate aggiornate
      
      // Trova il nome della risorsa
      const resource = sortedResources.find(r => r.id === resourceId);
      if (resource) {
        setSelectedResourceName(`${resource.firstName} ${resource.lastName.charAt(0)}.`);
      }
      setIsShiftColorModalOpen(true);
    } else {
      // Il turno potrebbe essere stato spostato, cerchiamolo nella matrice
      debugLog('🔍 Shift not in expected position, searching matrix...', { 
        expectedResourceId: resourceId,
        expectedDate: date,
        shiftId: shift.id
      });
      
      let foundShift: ResourceShift | null = null;
      let foundResourceId: string | null = null;
      let foundDate: string | null = null;
      
      // Cerca il turno in tutta la matrice usando l'ID del turno
      for (const [rId, resourceMatrix] of Object.entries(matrix)) {
        for (const [d, s] of Object.entries(resourceMatrix)) {
          if (s && s.id === shift.id) {
            foundShift = s;
            foundResourceId = rId;
            foundDate = d;
            break;
          }
        }
        if (foundShift) break;
      }
        if (foundShift && foundResourceId && foundDate) {
        debugLog('✅ Found shift in new position:', { 
          originalPos: { resourceId, date },
          newPos: { resourceId: foundResourceId, date: foundDate },
          shift: foundShift.shiftType
        });
        
        // Create a shift object with the FOUND position coordinates
        const shiftWithFoundPosition = {
          ...foundShift,
          resourceId: foundResourceId, // Use found resource ID
          date: foundDate // Use found date
        };
        
        setSelectedShiftForColors(shiftWithFoundPosition);
        
        // Trova il nome della risorsa nella nuova posizione
        const resource = sortedResources.find(r => r.id === foundResourceId);
        if (resource) {
          setSelectedResourceName(`${resource.firstName} ${resource.lastName.charAt(0)}.`);
        }
        setIsShiftColorModalOpen(true);
      } else {
        debugWarn('🚨 Shift not found anywhere in matrix:', { 
          resourceId, 
          date, 
          shiftId: shift.id 
        });
      }
    }
  }, [matrix, sortedResources]); // Dipendenze semplificate

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
    },    ...dateArray.map((date, colIdx) => ({
      key: date,
      name: convertDateToString(date),
      width: CELL_WIDTH,      render: (row: any, rowIdx: number) => {
        const resource = sortedResources[rowIdx];
        return (          <EditableCell
            rowIdx={rowIdx}
            colIdx={colIdx + 1}
            value={row[date]}
            resource={resource}
            currentDate={date}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onCellDrop={handleCellDrop}
            onShiftChange={handleShiftTypeChange}
            onShiftColorChange={handleShiftColorChange}
          />);
      }
    }))
  ], [dateArray, selectedYear, selectedMonth, colorChangeCounter, matrix, handleShiftColorChange]);
  // ROWS
  const rows = useMemo(() => {
    return sortedResources.map((resource, rowIdx) => {
      const row: any = { resourceName: resource.firstName + ' ' + resource.lastName.charAt(0) + '.' };
      dateArray.forEach(date => {
        row[date] = matrix[resource.id]?.[date];
      });
      return row;
    });
  }, [sortedResources, dateArray, matrix]);  function handleCellDrop(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    debugLog('🔄 Drag & Drop:', { fromRow, fromCol, toRow, toCol });
    
    if (fromCol === 0 || toCol === 0) return;
    
    // Ensure we have valid indices
    if (fromRow < 0 || fromRow >= sortedResources.length || 
        toRow < 0 || toRow >= sortedResources.length ||
        fromCol - 1 < 0 || fromCol - 1 >= dateArray.length ||
        toCol - 1 < 0 || toCol - 1 >= dateArray.length) {
      debugWarn('Invalid drag & drop indices:', { fromRow, fromCol, toRow, toCol });
      return;
    }
    
    const fromResource = sortedResources[fromRow];
    const toResource = sortedResources[toRow];
    const fromDate = dateArray[fromCol - 1];
    const toDate = dateArray[toCol - 1];

    debugLog('📋 Resources & Dates:', { 
      fromResource: fromResource?.firstName, 
      toResource: toResource?.firstName, 
      fromDate, 
      toDate 
    });

    // Verify resources exist
    if (!fromResource || !toResource) {
      debugWarn('Resources not found:', { fromResource, toResource });
      return;
    }    // Get current matrix values
    const fromValue = matrix[fromResource.id]?.[fromDate];
    const toValue = matrix[toResource.id]?.[toDate];

    debugLog('📊 Current values:', { 
      fromValue: fromValue?.shiftType,
      fromValueId: fromValue?.id,
      toValue: toValue?.shiftType,
      toValueId: toValue?.id
    });

    // If values are the same, no need to swap
    if (fromValue === toValue) {
      debugLog('⚡ Values are the same, skipping swap');
      return;
    }

    // Create new matrix with deep copy of affected resource rows
    const newMatrix = { ...matrix };
    
    // Ensure resource entries exist
    if (!newMatrix[fromResource.id]) {
      newMatrix[fromResource.id] = {};
    }
    if (!newMatrix[toResource.id]) {
      newMatrix[toResource.id] = {};
    }
    
    // Deep copy the affected resource rows
    newMatrix[fromResource.id] = { ...newMatrix[fromResource.id] };
    newMatrix[toResource.id] = { ...newMatrix[toResource.id] };

    // Perform the swap preserving the IDs
    newMatrix[fromResource.id][fromDate] = toValue;
    newMatrix[toResource.id][toDate] = fromValue;

    debugLog('✅ Swap completed with IDs preserved:', { 
      fromNew: newMatrix[fromResource.id][fromDate]?.shiftType,
      fromNewId: newMatrix[fromResource.id][fromDate]?.id,
      toNew: newMatrix[toResource.id][toDate]?.shiftType,
      toNewId: newMatrix[toResource.id][toDate]?.id
    });

    // Update state and save to database
    setMatrix(newMatrix);
    saveMatrixToDatabase(newMatrix, selectedYear, selectedMonth);
    
    // Force re-render of components
    setColorChangeCounter(prev => prev + 1);
  }  function handleShiftTypeChange(
    rowIdx: number,
    colIdx: number,
    shiftType: ShiftType,
    floor: number = 0,
    absence?: AbsenceType,
    absenceHours?: number
  ) {
    if (colIdx === 0) return; // Skip resource name column

    debugLog('🔧 Shift type change:', { rowIdx, colIdx, shiftType, floor, absence, absenceHours });

    // Usa le stesse risorse ordinate del rendering (sortedResources è definito sopra)
    
    // Validate indices
    if (rowIdx < 0 || rowIdx >= sortedResources.length || colIdx - 1 < 0 || colIdx - 1 >= dateArray.length) {
      debugWarn('Invalid shift change indices:', { rowIdx, colIdx, sortedResourcesLength: sortedResources.length, dateArrayLength: dateArray.length });
      return;
    }
    
    const resource = sortedResources[rowIdx];
    const date = dateArray[colIdx - 1];
    
    debugLog('🔧 Shift change data:', {
      resource: resource?.firstName,
      date,
      oldShift: matrix[resource.id]?.[date]?.shiftType
    });
    
    if (!resource || !date) {
      debugWarn('Resource or date not found:', { resource, date });
      return;
    }
    
    const oldShift = matrix[resource.id]?.[date];

    if (!oldShift) {
      debugWarn('Old shift not found:', { resourceId: resource.id, date });
      return;
    }    const newShift: ResourceShift = {
      ...oldShift,
      shiftType: shiftType,
      floor: (shiftType === ShiftType.Free || shiftType === ShiftType.MorningI || absence) ? 0 : floor,
      absence: absence,
      absenceHours: absence ? absenceHours : undefined
    };

    debugLog('🔧 New shift data:', {
      oldShift: oldShift.shiftType,
      oldShiftId: oldShift.id,
      newShift: newShift.shiftType,
      newShiftId: newShift.id,
      idPreserved: oldShift.id === newShift.id,
      floor: newShift.floor,
      absence: newShift.absence
    });

    // Deep copy della riga della risorsa
    const newMatrix = { ...matrix };
    
    // Ensure resource entry exists
    if (!newMatrix[resource.id]) {
      newMatrix[resource.id] = {};
    }
    
    newMatrix[resource.id] = { ...newMatrix[resource.id], [date]: newShift };

    setMatrix(newMatrix);
    saveMatrixToDatabase(newMatrix, selectedYear, selectedMonth);
    
    // Forza re-render dei componenti
    setColorChangeCounter(prev => prev + 1);
    
    debugLog('✅ Shift change completed');
  }

  const handleColorChange = () => {
    setColorChangeCounter(prev => prev + 1);
  };  const handleDateHeaderDoubleClick = (date: string) => {
    setSelectedDateForColors(date);
    setIsColorModalOpen(true);
  };

  // Funzione per controllare se un giorno ha personalizzazioni colori
  const hasColorCustomizations = (date: string): boolean => {
    const customizations = getDayColorCustomizations(selectedYear, selectedMonth);
    return customizations.some(c => c.date === date);  };

  // Salva il colore personalizzato del turno
  const handleSaveShiftColor = (customColor?: string) => {
    if (selectedShiftForColors) {
      const resourceId = selectedShiftForColors.resourceId;
      const date = selectedShiftForColors.date;
      
      debugLog('💾 Saving shift color:', {
        resourceId,
        date,
        customColor,
        oldColor: selectedShiftForColors.customColor
      });
      
      const newShift: ResourceShift = {
        ...selectedShiftForColors,
        customColor: customColor
      };

      const newMatrix = { ...matrix };
      newMatrix[resourceId] = { ...newMatrix[resourceId], [date]: newShift };
      
      setMatrix(newMatrix);
      saveMatrixToDatabase(newMatrix, selectedYear, selectedMonth);
      setColorChangeCounter(prev => prev + 1);
      
      debugLog('✅ Shift color saved successfully');
    } else {
      debugWarn('🚨 No shift selected for color change');
    }
  };
  const handlePrint = useReactToPrint({
    contentRef: printableTableRef,
    documentTitle: `Turni OSS - ${mesi.find(m => m.value === selectedMonth)?.label || 'Mensile'}`,
    onBeforePrint: () => {
      setIsPrintingView(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrintingView(false);
    },    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 0;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          font-family: Arial, sans-serif !important;
        }
        div {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        table {
          width: 100% !important;
          height: 100% !important;
          page-break-inside: avoid !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
        th, td {
          page-break-inside: avoid !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        h1 {
          page-break-after: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `,});

  // Funzione per convertire il piano in testo per la stampa
  const getFloorText = (floor: number): string => {
    if (floor === 3) return "RA";
    if (floor === 0) return "";
    return floor.toString();
  };
  if (isLoading)
    return <LoadingScreen />;

  return (
    <ProtectedRoute>
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
        }}    ><HeaderToolbar 
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
                      {columns.map((col, idx) => (                        <th
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
                            letterSpacing: "0.01em",
                            cursor: idx > 0 ? "pointer" : "default"
                          }}                          onDoubleClick={idx > 0 ? () => handleDateHeaderDoubleClick(col.key) : undefined}
                          title={idx > 0 ? "Doppio click per personalizzare i colori del giorno" : undefined}
                        >
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            {col.name}
                            {idx > 0 && hasColorCustomizations(col.key) && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#f59e0b',
                                borderRadius: '50%',
                                border: '1px solid #fff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }} />
                            )}
                          </div>
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
        <div ref={printableTableRef}>          <PrintableTable 
            columns={columns}
            rows={rows}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>
      </div>      {/* Modal per personalizzazione colori */}
      <ColorCustomizationModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        selectedDate={selectedDateForColors}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onColorChange={handleColorChange}
      />      {/* Modal per personalizzazione colore turno */}
      <ShiftColorCustomizationModal
        isOpen={isShiftColorModalOpen}
        onClose={() => setIsShiftColorModalOpen(false)}
        shift={selectedShiftForColors}
        resourceName={selectedResourceName}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onColorChange={handleSaveShiftColor}      />
    </div>
    </ProtectedRoute>
  );
}