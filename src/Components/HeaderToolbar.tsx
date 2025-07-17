import { mesi } from "./constants";
import { handleExportShifts, handleImportShifts, handleResetShifts } from "./utils";

interface HeaderToolbarProps {
  selectedMonth: number;
  onMonthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrint: () => void;
}

export const HeaderToolbar = ({ selectedMonth, onMonthChange, onPrint }: HeaderToolbarProps) => {
  return (
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
          onChange={onMonthChange}
        >
          {mesi.map(mese => (
            <option className="text-black" key={mese.value} value={mese.value}>{mese.label}</option>
          ))}
        </select>
        
        {/* Pulsante per la stampa */}
        <button
          onClick={onPrint}
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

        {/* Pulsante esporta turni */}
        <button
          onClick={handleExportShifts}
          className="ml-2 flex items-center justify-center gap-1 px-4 py-2 rounded transition-all duration-200"
          style={{
            background: "#10b981",
            color: "white",
            fontWeight: 600,
            boxShadow: "0 1px 4px rgba(16,185,129,0.15)",
            border: "none",
            cursor: "pointer",
            minHeight: 40
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#059669";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(16,185,129,0.25)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#10b981";
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(16,185,129,0.15)";
          }}
          title="Esporta tutti i turni (JSON)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5-.5h4.5V1.5a.5.5 0 0 1 1 0v7.9h4.5a.5.5 0 0 1 .5.5v.6a.5.5 0 0 1-.5.5H6.5v2.9a.5.5 0 0 1-1 0v-2.9H1a.5.5 0 0 1-.5-.5v-.6z"/>
          </svg>
          Esporta turni
        </button>

        {/* Pulsante importa turni */}
        <label
          className="ml-2 flex items-center justify-center gap-1 px-4 py-2 rounded transition-all duration-200"
          style={{
            background: "#f59e42",
            color: "white",
            fontWeight: 600,
            boxShadow: "0 1px 4px rgba(245,158,66,0.15)",
            border: "none",
            cursor: "pointer",
            minHeight: 40
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#ea580c";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 6px rgba(245,158,66,0.25)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#f59e42";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(245,158,66,0.15)";
          }}
          title="Importa turni da file JSON"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M.5 6.1a.5.5 0 0 1 .5.5v.6a.5.5 0 0 1-.5.5H1v2.9a.5.5 0 0 0 1 0V7.7h4.5a.5.5 0 0 0 .5-.5v-.6a.5.5 0 0 0-.5-.5H2V3.7a.5.5 0 0 0-1 0v2.4H.5z"/>
          </svg>
          Importa turni
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportShifts}
            tabIndex={-1}
          />
        </label>

        {/* Pulsante reset turni */}
        <button
          onClick={handleResetShifts}
          className="ml-2 flex items-center justify-center gap-1 px-4 py-2 rounded transition-all duration-200"
          style={{
            background: "#ef4444",
            color: "white",
            fontWeight: 600,
            boxShadow: "0 1px 4px rgba(239,68,68,0.15)",
            border: "none",
            cursor: "pointer",
            minHeight: 40
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#dc2626";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(239,68,68,0.25)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#ef4444";
            e.currentTarget.style.boxShadow = "0 1px 4px rgba(239,68,68,0.15)";
          }}
          title="Resetta tutti i turni salvati"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.5 2.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-11zm1 .5v10h9v-10h-9zm2 2a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6zm3 0a.5.5 0 0 1 1 0v6a.5.5 0 0 1-1 0v-6z"/>
          </svg>
          Resetta turni
        </button>
      </div>
    </div>
  );
};
