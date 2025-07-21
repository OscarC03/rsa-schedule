/**
 * Configurazione API per RSA Schedule Manager
 * Gestisce la connessione tra frontend Next.js e backend PHP
 */

// Configurazione ambiente
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// URL base delle API
export const API_CONFIG = {
  // In produzione su Altervista
  PRODUCTION_BASE_URL: 'https://tuosito.altervista.org/Server/api',
  
  // In sviluppo locale (se hai un server PHP locale)
  DEVELOPMENT_BASE_URL: 'http://localhost/rsa-schedule/Server/api',
  
  // URL corrente basato sull'ambiente
  BASE_URL: isProduction 
    ? 'https://tuosito.altervista.org/Server/api'
    : 'http://localhost/rsa-schedule/Server/api',
  
  // Timeout per le richieste
  TIMEOUT: 30000,
  
  // Headers di default
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Retry policy
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Endpoint API disponibili
export const API_ENDPOINTS = {
  // Inizializzazione
  INIT_STATUS: '/init.php',
  INIT_DATABASE: '/init.php',
  
  // Turni
  SHIFTS_LOAD: '/shifts.php?action=load',
  SHIFTS_SAVE: '/shifts.php?action=save',
  SHIFTS_UPDATE: '/shifts.php?action=update',
  SHIFTS_CLEAR: '/shifts.php?action=clear',
  SHIFTS_RESOURCES: '/shifts.php?action=resources',
  
  // Risorse OSS
  RESOURCES_LIST: '/resources.php?action=list',
  RESOURCES_ACTIVE: '/resources.php?action=active',
  RESOURCES_CREATE: '/resources.php?action=create',
  RESOURCES_UPDATE: '/resources.php?action=update',
  RESOURCES_DELETE: '/resources.php?action=delete',
  
  // Impostazioni
  SETTINGS_ALL: '/settings.php?action=all',
  SETTINGS_APP: '/settings.php?action=app',
  SETTINGS_BACKUP: '/settings.php?action=backup',
  SETTINGS_CREATE: '/settings.php?action=create',
  SETTINGS_UPDATE: '/settings.php?action=update',
  SETTINGS_DELETE: '/settings.php?action=delete',
  
  // Backup
  BACKUP_LIST: '/backup.php?action=list',
  BACKUP_STATUS: '/backup.php?action=status',
  BACKUP_CREATE: '/backup.php?action=create',
  BACKUP_RESTORE: '/backup.php?action=restore',
  BACKUP_AUTO: '/backup.php?action=auto',
  
  // Status sistema
  SYSTEM_STATUS: '/status.php',
};

// Tipi di errore personalizzati
export const API_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
};

// Configurazione cache
export const CACHE_CONFIG = {
  // Durata cache in millisecondi
  RESOURCES_TTL: 5 * 60 * 1000, // 5 minuti
  SETTINGS_TTL: 10 * 60 * 1000, // 10 minuti
  STATUS_TTL: 30 * 1000, // 30 secondi
  
  // Chiavi cache
  CACHE_KEYS: {
    RESOURCES: 'rsa_resources',
    SETTINGS: 'rsa_settings',
    SYSTEM_STATUS: 'rsa_status',
    SHIFTS_PREFIX: 'rsa_shifts_',
  },
};

// Configurazione localStorage fallback
export const STORAGE_CONFIG = {
  // Prefisso per le chiavi localStorage
  PREFIX: 'rsa_schedule_',
  
  // Chiavi di storage
  KEYS: {
    SHIFTS: 'shifts',
    RESOURCES: 'resources',
    SETTINGS: 'settings',
    LAST_SYNC: 'last_sync',
    OFFLINE_MODE: 'offline_mode',
  },
  
  // Durata validità dati offline (millisecondi)
  OFFLINE_TTL: 24 * 60 * 60 * 1000, // 24 ore
};

// Configurazione sync
export const SYNC_CONFIG = {
  // Intervallo sync automatico (millisecondi)
  AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minuti
  
  // Timeout per determinare se siamo offline
  OFFLINE_TIMEOUT: 10000, // 10 secondi
  
  // Massimo numero di modifiche offline da sincronizzare
  MAX_OFFLINE_CHANGES: 100,
};

// Messaggi di errore localizzati
export const ERROR_MESSAGES = {
  [API_ERRORS.NETWORK_ERROR]: 'Errore di connessione. Controlla la tua connessione internet.',
  [API_ERRORS.TIMEOUT_ERROR]: 'Richiesta scaduta. Il server potrebbe essere sovraccarico.',
  [API_ERRORS.SERVER_ERROR]: 'Errore del server. Riprova tra qualche minuto.',
  [API_ERRORS.VALIDATION_ERROR]: 'Dati non validi. Controlla i campi inseriti.',
  [API_ERRORS.NOT_FOUND]: 'Risorsa non trovata.',
  [API_ERRORS.UNAUTHORIZED]: 'Accesso non autorizzato.',
  [API_ERRORS.RATE_LIMITED]: 'Troppe richieste. Attendi prima di riprovare.',
  GENERIC_ERROR: 'Si è verificato un errore imprevisto.',
  OFFLINE_MODE: 'Modalità offline attiva. Le modifiche saranno sincronizzate quando tornerai online.',
};

// Configurazione environment-specific
if (typeof window !== 'undefined') {
  // Lato client - aggiungi listener per online/offline
  window.addEventListener('online', () => {
    console.log('🌐 Connessione ristabilita');
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 Connessione persa - modalità offline');
  });
}

export default {
  API_CONFIG,
  API_ENDPOINTS,
  API_ERRORS,
  CACHE_CONFIG,
  STORAGE_CONFIG,
  SYNC_CONFIG,
  ERROR_MESSAGES,
};
