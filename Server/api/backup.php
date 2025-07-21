<?php
/**
 * API per la gestione dei backup
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

// Verifica rate limiting
checkRateLimit();

// Inizializza database
$db = new Database();
$conn = $db->getConnection();

// Ottiene informazioni richiesta
$request = getRequestInfo();
$method = $request['method'];
$action = $request['action'];

// Logga l'attività
logActivity("backup_api_$method", ['action' => $action, 'ip' => $_SERVER['REMOTE_ADDR']]);

try {
    switch ($method) {
        case 'GET':
            handleGetRequest($conn, $action);
            break;
            
        case 'POST':
            handlePostRequest($conn, $action);
            break;
            
        case 'DELETE':
            handleDeleteRequest($conn, $action);
            break;
            
        default:
            handleError('Metodo HTTP non supportato', null, 405);
    }
} catch (Exception $e) {
    handleError('Errore interno del server', $e->getMessage());
}

/**
 * Gestisce le richieste GET
 */
function handleGetRequest($conn, $action) {
    switch ($action) {
        case 'list':
        case 'backup.php':
        case '':
            listBackups($conn);
            break;
            
        case 'download':
            downloadBackup($conn);
            break;
            
        case 'status':
            getBackupStatus($conn);
            break;
            
        default:
            // Cerca backup specifico per ID
            if (is_numeric($action)) {
                getBackupById($conn, $action);
            } else {
                handleError('Azione GET non riconosciuta', $action, 404);
            }
    }
}

/**
 * Gestisce le richieste POST
 */
function handlePostRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'create':
            createManualBackup($conn, $data);
            break;
            
        case 'restore':
            restoreBackup($conn, $data);
            break;
            
        case 'auto':
            createAutomaticBackup($conn, $data);
            break;
            
        case 'cleanup':
            cleanupOldBackups($conn, $data);
            break;
            
        default:
            handleError('Azione POST non riconosciuta', $action, 404);
    }
}

/**
 * Gestisce le richieste DELETE
 */
function handleDeleteRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'delete':
            if (isset($data['id'])) {
                deleteBackup($conn, $data['id']);
            } else {
                handleError('ID backup mancante', null, 400);
            }
            break;
            
        default:
            // Cancella backup specifico per ID
            if (is_numeric($action)) {
                deleteBackup($conn, $action);
            } else {
                handleError('Azione DELETE non riconosciuta', $action, 404);
            }
    }
}

/**
 * Elenca tutti i backup
 */
function listBackups($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT id, backup_name, backup_type, year_month, 
                   created_at, 
                   LENGTH(backup_data) as size_bytes
            FROM RSA_Backups 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $backups = $stmt->fetchAll();
        
        // Formatta i dati per la risposta
        foreach ($backups as &$backup) {
            $backup['size_mb'] = round($backup['size_bytes'] / 1024 / 1024, 2);
            $backup['age_days'] = floor((time() - strtotime($backup['created_at'])) / 86400);
        }
        
        sendResponse(true, $backups, 'Lista backup recuperata');
        
    } catch (Exception $e) {
        handleError('Errore caricamento backup', $e->getMessage());
    }
}

/**
 * Ottiene un backup specifico per ID
 */
