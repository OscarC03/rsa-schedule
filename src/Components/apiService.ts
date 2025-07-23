/**
 * RSA Schedule - API Service
 * Gestisce le chiamate al backend PHP per risorse, turni e impostazioni
 */

import { useState, useEffect } from 'react';

// Configurazione API - per Altervista.org tutto sarà sullo stesso dominio
const API_BASE_URL = '/Server/api';

// Tipi per le response API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Classe per gestire le chiamate API
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Metodo generico per chiamate HTTP
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiResponse<T>;
      
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error'
      };
    }
  }

  // ==================== RESOURCES API ====================

  /**
   * Legge tutte le risorse dal database
   */
  async getAllResources(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/resources.php');
  }

  /**
   * Salva una risorsa (nuova o aggiornamento)
   */
  async saveResource(resource: any): Promise<ApiResponse> {
    return this.request('/resources.php', {
      method: 'POST',
      body: JSON.stringify(resource)
    });
  }

  /**
   * Salva tutte le risorse (batch operation)
   */
  async saveAllResources(resources: any[]): Promise<ApiResponse> {
    return this.request('/resources.php', {
      method: 'POST',
      body: JSON.stringify(resources)
    });
  }

  /**
   * Elimina una risorsa
   */
  async deleteResource(resourceId: string): Promise<ApiResponse> {
    return this.request(`/resources.php?id=${resourceId}`, {
      method: 'DELETE'
    });
  }

  // ==================== SHIFTS API ====================

  /**
   * Legge turni per un mese specifico
   */
  async getShiftsByMonth(year: number, month: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/shifts.php?year=${year}&month=${month}`);
  }

  /**
   * Legge turni per un range di date
   */
  async getShiftsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/shifts.php?start=${startDate}&end=${endDate}`);
  }

  /**
   * Salva un turno
   */
  async saveShift(shift: any): Promise<ApiResponse> {
    return this.request('/shifts.php', {
      method: 'POST',
      body: JSON.stringify(shift)
    });
  }

  /**
   * Salva matrice completa di turni
   */
  async saveShiftMatrix(matrix: any): Promise<ApiResponse> {
    return this.request('/shifts.php', {
      method: 'POST',
      body: JSON.stringify({ matrix })
    });
  }

  /**
   * Elimina un turno specifico
   */
  async deleteShift(resourceId: string, date: string): Promise<ApiResponse> {
    return this.request(`/shifts.php?resourceId=${resourceId}&date=${date}`, {
      method: 'DELETE'
    });
  }

  // ==================== SETTINGS API ====================

  /**
   * Legge personalizzazioni colori per un mese
   */
  async getDateColors(year: number, month: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/settings.php?type=colors&year=${year}&month=${month}`);
  }

  /**
   * Salva personalizzazioni colori
   */
  async saveDateColors(year: number, month: number, colors: any[]): Promise<ApiResponse> {
    return this.request('/settings.php', {
      method: 'POST',
      body: JSON.stringify({
        type: 'colors',
        year,
        month,
        data: colors
      })
    });
  }

  /**
   * Salva singola personalizzazione colore
   */
  async saveDateColor(colorData: any): Promise<ApiResponse> {
    return this.request('/settings.php', {
      method: 'POST',
      body: JSON.stringify({
        type: 'colors',
        ...colorData
      })
    });
  }

  /**
   * Legge una impostazione globale
   */
  async getSetting(key: string): Promise<ApiResponse> {
    return this.request(`/settings.php?type=setting&key=${key}`);
  }

  /**
   * Salva una impostazione globale
   */
  async saveSetting(key: string, value: any): Promise<ApiResponse> {
    return this.request('/settings.php', {
      method: 'POST',
      body: JSON.stringify({
        type: 'setting',
        key,
        value
      })
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test di connessione API
   */
  async testConnection(): Promise<ApiResponse> {
    return this.request('/index.php');
  }
}

// Esporta istanza singleton del servizio API
export const apiService = new ApiService();

// Hook React personalizzato per gestire loading states
export function useApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      
      if (response.success) {
        setData(response.data || null);
      } else {
        setError(response.error || 'API call failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// Utility per gestire errori API
export function handleApiError(error: string, fallbackMessage: string = 'Operazione fallita'): void {
  console.error('API Error:', error);
  // Qui potresti aggiungere notifiche toast o altri feedback UI
  alert(`${fallbackMessage}: ${error}`);
}
