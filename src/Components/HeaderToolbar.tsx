import { mesi } from "./constants";
import { AuthService } from "./authService";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderToolbarProps {
  selectedMonth: number;
  onMonthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrint: () => void;
}

export const HeaderToolbar = ({ selectedMonth, onMonthChange, onPrint }: HeaderToolbarProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = AuthService.getUser();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AuthService.logout();
      router.push("/login");
    } catch (error) {
      console.error("Errore logout:", error);
      // Anche in caso di errore, reindirizza al login
      router.push("/login");
    }
  };

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
      > Turni OSS
        <span style={{
          fontSize: "0.75rem",
          color: "#6b7280",
          fontWeight: 400,
          marginLeft: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 4
        }}>
          💡 Doppio click sulla data O tasto dx su un turno per personalizzare i colori
        </span>
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

        {/* Divisore visivo */}
        <div style={{
          width: "1px",
          height: "32px",
          background: "#d1d5db",
          margin: "0 12px"
        }} />

        {/* Informazioni utente */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#3730a3"
              }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                textTransform: "capitalize"
              }}>
                {user.role}
              </div>
            </div>

            {/* Pulsante logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded transition-all duration-200"
              style={{
                background: isLoggingOut ? "#9ca3af" : "#6b7280",
                color: "white",
                fontWeight: 500,
                fontSize: "0.9rem",
                boxShadow: "0 1px 3px rgba(107,114,128,0.15)",
                border: "none",
                cursor: isLoggingOut ? "not-allowed" : "pointer",
                minHeight: 36
              }}
              onMouseOver={(e) => {
                if (!isLoggingOut) {
                  e.currentTarget.style.background = "#4b5563";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(107,114,128,0.25)";
                }
              }}
              onMouseOut={(e) => {
                if (!isLoggingOut) {
                  e.currentTarget.style.background = "#6b7280";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(107,114,128,0.15)";
                }
              }}
              title="Disconnetti"
            >
              {isLoggingOut ? (
                <svg className="animate-spin" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                  <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                </svg>
              )}
              {isLoggingOut ? "Disconnessione..." : "Esci"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
