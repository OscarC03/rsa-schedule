<?php
/**
 * Script di inizializzazione del database
 * Crea tutte le tabelle necessarie e inserisce i dati di default
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

// Verifica rate limiting
checkRateLimit(10, 60); // Max 10 richieste di init per minuto

// Ottiene informazioni richiesta
$request = getRequestInfo();
$method = $request['method'];

// Logga l'attività
logActivity("database_init_$method", ['ip' => $_SERVER['REMOTE_ADDR']]);

try {
    switch ($method) {
        case 'GET':
            checkDatabaseStatus();
            break;
            
        case 'POST':
            initializeDatabase();
            break;
            
        case 'PUT':
            updateDatabase();
            break;
            
        case 'DELETE':
            resetDatabase();
            break;
            
        default:
            handleError('Metodo HTTP non supportato', null, 405);
    }
} catch (Exception $e) {
    handleError('Errore interno del server', $e->getMessage());
}

/**
 * Controlla lo stato del database
 */
function checkDatabaseStatus() {
    try {
        $db = new Database();
        $status = $db->checkDatabaseStatus();
        
        if ($status['connected']) {
            $allTablesExist = true;
            $totalRecords = 0;
            
            foreach ($status['tables'] as $table => $info) {
                if (!$info['exists']) {
                    $allTablesExist = false;
                }
                $totalRecords += $info['records'];
            }
            
            $status['initialized'] = $allTablesExist;
            $status['total_records'] = $totalRecords;
            $status['needs_setup'] = !$allTablesExist || $totalRecords === 0;
            
            sendResponse(true, $status, 'Status database recuperato');
        } else {
            sendResponse(false, $status, 'Impossibile connettersi al database');
        }
        
    } catch (Exception $e) {
        handleError('Errore controllo status database', $e->getMessage());
    }
}

/**
 * Inizializza il database creando tabelle e dati di default
 */
function initializeDatabase() {
    try {
        $db = new Database();
        
        // Verifica prima lo stato attuale
        $status = $db->checkDatabaseStatus();
        
        if (!$status['connected']) {
            handleError('Impossibile connettersi al database', $status['error'] ?? 'Errore sconosciuto');
        }
        
        // Log dello stato iniziale per debug
        logActivity('database_init_start', [
            'current_status' => $status,
            'debug_mode' => DEBUG_MODE
        ]);
        
        // Inizializza il database
        $result = $db->initializeDatabase();
        
        // Log del risultato per debug
        logActivity('database_init_result', [
            'result' => $result,
            'debug_info' => DEBUG_MODE ? $result : 'debug_disabled'
        ]);
        
        if ($result['success']) {
            // Verifica che tutto sia stato creato correttamente
            $newStatus = $db->checkDatabaseStatus();
            
            logActivity('database_initialized', [
                'tables_created' => array_keys($newStatus['tables']),
                'total_records' => array_sum(array_column($newStatus['tables'], 'records'))
            ]);
            
            sendResponse(true, [
                'initialization_result' => $result,
                'database_status' => $newStatus
            ], 'Database inizializzato con successo');
        } else {
            // Errore più dettagliato
            $errorDetails = [
                'main_error' => $result['message'],
                'debug_mode' => DEBUG_MODE,
                'database_config' => [
                    'host' => DB_HOST,
                    'database' => DB_NAME,
                    'user' => DB_USER
                ]
            ];
            
            if (DEBUG_MODE) {
                $errorDetails['full_result'] = $result;
            }
            
            handleError('Errore durante l\'inizializzazione', $errorDetails);
        }
        
    } catch (Exception $e) {
        $errorDetails = [
            'exception_message' => $e->getMessage(),
            'exception_file' => $e->getFile(),
            'exception_line' => $e->getLine(),
            'debug_mode' => DEBUG_MODE
        ];
        
        if (DEBUG_MODE) {
            $errorDetails['stack_trace'] = $e->getTraceAsString();
        }
        
        handleError('Errore inizializzazione database', $errorDetails);
    }
}

/**
 * Aggiorna la struttura del database (migrazioni)
 */
