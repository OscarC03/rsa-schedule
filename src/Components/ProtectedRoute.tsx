"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "./authService";
import { LoadingScreen } from "./LoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (!isAuth) {
          router.push("/login");
        }
      } catch (error) {
        console.error("Errore verifica autenticazione:", error);
        setIsAuthenticated(false);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Setup auto-logout su token scaduto
    AuthService.setupAutoLogoutOnTokenExpiry();
  }, []);

  // Mostra loading mentre verifica l'autenticazione
  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  // Se non autenticato, non mostrare nulla (si sta reindirizzando)
  if (!isAuthenticated) {
    return null;
  }

  // Se autenticato, mostra il contenuto
  return <>{children}</>;
}