function getBackupById($conn, $id) {
    try {
        $stmt = $conn->prepare("
            SELECT id, backup_name, backup_type, year_month, backup_data, created_at 
            FROM RSA_Backups 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $backup = $stmt->fetch();
        
        if (!$backup) {
            handleError('Backup non trovato', null, 404);
        }
        
        // Decodifica i dati del backup
        $backup['backup_data'] = json_decode($backup['backup_data'], true);
        
        sendResponse(true, $backup, 'Backup trovato');
        
    } catch (Exception $e) {
        handleError('Errore ricerca backup', $e->getMessage());
    }
}

/**
 * Crea un backup manuale
 */
function createManualBackup($conn, $data) {
    if (!isset($data['name'])) {
        handleError('Nome backup obbligatorio', null, 400);
    }
    
    $yearMonth = $data['year_month'] ?? date('Y-m');
    $includeTables = $data['tables'] ?? ['RSA_Shifts', 'RSA_Resources', 'RSA_Settings'];
    
    try {
        $conn->beginTransaction();
        
        $backupData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'manual',
            'year_month' => $yearMonth,
            'created_by' => 'manual_request',
            'tables' => []
        ];
        
        // Backup delle tabelle richieste
        foreach ($includeTables as $table) {
            if (!in_array($table, ['RSA_Shifts', 'RSA_Resources', 'RSA_Settings', 'RSA_Backups'])) {
                continue; // Salta tabelle non valide
            }
            
            $stmt = $conn->prepare("SELECT * FROM `$table`");
            $stmt->execute();
            $tableData = $stmt->fetchAll();
            
            $backupData['tables'][$table] = [
                'records_count' => count($tableData),
                'data' => $tableData
            ];
        }
        
        // Salva il backup
        $stmt = $conn->prepare("
            INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
            VALUES (?, ?, 'manual', ?)
        ");
        
        $stmt->execute([
            $data['name'],
            json_encode($backupData),
            $yearMonth
        ]);
        
        $backupId = $conn->lastInsertId();
        
        $conn->commit();
        
        sendResponse(true, [
            'id' => $backupId,
            'name' => $data['name'],
            'tables_count' => count($backupData['tables']),
            'total_records' => array_sum(array_column($backupData['tables'], 'records_count'))
        ], 'Backup creato con successo');
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore creazione backup', $e->getMessage());
    }
}

/**
 * Crea un backup automatico
 */
function createAutomaticBackup($conn, $data) {
    $yearMonth = $data['year_month'] ?? date('Y-m');
    
    try {
        // Verifica se esiste già un backup automatico recente
        $stmt = $conn->prepare("
            SELECT id FROM RSA_Backups 
            WHERE backup_type = 'automatic' 
            AND year_month = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
        ");
        $stmt->execute([$yearMonth]);
        
        if ($stmt->fetch()) {
            sendResponse(true, null, 'Backup automatico già esistente per oggi');
            return;
        }
        
        $conn->beginTransaction();
        
        $backupData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'automatic',
            'year_month' => $yearMonth,
            'created_by' => 'auto_scheduler',
            'tables' => []
        ];
        
        // Backup solo turni per il mese specificato
        $stmt = $conn->prepare("SELECT * FROM RSA_Shifts WHERE year_month = ?");
        $stmt->execute([$yearMonth]);
        $shifts = $stmt->fetchAll();
        
        $backupData['tables']['RSA_Shifts'] = [
            'records_count' => count($shifts),
            'data' => $shifts
        ];
        
        // Salva il backup
        $backupName = "auto_backup_" . $yearMonth . "_" . date('His');
        $stmt = $conn->prepare("
            INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
            VALUES (?, ?, 'automatic', ?)
        ");
        
        $stmt->execute([
            $backupName,
            json_encode($backupData),
            $yearMonth
        ]);
        
        // Aggiorna timestamp ultimo backup nelle impostazioni
        $stmt = $conn->prepare("
            UPDATE RSA_Settings 
            SET setting_value = ? 
            WHERE setting_key = 'last_backup'
        ");
        $stmt->execute([date('Y-m-d H:i:s')]);
        
        $conn->commit();
        
        sendResponse(true, [
            'name' => $backupName,
            'records_count' => count($shifts)
        ], 'Backup automatico creato');
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore backup automatico', $e->getMessage());
    }
}

/**
 * Ripristina un backup
 */
function restoreBackup($conn, $data) {
    if (!isset($data['id'])) {
        handleError('ID backup mancante', null, 400);
    }
    
    try {
        // Recupera il backup
        $stmt = $conn->prepare("
            SELECT backup_name, backup_data, backup_type, year_month 
            FROM RSA_Backups 
            WHERE id = ?
        ");
        $stmt->execute([$data['id']]);
        $backup = $stmt->fetch();
        
        if (!$backup) {
            handleError('Backup non trovato', null, 404);
        }
        
        $backupData = json_decode($backup['backup_data'], true);
        
        if (!$backupData || !isset($backupData['tables'])) {
            handleError('Dati backup corrotti', null, 400);
        }
        
        $conn->beginTransaction();
        
        // Crea backup di sicurezza prima del ripristino
        $safetyBackupName = "before_restore_" . date('YmdHis');
        $currentData = [];
        
        foreach (array_keys($backupData['tables']) as $table) {
            $stmt = $conn->prepare("SELECT * FROM `$table`");
            $stmt->execute();
            $currentData[$table] = $stmt->fetchAll();
        }
        
        $stmt = $conn->prepare("
            INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
            VALUES (?, ?, 'safety', ?)
        ");
        $stmt->execute([
            $safetyBackupName,
            json_encode(['timestamp' => date('Y-m-d H:i:s'), 'tables' => $currentData]),
            $backup['year_month']
        ]);
        
        $restoredRecords = 0;
        
        // Ripristina ogni tabella
        foreach ($backupData['tables'] as $table => $tableInfo) {
            if (!in_array($table, ['RSA_Shifts', 'RSA_Resources', 'RSA_Settings'])) {
                continue; // Salta tabelle non sicure
            }
            
            // Cancella dati esistenti per il periodo
            if ($table === 'RSA_Shifts') {
                $stmt = $conn->prepare("DELETE FROM `$table` WHERE year_month = ?");
                $stmt->execute([$backup['year_month']]);
            } else {
                $stmt = $conn->prepare("DELETE FROM `$table`");
                $stmt->execute();
            }
            
            // Ripristina i dati
            if (!empty($tableInfo['data'])) {
                foreach ($tableInfo['data'] as $record) {
                    $columns = array_keys($record);
                    $placeholders = str_repeat('?,', count($columns) - 1) . '?';
                    
                    $sql = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES ($placeholders)";
                    $stmt = $conn->prepare($sql);
                    $stmt->execute(array_values($record));
                    $restoredRecords++;
                }
            }
        }
        
        $conn->commit();
        
        sendResponse(true, [
            'restored_records' => $restoredRecords,
            'safety_backup' => $safetyBackupName,
            'restored_tables' => array_keys($backupData['tables'])
        ], 'Backup ripristinato con successo');
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore ripristino backup', $e->getMessage());
    }
}

/**
 * Cancella un backup
 */
function deleteBackup($conn, $id) {
    try {
        // Verifica che il backup esista
        $stmt = $conn->prepare("SELECT backup_name, backup_type FROM RSA_Backups WHERE id = ?");
        $stmt->execute([$id]);
        $backup = $stmt->fetch();
        
        if (!$backup) {
            handleError('Backup non trovato', null, 404);
        }
        
        // Non permettere la cancellazione di backup di sicurezza recenti
        if ($backup['backup_type'] === 'safety') {
            $stmt = $conn->prepare("
                SELECT created_at FROM RSA_Backups 
                WHERE id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute([$id]);
            if ($stmt->fetch()) {
                handleError('Non è possibile cancellare backup di sicurezza recenti', null, 403);
            }
        }
        
        $stmt = $conn->prepare("DELETE FROM RSA_Backups WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse(true, null, 'Backup cancellato');
        
    } catch (Exception $e) {
        handleError('Errore cancellazione backup', $e->getMessage());
    }
}

/**
 * Pulisce i backup vecchi
 */
function cleanupOldBackups($conn, $data) {
    $maxDays = $data['max_days'] ?? 30;
    $keepSafetyBackups = $data['keep_safety'] ?? true;
    
    try {
        $conditions = ["created_at < DATE_SUB(NOW(), INTERVAL ? DAY)"];
        $params = [$maxDays];
        
        if ($keepSafetyBackups) {
            $conditions[] = "backup_type != 'safety'";
        }
        
        $sql = "DELETE FROM RSA_Backups WHERE " . implode(' AND ', $conditions);
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $deletedCount = $stmt->rowCount();
        
        sendResponse(true, ['deleted_count' => $deletedCount], "Cancellati $deletedCount backup vecchi");
        
    } catch (Exception $e) {
        handleError('Errore pulizia backup', $e->getMessage());
    }
}

/**
 * Ottiene lo stato dei backup
 */
function getBackupStatus($conn) {
    try {
        // Statistiche generali
        $stmt = $conn->prepare("
            SELECT 
                backup_type,
                COUNT(*) as count,
                MAX(created_at) as last_backup,
                SUM(LENGTH(backup_data)) as total_size
            FROM RSA_Backups 
            GROUP BY backup_type
        ");
        $stmt->execute();
        $stats = $stmt->fetchAll();
        
        // Backup più recente
        $stmt = $conn->prepare("
            SELECT backup_name, backup_type, created_at 
            FROM RSA_Backups 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute();
        $lastBackup = $stmt->fetch();
        
        // Impostazioni backup
        $stmt = $conn->prepare("
            SELECT setting_key, setting_value 
            FROM RSA_Settings 
            WHERE setting_key IN ('auto_backup_enabled', 'max_backups', 'last_backup')
        ");
        $stmt->execute();
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        
        sendResponse(true, [
            'statistics' => $stats,
            'last_backup' => $lastBackup,
            'settings' => $settings,
            'auto_backup_enabled' => ($settings['auto_backup_enabled'] ?? 'false') === 'true'
        ], 'Status backup recuperato');
        
    } catch (Exception $e) {
        handleError('Errore status backup', $e->getMessage());
    }
}

/**
 * Download di un backup in formato JSON
 */
function downloadBackup($conn) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        handleError('ID backup mancante', null, 400);
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT backup_name, backup_data, created_at 
            FROM RSA_Backups 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $backup = $stmt->fetch();
        
        if (!$backup) {
            handleError('Backup non trovato', null, 404);
        }
        
        // Imposta headers per download
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $backup['backup_name'] . '.json"');
        header('Content-Length: ' . strlen($backup['backup_data']));
        
        echo $backup['backup_data'];
        exit;
        
    } catch (Exception $e) {
        handleError('Errore download backup', $e->getMessage());
    }
}

?>