function updateDatabase() {
    $data = getJsonInput();
    $targetVersion = $data['version'] ?? '1.0.0';
    
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        // Ottiene la versione attuale del database
        $stmt = $conn->prepare("
            SELECT setting_value FROM RSA_Settings 
            WHERE setting_key = 'database_version'
        ");
        $stmt->execute();
        $currentVersion = $stmt->fetchColumn() ?: '0.0.0';
        
        if (version_compare($currentVersion, $targetVersion, '>=')) {
            sendResponse(true, [
                'current_version' => $currentVersion,
                'target_version' => $targetVersion
            ], 'Database già aggiornato');
            return;
        }
        
        $conn->beginTransaction();
        
        $migrationsApplied = [];
        
        // Applica migrazioni necessarie
        if (version_compare($currentVersion, '1.0.0', '<')) {
            applyMigration_1_0_0($conn);
            $migrationsApplied[] = '1.0.0';
        }
        
        // Aggiorna la versione del database
        $stmt = $conn->prepare("
            UPDATE RSA_Settings 
            SET setting_value = ?, updated_at = NOW() 
            WHERE setting_key = 'database_version'
        ");
        $stmt->execute([$targetVersion]);
        
        $conn->commit();
        
        logActivity('database_updated', [
            'from_version' => $currentVersion,
            'to_version' => $targetVersion,
            'migrations' => $migrationsApplied
        ]);
        
        sendResponse(true, [
            'from_version' => $currentVersion,
            'to_version' => $targetVersion,
            'migrations_applied' => $migrationsApplied
        ], 'Database aggiornato con successo');
        
    } catch (Exception $e) {
        if (isset($conn)) {
            $conn->rollback();
        }
        handleError('Errore aggiornamento database', $e->getMessage());
    }
}

/**
 * Reset completo del database (ATTENZIONE: cancella tutti i dati)
 */
function resetDatabase() {
    $data = getJsonInput();
    
    if (!isset($data['confirm']) || $data['confirm'] !== 'RESET_ALL_DATA') {
        handleError('Conferma reset mancante', 'Per resettare inserire confirm: "RESET_ALL_DATA"', 400);
    }
    
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        $conn->beginTransaction();
        
        // Crea backup completo prima del reset
        $backupData = [];
        $tables = ['RSA_Shifts', 'RSA_Resources', 'RSA_Settings', 'RSA_Backups'];
        
        foreach ($tables as $table) {
            try {
                $stmt = $conn->prepare("SELECT * FROM `$table`");
                $stmt->execute();
                $backupData[$table] = $stmt->fetchAll();
            } catch (Exception $e) {
                // Tabella potrebbe non esistere
                $backupData[$table] = [];
            }
        }
        
        // Salva backup di emergenza
        $stmt = $conn->prepare("
            INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
            VALUES (?, ?, 'emergency', ?)
        ");
        $stmt->execute([
            'emergency_before_reset_' . date('YmdHis'),
            json_encode([
                'timestamp' => date('Y-m-d H:i:s'),
                'action' => 'full_reset',
                'tables' => $backupData
            ]),
            date('Y-m')
        ]);
        
        // Cancella tutte le tabelle
        $stmt = $conn->prepare("SET FOREIGN_KEY_CHECKS = 0");
        $stmt->execute();
        
        foreach ($tables as $table) {
            try {
                $stmt = $conn->prepare("DROP TABLE IF EXISTS `$table`");
                $stmt->execute();
            } catch (Exception $e) {
                // Continua anche se la tabella non esiste
            }
        }
        
        $stmt = $conn->prepare("SET FOREIGN_KEY_CHECKS = 1");
        $stmt->execute();
        
        $conn->commit();
        
        // Reinizializza il database
        $result = $db->initializeDatabase();
        
        logActivity('database_reset', [
            'emergency_backup_created' => true,
            'tables_dropped' => $tables,
            'reinitialized' => $result['success']
        ]);
        
        sendResponse(true, [
            'reset_completed' => true,
            'emergency_backup_created' => true,
            'reinitialization_result' => $result
        ], 'Database resettato e reinizializzato');
        
    } catch (Exception $e) {
        if (isset($conn)) {
            $conn->rollback();
        }
        handleError('Errore reset database', $e->getMessage());
    }
}

/**
 * Migrazione alla versione 1.0.0
 */
function applyMigration_1_0_0($conn) {
    // Aggiunge indici per migliorare le performance
    try {
        $stmt = $conn->prepare("
            ALTER TABLE RSA_Shifts 
            ADD INDEX idx_shift_date (shift_date),
            ADD INDEX idx_year_month (year_month),
            ADD INDEX idx_resource_date (resource_id, shift_date)
        ");
        $stmt->execute();
    } catch (Exception $e) {
        // Indici potrebbero già esistere
    }
    
    try {
        $stmt = $conn->prepare("
            ALTER TABLE RSA_Resources 
            ADD INDEX idx_resource_type (resource_type),
            ADD INDEX idx_active (is_active)
        ");
        $stmt->execute();
    } catch (Exception $e) {
        // Indici potrebbero già esistere
    }
    
    try {
        $stmt = $conn->prepare("
            ALTER TABLE RSA_Settings 
            ADD INDEX idx_setting_key (setting_key)
        ");
        $stmt->execute();
    } catch (Exception $e) {
        // Indice potrebbe già esistere
    }
    
    try {
        $stmt = $conn->prepare("
            ALTER TABLE RSA_Backups 
            ADD INDEX idx_backup_type (backup_type),
            ADD INDEX idx_year_month (year_month),
            ADD INDEX idx_created_at (created_at)
        ");
        $stmt->execute();
    } catch (Exception $e) {
        // Indici potrebbero già esistere
    }
    
    // Aggiunge impostazioni mancanti
    $newSettings = [
        ['working_hours_start', '06:00', 'string', 'Ora inizio turni'],
        ['working_hours_end', '22:00', 'string', 'Ora fine turni'],
        ['shift_duration', '8', 'integer', 'Durata turno in ore'],
        ['max_consecutive_days', '6', 'integer', 'Massimo giorni consecutivi'],
        ['min_rest_hours', '11', 'integer', 'Ore minime di riposo tra turni'],
        ['database_version', '1.0.0', 'string', 'Versione del database']
    ];
    
    foreach ($newSettings as $setting) {
        $stmt = $conn->prepare("
            INSERT IGNORE INTO RSA_Settings (setting_key, setting_value, setting_type, description) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute($setting);
    }
}

/**
 * Test di connettività del database
 */
function testConnection() {
    try {
        $db = new Database();
        $conn = $db->connect();
        
        if ($conn) {
            sendResponse(true, [
                'connected' => true,
                'server_info' => $conn->getAttribute(PDO::ATTR_SERVER_VERSION),
                'connection_status' => $conn->getAttribute(PDO::ATTR_CONNECTION_STATUS)
            ], 'Connessione database OK');
        } else {
            sendResponse(false, null, 'Impossibile connettersi al database');
        }
        
    } catch (Exception $e) {
        handleError('Errore test connessione', $e->getMessage());
    }
}

// Se chiamato direttamente via browser per test
if (isset($_GET['test'])) {
    testConnection();
}

?>
