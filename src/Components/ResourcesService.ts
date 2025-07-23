/**
 * RSA Schedule - Resources Service (Database Version)
 * Gestisce le risorse OSS tramite database invece di file hardcoded
 */

import { useState, useEffect } from 'react';
import { Resource, ResourceType, Days } from "@/model/model";
import { apiService, ApiResponse } from "./apiService";

export class ResourcesService {
  private static instance: ResourcesService;
  private cachedResources: Resource[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minuti cache

  private constructor() {}

  public static getInstance(): ResourcesService {
    if (!ResourcesService.instance) {
      ResourcesService.instance = new ResourcesService();
    }
    return ResourcesService.instance;
  }

  /**
   * Legge tutte le risorse dal database (con cache)
   */
  async getAllResources(): Promise<Resource[]> {
    const now = Date.now();
    
    // Usa cache se ancora valida
    if (this.cachedResources && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedResources;
    }

    try {
      const response = await apiService.getAllResources();
      
      if (response.success && response.data) {
        // Converte i dati dal backend al formato frontend
        this.cachedResources = response.data.map(this.convertFromApi);
        this.lastFetchTime = now;
        return this.cachedResources;
      } else {
        console.error('Failed to fetch resources:', response.error);
        // Fallback ai dati cached se disponibili
        return this.cachedResources || [];
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      // Fallback ai dati cached se disponibili
      return this.cachedResources || [];
    }
  }

  /**
   * Salva una risorsa (nuova o aggiornamento)
   */
  async saveResource(resource: Resource): Promise<boolean> {
    try {
      const apiData = this.convertToApi(resource);
      const response = await apiService.saveResource(apiData);
      
      if (response.success) {
        // Invalida cache per forzare reload
        this.invalidateCache();
        return true;
      } else {
        console.error('Failed to save resource:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving resource:', error);
      return false;
    }
  }

  /**
   * Salva tutte le risorse (batch operation)
   */
  async saveAllResources(resources: Resource[]): Promise<boolean> {
    try {
      const apiData = resources.map(this.convertToApi);
      const response = await apiService.saveAllResources(apiData);
      
      if (response.success) {
        // Invalida cache per forzare reload
        this.invalidateCache();
        return true;
      } else {
        console.error('Failed to save all resources:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving all resources:', error);
      return false;
    }
  }

  /**
   * Elimina una risorsa
   */
  async deleteResource(resourceId: string): Promise<boolean> {
    try {
      const response = await apiService.deleteResource(resourceId);
      
      if (response.success) {
        // Invalida cache per forzare reload
        this.invalidateCache();
        return true;
      } else {
        console.error('Failed to delete resource:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      return false;
    }
  }

  /**
   * Trova una risorsa per ID
   */
  async getResourceById(id: string): Promise<Resource | null> {
    const resources = await this.getAllResources();
    return resources.find(r => r.id === id) || null;
  }

  /**
   * Filtra risorse per tipo
   */
  async getResourcesByType(type: ResourceType): Promise<Resource[]> {
    const resources = await this.getAllResources();
    return resources.filter(r => r.type === type);
  }

  /**
   * Invalida la cache per forzare il reload dalla API
   */
  invalidateCache(): void {
    this.cachedResources = null;
    this.lastFetchTime = 0;
  }

  /**
   * Converte i dati dal formato API al formato frontend
   */
  private convertFromApi(apiData: any): Resource {
    return {
      id: apiData.id,
      firstName: apiData.firstName,
      lastName: apiData.lastName,
      type: apiData.type as ResourceType,
      forbiddenShiftTypes: apiData.forbiddenShiftTypes || [],
      fixedDays: apiData.fixedDays || []
    };
  }

  /**
   * Converte i dati dal formato frontend al formato API
   */
  private convertToApi(resource: Resource): any {
    return {
      id: resource.id,
      firstName: resource.firstName,
      lastName: resource.lastName,
      type: resource.type,
      forbiddenShiftTypes: resource.forbiddenShiftTypes,
      fixedDays: resource.fixedDays
    };
  }
}

// Esporta istanza singleton
export const resourcesService = ResourcesService.getInstance();

// Hook React per usare le risorse
export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadResources = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await resourcesService.getAllResources();
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const refreshResources = () => {
    resourcesService.invalidateCache();
    loadResources();
  };

  return {
    resources,
    loading,
    error,
    refreshResources
  };
}
