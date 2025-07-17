"use client";

import React from 'react';
import { ResourceShift, ShiftType } from '@/model/model';
import { coloriTurni, italianNames } from './constants';

interface ShiftSummaryBarProps {
  matrix: Record<string, Record<string, ResourceShift>>;
  selectedMonth: number;
  mesi: Array<{ value: number; label: string }>;
}

interface FloorSummary {
  floor: number;
  shiftCounts: Record<ShiftType, number>;
  totalShifts: number;
}

const ShiftSummaryBar: React.FC<ShiftSummaryBarProps> = ({
  matrix,
  selectedMonth,
  mesi
}) => {
  // Hook per gestire la responsività
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Controlla inizialmente
    checkIsMobile();

    // Ascolta i cambiamenti di dimensione della finestra
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Calcola il riepilogo per ogni piano
  const calculateFloorSummary = (): FloorSummary[] => {
    const floorSummaries: Record<number, FloorSummary> = {};
      // Inizializza i riepiloghi per i piani 1-3 (RA) + piano 0 (nessun piano)
    for (let floor = 0; floor <= 3; floor++) {
      floorSummaries[floor] = {
        floor,
        shiftCounts: {
          [ShiftType.Morning]: 0,
          [ShiftType.MorningI]: 0,
          [ShiftType.Afternoon]: 0,
          [ShiftType.Split]: 0,
          [ShiftType.Night]: 0,
          [ShiftType.Free]: 0,
        },
        totalShifts: 0
      };
    }

    // Itera attraverso tutti i turni nella matrice
    Object.values(matrix).forEach(resourceShifts => {
      Object.values(resourceShifts).forEach(shift => {
        if (shift && !shift.absence) { // Escludi le assenze dal conteggio
          const floor = shift.floor || 0;
          const shiftType = shift.shiftType as ShiftType;
          
          if (floorSummaries[floor]) {
            floorSummaries[floor].shiftCounts[shiftType]++;
            // Conta solo i turni effettivi (non Free) per il totale
            if (shiftType !== ShiftType.Free) {
              floorSummaries[floor].totalShifts++;
            }
          }
        }
      });
    });

    return Object.values(floorSummaries).filter(summary => 
      summary.totalShifts > 0 || summary.floor === 0 // Mostra sempre il piano 0 anche se vuoto
    );
  };

  const floorSummaries = calculateFloorSummary();
  const currentMonth = mesi.find(m => m.value === selectedMonth)?.label || 'Sconosciuto';

  // Calcola il totale complessivo
  const grandTotal = floorSummaries.reduce((total, floor) => total + floor.totalShifts, 0);

  // Calcola statistiche aggiuntive
  const calculateAdditionalStats = () => {
    const totalShiftsAllFloors = floorSummaries.reduce((sum, floor) => sum + floor.totalShifts, 0);
    const floorsWithShifts = floorSummaries.filter(floor => floor.totalShifts > 0 && floor.floor > 0);
    const averageShiftsPerFloor = floorsWithShifts.length > 0 
      ? Math.round(totalShiftsAllFloors / floorsWithShifts.length * 10) / 10 
      : 0;

    return {
      totalShiftsAllFloors,
      floorsWithShifts: floorsWithShifts.length,
      averageShiftsPerFloor
    };
  };

  const stats = calculateAdditionalStats();

  // Simboli per i diversi tipi di turno
  const getShiftSymbol = (shiftType: string): string => {
    const symbols: Record<string, string> = {
      Morning: "🌅",
      MorningI: "🏥", 
      Afternoon: "☀️",
      Split: "⚡",
      Night: "🌙",
      Free: "🏖️"
    };
    return symbols[shiftType] || "📋";
  };

  // Funzione helper per convertire il numero del piano nel nome
  const getFloorDisplayName = (floor: number): string => {
    if (floor === 0) return "Senza Piano";
    if (floor === 3) return "Piano RA";
    return `Piano ${floor}`;
  };

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "16px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        flexWrap: "wrap",
        gap: "8px"
      }}>
        <h3 style={{
          margin: 0,
          color: "#1e293b",
          fontSize: isMobile ? "16px" : "18px",
          fontWeight: 600
        }}>
          Riepilogo Turni - {currentMonth}
        </h3>
        <div style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}>
          <div style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: 600
          }}>
            Totale: {grandTotal} turni
          </div>
          {stats.floorsWithShifts > 0 && (
            <div style={{
              backgroundColor: "#10b981",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: 600
            }}>
              Media: {stats.averageShiftsPerFloor} turni/piano
            </div>
          )}        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "12px"
      }}>
        {floorSummaries.map(floorSummary => (
          <div
            key={floorSummary.floor}
            style={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: isMobile ? "8px" : "12px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <h4 style={{
                margin: 0,
                color: "#374151",
                fontSize: "14px",
                fontWeight: 600
              }}>
                {getFloorDisplayName(floorSummary.floor)}
              </h4>
              <span style={{
                backgroundColor: "#f3f4f6",
                color: "#374151",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500
              }}>
                {floorSummary.totalShifts}
              </span>
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px"
            }}>
              {Object.entries(floorSummary.shiftCounts).map(([shiftType, count]) => {
                if (count === 0) return null;
                
                return (
                  <div
                    key={shiftType}
                    style={{
                      backgroundColor: coloriTurni[shiftType] || "#f3f4f6",
                      color: "#374151",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span>{getShiftSymbol(shiftType)} {italianNames[shiftType] || shiftType}:</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {floorSummary.totalShifts === 0 && (
              <div style={{
                color: "#9ca3af",
                fontSize: "12px",
                fontStyle: "italic",
                textAlign: "center"
              }}>
                Nessun turno assegnato
              </div>
            )}
          </div>        ))}
      </div>
    </div>
  );
};

export default ShiftSummaryBar;
