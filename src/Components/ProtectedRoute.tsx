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
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Evita controlli multipli se stiamo già reindirizzando
        if (AuthService.getIsRedirecting()) {
          return;
        }

        setIsChecking(true);
        
        // Prima verifica sincrona rapida
        if (!AuthService.isAuthenticatedSync()) {
          setIsAuthenticated(false);
          AuthService.setRedirecting(true);
          router.push("/login");
          return;
        }

        // Se il controllo sincrono passa, fai la verifica completa
        const isAuth = await AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (!isAuth && !AuthService.getIsRedirecting()) {
          AuthService.setRedirecting(true);
          router.push("/login");
        }
      } catch (error) {
        console.error("Errore verifica autenticazione:", error);
        setIsAuthenticated(false);
        if (!AuthService.getIsRedirecting()) {
          AuthService.setRedirecting(true);
          router.push("/login");
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Setup auto-logout su token scaduto
    AuthService.setupAutoLogoutOnTokenExpiry();
  }, []);
  // Mostra loading mentre verifica l'autenticazione
  if (isAuthenticated === null || isChecking) {
    return <LoadingScreen />;
  }

  // Se non autenticato, non mostrare nulla (si sta reindirizzando)
  if (!isAuthenticated) {
    return null;
  }

  // Se autenticato, mostra il contenuto
  return <>{children}</>;
}
