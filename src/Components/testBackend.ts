/**
 * Script di test per verificare la connettività con il backend Altervista
 */

const BACKEND_URL = 'https://ocristaudo.altervista.org/rsa-schedule/api';

export interface BackendTestResult {
  isOnline: boolean;
  latency?: number;
  error?: string;
  endpoints?: {
    basic: boolean;
    resources: boolean;
    shifts: boolean;
    settings: boolean;
  };
}

/**
 * Testa la connettività con il backend
 */
export async function testBackendConnectivity(): Promise<BackendTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing backend connectivity...');
    
    // Test base
    const basicResponse = await fetch(`${BACKEND_URL}/test-basic.php`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const latency = Date.now() - startTime;
    
    if (!basicResponse.ok) {
      throw new Error(`HTTP ${basicResponse.status}: ${basicResponse.statusText}`);
    }
    
    const basicResult = await basicResponse.json();
    console.log('✅ Basic test result:', basicResult);
    
    // Test endpoints principali
    const endpoints = {
      basic: true,
      resources: await testEndpoint('/resources.php'),
      shifts: await testEndpoint('/shifts.php'),
      settings: await testEndpoint('/settings.php'),
    };
    
    return {
      isOnline: true,
      latency,
      endpoints,
    };
    
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error);
    return {
      isOnline: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Testa un singolo endpoint
 */
async function testEndpoint(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.warn(`⚠️ Endpoint ${endpoint} failed:`, error);
    return false;
  }
}

/**
 * Testa la connessione database
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  resourceCount?: number;
}> {
  try {
    console.log('🗄️ Testing database connection...');
    
    const response = await fetch(`${BACKEND_URL}/debug.php`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Database test result:', result);
    
    return {
      connected: result.database_connected || false,
      resourceCount: result.total_resources || 0,
      error: result.error || undefined,
    };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Esegue un test completo del backend
 */
export async function runFullBackendTest(): Promise<{
  connectivity: BackendTestResult;
  database: { connected: boolean; error?: string; resourceCount?: number };
  recommendation: string;
}> {
  console.log('🚀 Starting full backend test...');
  
  const connectivity = await testBackendConnectivity();
  const database = await testDatabaseConnection();
  
  let recommendation = '';
  
  if (!connectivity.isOnline) {
    recommendation = 'Backend non raggiungibile. Utilizzando modalità locale con dati hardcoded.';
  } else if (!database.connected) {
    recommendation = 'Backend online ma database offline. Verificare configurazione MySQL su Altervista.';
  } else if (database.resourceCount === 0) {
    recommendation = 'Database connesso ma vuoto. Eseguire il popolamento delle tabelle.';
  } else {
    recommendation = `✅ Sistema completamente funzionante! Database con ${database.resourceCount} risorse.`;
  }
  
  console.log('📋 Test results:', { connectivity, database, recommendation });
  
  return {
    connectivity,
    database,
    recommendation,
  };
}
