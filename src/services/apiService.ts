/**
 * Servizio API per RSA Schedule Manager
 * Gestisce tutte le comunicazioni con il backend PHP
 */

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  API_ERRORS, 
  ERROR_MESSAGES,
  CACHE_CONFIG,
  STORAGE_CONFIG 
} from '../config/api';

// Tipi TypeScript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

interface ApiError extends Error {
  type: string;
  statusCode?: number;
  details?: any;
}

interface ShiftData {
  resourceId: string;
  date: string;
  shiftType: string;
  floor?: number;
  absence?: string;
  absenceHours?: number;
  customColor?: string;
  resourceName?: string;
}

interface Resource {
  id: string;
  first_name: string;
  last_name: string;
  resource_type: 'FULL_TIME' | 'PART_TIME';
  working_days?: number[];
  is_active: boolean;
}

interface Setting {
  setting_key: string;
  setting_value: any;
  setting_type: 'string' | 'integer' | 'boolean' | 'json';
  description?: string;
}

// Cache in memoria
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Classe principale del servizio API
class ApiService {
  private baseUrl: string;
  private isOnline: boolean = navigator.onLine;
  
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.setupOnlineListeners();
  }

  // Setup listener per stato online/offline
  private setupOnlineListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncOfflineChanges();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  // Wrapper per fetch con retry e error handling
  private async fetchWithRetry(
    url: string, 
    options: RequestInit = {}, 
    retries: number = API_CONFIG.MAX_RETRIES
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      return data;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const timeoutError: ApiError = new Error('Request timeout') as ApiError;
        timeoutError.type = API_ERRORS.TIMEOUT_ERROR;
        throw timeoutError;
      }

      if (retries > 0 && this.isOnline) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      const apiError: ApiError = new Error(error.message) as ApiError;
      apiError.type = API_ERRORS.NETWORK_ERROR;
      throw apiError;
    }
  }

  // Metodo generico per chiamate API
  private async apiCall<T = any>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any,
    useCache: boolean = false,
    cacheTtl: number = CACHE_CONFIG.RESOURCES_TTL
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;

    // Controlla cache se richiesta
    if (useCache && method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Se offline, prova a recuperare da localStorage
    if (!this.isOnline && method === 'GET') {
      const offlineData = this.getOfflineData(endpoint);
      if (offlineData) {
        return offlineData;
      }
      throw new Error(ERROR_MESSAGES.OFFLINE_MODE);
    }

    try {
      const options: RequestInit = {
        method,
      };

      if (data && ['POST', 'PUT'].includes(method)) {
        options.body = JSON.stringify(data);
      }

      const response = await this.fetchWithRetry(url, options);

      if (!response.success) {
        throw new Error(response.message || 'API call failed');
      }

      // Salva in cache se richiesto
      if (useCache && method === 'GET') {
        this.setInCache(cacheKey, response.data, cacheTtl);
      }

      // Salva offline per backup
      if (method === 'GET') {
        this.saveOfflineData(endpoint, response.data);
      }

      return response.data;

    } catch (error: any) {
      // Se offline durante una modifica, salva per sync successivo
      if (!this.isOnline && ['POST', 'PUT', 'DELETE'].includes(method)) {
        this.saveOfflineChange(endpoint, method, data);
        throw new Error(ERROR_MESSAGES.OFFLINE_MODE);
      }

      throw error;
    }
  }

  // === METODI CACHE ===
  private getFromCache(key: string): any | null {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      memoryCache.delete(key);
    }
    return null;
  }

  private setInCache(key: string, data: any, ttl: number): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // === METODI OFFLINE ===
  private getOfflineData(endpoint: string): any | null {
    try {
      const key = `${STORAGE_CONFIG.PREFIX}offline_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < STORAGE_CONFIG.OFFLINE_TTL) {
          return parsed.data;
        }
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Error reading offline data:', error);
    }
    return null;
  }

  private saveOfflineData(endpoint: string, data: any): void {
    try {
      const key = `${STORAGE_CONFIG.PREFIX}offline_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Error saving offline data:', error);
    }
  }

  private saveOfflineChange(endpoint: string, method: string, data: any): void {
    try {
      const changes = this.getOfflineChanges();
      changes.push({
        endpoint,
        method,
        data,
        timestamp: Date.now(),
      });
      localStorage.setItem(`${STORAGE_CONFIG.PREFIX}offline_changes`, JSON.stringify(changes));
    } catch (error) {
      console.warn('Error saving offline change:', error);
    }
  }

  private getOfflineChanges(): any[] {
    try {
      const stored = localStorage.getItem(`${STORAGE_CONFIG.PREFIX}offline_changes`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Error reading offline changes:', error);
      return [];
    }
  }

  private async syncOfflineChanges(): Promise<void> {
    const changes = this.getOfflineChanges();
    if (changes.length === 0) return;

    console.log(`🔄 Sincronizzando ${changes.length} modifiche offline...`);

    for (const change of changes) {
      try {
        await this.apiCall(change.endpoint, change.method, change.data);
      } catch (error) {
        console.error('Error syncing offline change:', error);
      }
    }

    // Pulisci le modifiche sincronizzate
    localStorage.removeItem(`${STORAGE_CONFIG.PREFIX}offline_changes`);
    console.log('✅ Sincronizzazione completata');
  }

  // === API TURNI ===
  async loadShifts(year?: number, month?: number): Promise<any> {
    let endpoint = API_ENDPOINTS.SHIFTS_LOAD;
    if (year && month !== undefined) {
      endpoint += `&year=${year}&month=${month}`;
    }
    return this.apiCall(endpoint, 'GET', undefined, true, CACHE_CONFIG.RESOURCES_TTL);
  }

  async saveShifts(year: number, month: number, shifts: Record<string, Record<string, ShiftData>>): Promise<void> {
    return this.apiCall(API_ENDPOINTS.SHIFTS_SAVE, 'POST', { year, month, shifts });
  }

  async updateShift(resourceId: string, date: string, shiftData: ShiftData): Promise<void> {
    return this.apiCall(API_ENDPOINTS.SHIFTS_UPDATE, 'PUT', { resourceId, date, shiftData });
  }

  async clearShifts(year: number, month: number): Promise<void> {
    return this.apiCall(API_ENDPOINTS.SHIFTS_CLEAR, 'DELETE', { year, month });
  }

  // === API RISORSE ===
  async getResources(): Promise<Resource[]> {
    return this.apiCall(API_ENDPOINTS.RESOURCES_LIST, 'GET', undefined, true, CACHE_CONFIG.RESOURCES_TTL);
  }

  async getActiveResources(): Promise<Resource[]> {
    return this.apiCall(API_ENDPOINTS.RESOURCES_ACTIVE, 'GET', undefined, true, CACHE_CONFIG.RESOURCES_TTL);
  }

  async createResource(resource: Omit<Resource, 'is_active'>): Promise<void> {
    return this.apiCall(API_ENDPOINTS.RESOURCES_CREATE, 'POST', resource);
  }

  async updateResource(resource: Partial<Resource> & { id: string }): Promise<void> {
    return this.apiCall(API_ENDPOINTS.RESOURCES_UPDATE, 'PUT', resource);
  }

  async deleteResource(id: string): Promise<void> {
    return this.apiCall(API_ENDPOINTS.RESOURCES_DELETE, 'DELETE', { id });
  }

  // === API IMPOSTAZIONI ===
  async getSettings(): Promise<Setting[]> {
    return this.apiCall(API_ENDPOINTS.SETTINGS_ALL, 'GET', undefined, true, CACHE_CONFIG.SETTINGS_TTL);
  }

  async getAppSettings(): Promise<Record<string, any>> {
    return this.apiCall(API_ENDPOINTS.SETTINGS_APP, 'GET', undefined, true, CACHE_CONFIG.SETTINGS_TTL);
  }

  async updateSetting(key: string, value: any, type?: string): Promise<void> {
    return this.apiCall(API_ENDPOINTS.SETTINGS_UPDATE, 'PUT', { key, value, type });
  }

  async updateSettings(settings: Record<string, { value: any; type?: string }>): Promise<void> {
    return this.apiCall(API_ENDPOINTS.SETTINGS_UPDATE.replace('update', 'bulk'), 'PUT', { settings });
  }

  // === API BACKUP ===
  async getBackups(): Promise<any[]> {
    return this.apiCall(API_ENDPOINTS.BACKUP_LIST, 'GET');
  }

  async createBackup(name: string, yearMonth?: string, tables?: string[]): Promise<void> {
    return this.apiCall(API_ENDPOINTS.BACKUP_CREATE, 'POST', { name, year_month: yearMonth, tables });
  }

  async restoreBackup(id: number): Promise<void> {
    return this.apiCall(API_ENDPOINTS.BACKUP_RESTORE, 'POST', { id });
  }

  // === API SISTEMA ===
  async getSystemStatus(): Promise<any> {
    return this.apiCall(API_ENDPOINTS.SYSTEM_STATUS, 'GET', undefined, true, CACHE_CONFIG.STATUS_TTL);
  }

  async initializeDatabase(): Promise<any> {
    return this.apiCall(API_ENDPOINTS.INIT_DATABASE, 'POST');
  }

  async checkDatabaseStatus(): Promise<any> {
    return this.apiCall(API_ENDPOINTS.INIT_STATUS, 'GET');
  }

  // === METODI UTILITY ===
  clearCache(): void {
    memoryCache.clear();
  }

  clearOfflineData(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(STORAGE_CONFIG.PREFIX)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }

  getConnectionStatus(): { online: boolean; hasOfflineChanges: boolean } {
    return {
      online: this.isOnline,
      hasOfflineChanges: this.getOfflineChanges().length > 0,
    };
  }
}

// Istanza singleton
export const apiService = new ApiService();

// Export dei tipi per uso esterno
export type { ApiResponse, ApiError, ShiftData, Resource, Setting };

export default apiService;
