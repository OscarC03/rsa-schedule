"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Per il momento, reindirizza direttamente senza controlli
    setTimeout(() => {
      router.push("/dashboard");
    }, 500); // Piccolo delay per mostrare il loading state
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(120deg, #f1f5f9 0%, #e0e7ff 100%)",
      }}
    >
      <div 
        className="w-full max-w-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(79,70,229,0.15)",
          backdropFilter: "blur(10px)",
          padding: "2rem",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div
              style={{
                background: "#4f46e5",
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24"
                fill="white"
                width="32"
                height="32"
              >
                <path d="M4 13H10C10.55 13 11 12.55 11 12V4C11 3.45 10.55 3 10 3H4C3.45 3 3 3.45 3 4V12C3 12.55 3.45 13 4 13ZM4 21H10C10.55 21 11 20.55 11 20V16C11 15.45 10.55 15 10 15H4C3.45 15 3 15.45 3 16V20C3 20.55 3.45 21 4 21ZM14 21H20C20.55 21 21 20.55 21 20V12C21 11.45 20.55 11 20 11H14C13.45 11 13 11.45 13 12V20C13 20.55 13.45 21 14 21ZM13 4V8C13 8.55 13.45 9 14 9H20C20.55 9 21 8.55 21 8V4C21 3.45 20.55 3 20 3H14C13.45 3 13 3.45 13 4Z" />
              </svg>
            </div>
          </div>
          
          <h1 
            className="text-2xl font-semibold"
            style={{
              color: "#3730a3",
              letterSpacing: "0.01em",
              textShadow: "0 1px 0 #fff, 0 2px 8px #e0e7ff",
              lineHeight: 1.2,
            }}
          >
            Opera Pia Garelli
          </h1>
          <p 
            className="mt-2"
            style={{
              color: "#6366f1",
              fontWeight: 500,
            }}
          >
            Accedi al sistema di gestione turni
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium mb-2"
              style={{
                color: "#3730a3",
                letterSpacing: "0.01em",
              }}
            >
              Nome utente
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all duration-150"
              style={{
                background: "#fff",
                borderColor: "#c7d2fe",
                color: "#3730a3",
                fontSize: "1.05rem",
              }}
              placeholder="Inserisci il tuo username"
            />
          </div>
          
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium mb-2"
              style={{
                color: "#3730a3",
                letterSpacing: "0.01em",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all duration-150"
              style={{
                background: "#fff",
                borderColor: "#c7d2fe",
                color: "#3730a3",
                fontSize: "1.05rem",
              }}
              placeholder="Inserisci la password"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label 
                htmlFor="remember-me" 
                className="ml-2 block text-sm"
                style={{ color: "#6366f1" }}
              >
                Ricordami
              </label>
            </div>
            
            <div className="text-sm">
              <a 
                href="#" 
                className="hover:underline"
                style={{ 
                  color: "#4f46e5",
                  fontWeight: 500,
                }}
              >
                Password dimenticata?
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150"
              style={{
                backgroundColor: isLoading ? "#818cf8" : "#4f46e5",
                boxShadow: "0 2px 10px rgba(79,70,229,0.2)",
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#4338ca";
              }}
              onMouseOut={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#4f46e5";
              }}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center">
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            © 2023 Opera Pia Garelli - Tutti i diritti riservati
          </p>
        </div>
      </div>
    </div>
  );
}
