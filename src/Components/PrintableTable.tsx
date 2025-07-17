import { coloriTurni, mesi } from "./constants";
import { ShiftType } from "@/model/model";

interface PrintableTableProps {
  columns: any[];
  rows: any[];
  selectedMonth: number;
}

export const PrintableTable = ({ columns, rows, selectedMonth }: PrintableTableProps) => {
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
    Malattia: 'MA'
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
        <span style={{ marginRight: "8px" }}><strong>MI</strong>=Mattina Inf.</span>
        <span style={{ marginRight: "8px" }}><strong>A</strong>=Pomeriggio</span>
        <span style={{ marginRight: "8px" }}><strong>S</strong>=Spezzato</span>
        <span style={{ marginRight: "8px" }}><strong>N</strong>=Notte</span>
        <span style={{ marginRight: "8px" }}><strong>F</strong>=Libero</span>
        <span style={{ marginRight: "8px" }}><strong>FE</strong>=Ferie</span>
        <span style={{ marginRight: "8px" }}><strong>PE</strong>=Permesso</span>
        <span><strong>MA</strong>=Malattia</span>
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
                            <>
                              {row[col.key].shiftType
                                ? (row[col.key].floor > 0
                                    ? `${abbreviations[row[col.key].shiftType]}${row[col.key].floor} + `
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
                          )
                      ) : (
                        row[col.key]?.shiftType
                          ? (row[col.key].floor > 0
                              ? `${abbreviations[row[col.key].shiftType]}${row[col.key].floor}`
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
