// Servizio per gestione autenticazione con JWT
export class AuthService {
  private static TOKEN_KEY = 'rsa_auth_token';
  private static API_BASE = '/Server/api';

  /**
   * Decodifica un JWT token (payload)
   */
  private static decodeJWT(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Errore decodifica JWT:', error);
      return null;
    }
  }

  /**
   * Verifica se un token JWT è scaduto
   */
  private static isTokenExpired(token: string): boolean {
    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return true;
    
    return Date.now() >= payload.exp * 1000;
  }
  /**
   * Effettua il login
   */
  static async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.API_BASE}/auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      // Controlla se la risposta è JSON valida
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Risposta non JSON dal server:', text);
        return { 
          success: false, 
          message: 'Errore del server - risposta non valida' 
        };
      }

      const data = await response.json();

      if (data.success) {
        // Salva solo il token - i dati utente sono nel JWT
        localStorage.setItem(this.TOKEN_KEY, data.token);
      }

      return data;
    } catch (error) {
      console.error('Errore login:', error);
      return { success: false, message: 'Errore di connessione' };
    }
  }

  /**
   * Effettua il logout
   */
  static async logout() {
    try {
      // Con JWT non c'è bisogno di chiamare il server per il logout
      await fetch(`${this.API_BASE}/auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout'
        })
      });
    } catch (error) {
      console.error('Errore logout:', error);
    } finally {
      // Rimuovi sempre i dati locali
      this.clearLocalData();
    }
  }  /**
   * Verifica se l'utente è autenticato
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    // Prima verifica locale se il token è scaduto
    if (this.isTokenExpired(token)) {
      this.clearLocalData();
      return false;
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate',
          token
        })
      });

      // Controlla se la risposta è JSON valida
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Risposta non JSON dal server (validate):', text);
        this.clearLocalData();
        return false;
      }

      const data = await response.json();

      if (!data.success) {
        // Token non valido, pulisci i dati locali
        this.clearLocalData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Errore verifica autenticazione:', error);
      this.clearLocalData();
      return false;
    }
  }

  /**
   * Ottiene il token salvato
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Ottiene i dati dell'utente dal JWT token
   */
  static getUser(): any | null {
    if (typeof window === 'undefined') return null;
    
    const token = this.getToken();
    if (!token) return null;
    
    const payload = this.decodeJWT(token);
    if (!payload) return null;
    
    // Verifica che non sia scaduto
    if (this.isTokenExpired(token)) {
      this.clearLocalData();
      return null;
    }
    
    return {
      id: payload.user_id,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      role: payload.role
    };
  }

  /**
   * Pulisce i dati locali
   */
  static clearLocalData() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Hook per verificare automaticamente l'autenticazione
   */
  static setupAutoLogoutOnTokenExpiry() {
    // Controlla ogni 5 minuti se il token è ancora valido
    setInterval(async () => {
      const isAuth = await this.isAuthenticated();
      if (!isAuth && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }, 5 * 60 * 1000); // 5 minuti
  }

  /**
   * Middleware per API calls autenticate
   */
  static async authenticatedFetch(url: string, options: RequestInit = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('Token di autenticazione mancante');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Se riceviamo 401, il token è scaduto
    if (response.status === 401) {
      this.clearLocalData();
      window.location.href = '/login';
      throw new Error('Sessione scaduta');
    }

    return response;
  }
}
