<?php
/**
 * API per la gestione delle impostazioni dell'applicazione
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
logActivity("settings_api_$method", ['action' => $action, 'ip' => $_SERVER['REMOTE_ADDR']]);

try {
    switch ($method) {
        case 'GET':
            handleGetRequest($conn, $action);
            break;
            
        case 'POST':
            handlePostRequest($conn, $action);
            break;
            
        case 'PUT':
            handlePutRequest($conn, $action);
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
        case 'all':
        case 'settings.php':
        case '':
            getAllSettings($conn);
            break;
            
        case 'app':
            getAppSettings($conn);
            break;
            
        case 'backup':
            getBackupSettings($conn);
            break;
            
        default:
            // Cerca impostazione specifica
            getSettingByKey($conn, $action);
    }
}

/**
 * Gestisce le richieste POST
 */
function handlePostRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'create':
            createSetting($conn, $data);
            break;
            
        case 'reset':
            resetToDefaults($conn);
            break;
            
        default:
            handleError('Azione POST non riconosciuta', $action, 404);
    }
}

/**
 * Gestisce le richieste PUT
 */
function handlePutRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'update':
            updateSetting($conn, $data);
            break;
            
        case 'bulk':
            bulkUpdateSettings($conn, $data);
            break;
            
        default:
            handleError('Azione PUT non riconosciuta', $action, 404);
    }
}

/**
 * Gestisce le richieste DELETE
 */
function handleDeleteRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'delete':
            if (isset($data['key'])) {
                deleteSetting($conn, $data['key']);
            } else {
                handleError('Chiave impostazione mancante', null, 400);
            }
            break;
            
        default:
            // Cancella impostazione specifica
            deleteSetting($conn, $action);
    }
}

/**
 * Ottiene tutte le impostazioni
 */
function getAllSettings($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT setting_key, setting_value, setting_type, description, 
                   created_at, updated_at 
            FROM RSA_Settings 
            ORDER BY setting_key
        ");
        $stmt->execute();
        $settings = $stmt->fetchAll();
        
        // Converte i valori nel tipo corretto
        $formattedSettings = [];
        foreach ($settings as $setting) {
            $formattedSettings[$setting['setting_key']] = [
                'value' => convertSettingValue($setting['setting_value'], $setting['setting_type']),
                'type' => $setting['setting_type'],
                'description' => $setting['description'],
                'created_at' => $setting['created_at'],
                'updated_at' => $setting['updated_at']
            ];
        }
        
        sendResponse(true, $formattedSettings, 'Impostazioni caricate');
        
    } catch (Exception $e) {
        handleError('Errore caricamento impostazioni', $e->getMessage());
    }
}

/**
 * Ottiene le impostazioni dell'applicazione
 */
function getAppSettings($conn) {
    try {
        $appKeys = ['app_name', 'app_version', 'debug_mode', 'timezone', 'language'];
        
        $placeholders = str_repeat('?,', count($appKeys) - 1) . '?';
        $stmt = $conn->prepare("
            SELECT setting_key, setting_value, setting_type 
            FROM RSA_Settings 
            WHERE setting_key IN ($placeholders)
        ");
        $stmt->execute($appKeys);
        $settings = $stmt->fetchAll();
        
        $appSettings = [];
        foreach ($settings as $setting) {
            $appSettings[$setting['setting_key']] = convertSettingValue(
                $setting['setting_value'], 
                $setting['setting_type']
            );
        }
        
        sendResponse(true, $appSettings, 'Impostazioni app caricate');
        
    } catch (Exception $e) {
        handleError('Errore caricamento impostazioni app', $e->getMessage());
    }
}

/**
 * Ottiene le impostazioni di backup
 */
function getBackupSettings($conn) {
    try {
        $backupKeys = ['auto_backup_enabled', 'backup_frequency', 'max_backups', 'last_backup'];
        
        $placeholders = str_repeat('?,', count($backupKeys) - 1) . '?';
        $stmt = $conn->prepare("
            SELECT setting_key, setting_value, setting_type 
            FROM RSA_Settings 
            WHERE setting_key IN ($placeholders)
        ");
        $stmt->execute($backupKeys);
        $settings = $stmt->fetchAll();
        
        $backupSettings = [];
        foreach ($settings as $setting) {
            $backupSettings[$setting['setting_key']] = convertSettingValue(
                $setting['setting_value'], 
                $setting['setting_type']
            );
        }
        
        sendResponse(true, $backupSettings, 'Impostazioni backup caricate');
        
    } catch (Exception $e) {
        handleError('Errore caricamento impostazioni backup', $e->getMessage());
    }
}

/**
 * Ottiene un'impostazione specifica
 */
function getSettingByKey($conn, $key) {
    try {
        $stmt = $conn->prepare("
            SELECT setting_value, setting_type, description 
            FROM RSA_Settings 
            WHERE setting_key = ?
        ");
        $stmt->execute([$key]);
        $setting = $stmt->fetch();
        
        if (!$setting) {
            handleError('Impostazione non trovata', null, 404);
        }
        
        $value = convertSettingValue($setting['setting_value'], $setting['setting_type']);
        
        sendResponse(true, [
            'key' => $key,
            'value' => $value,
            'type' => $setting['setting_type'],
            'description' => $setting['description']
        ], 'Impostazione trovata');
        
    } catch (Exception $e) {
        handleError('Errore ricerca impostazione', $e->getMessage());
    }
}

/**
 * Crea una nuova impostazione
 */
function createSetting($conn, $data) {
    if (!isset($data['key']) || !isset($data['value'])) {
        handleError('Chiave e valore sono obbligatori', null, 400);
    }
    
    $type = $data['type'] ?? 'string';
    $description = $data['description'] ?? '';
    
    if (!in_array($type, ['string', 'integer', 'boolean', 'json'])) {
        handleError('Tipo impostazione non valido', null, 400);
    }
    
    try {
        // Verifica che la chiave non esista già
        $stmt = $conn->prepare("SELECT setting_key FROM RSA_Settings WHERE setting_key = ?");
        $stmt->execute([$data['key']]);
        if ($stmt->fetch()) {
            handleError('Impostazione già esistente', null, 409);
        }
        
        $value = formatSettingValue($data['value'], $type);
        
        $stmt = $conn->prepare("
            INSERT INTO RSA_Settings (setting_key, setting_value, setting_type, description) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$data['key'], $value, $type, $description]);
        
        sendResponse(true, ['key' => $data['key']], 'Impostazione creata');
        
    } catch (Exception $e) {
        handleError('Errore creazione impostazione', $e->getMessage());
    }
}

/**
 * Aggiorna un'impostazione
 */
function updateSetting($conn, $data) {
    if (!isset($data['key'])) {
        handleError('Chiave impostazione mancante', null, 400);
    }
    
    try {
        // Verifica che l'impostazione esista
        $stmt = $conn->prepare("SELECT setting_type FROM RSA_Settings WHERE setting_key = ?");
        $stmt->execute([$data['key']]);
        $currentSetting = $stmt->fetch();
        
        if (!$currentSetting) {
            handleError('Impostazione non trovata', null, 404);
        }
        
        $updateFields = [];
        $params = [];
        
        if (isset($data['value'])) {
            $type = $data['type'] ?? $currentSetting['setting_type'];
            $value = formatSettingValue($data['value'], $type);
            $updateFields[] = "setting_value = ?";
            $params[] = $value;
        }
        
        if (isset($data['type'])) {
            if (!in_array($data['type'], ['string', 'integer', 'boolean', 'json'])) {
                handleError('Tipo impostazione non valido', null, 400);
            }
            $updateFields[] = "setting_type = ?";
            $params[] = $data['type'];
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = $data['description'];
        }
        
        if (empty($updateFields)) {
            handleError('Nessun campo da aggiornare', null, 400);
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $data['key'];
        
        $sql = "UPDATE RSA_Settings SET " . implode(', ', $updateFields) . " WHERE setting_key = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        sendResponse(true, null, 'Impostazione aggiornata');
        
    } catch (Exception $e) {
        handleError('Errore aggiornamento impostazione', $e->getMessage());
    }
}

/**
 * Aggiornamento bulk di più impostazioni
 */
function bulkUpdateSettings($conn, $data) {
    if (!isset($data['settings']) || !is_array($data['settings'])) {
        handleError('Array impostazioni mancante', null, 400);
    }
    
    try {
        $conn->beginTransaction();
        
        $updated = 0;
        $errors = [];
        
        foreach ($data['settings'] as $key => $settingData) {
            try {
                $settingData['key'] = $key;
                updateSetting($conn, $settingData);
                $updated++;
            } catch (Exception $e) {
                $errors[] = "Errore aggiornamento $key: " . $e->getMessage();
            }
        }
        
        if (empty($errors)) {
            $conn->commit();
            sendResponse(true, ['updated' => $updated], "Aggiornate $updated impostazioni");
        } else {
            $conn->rollback();
            handleError('Errori durante aggiornamento bulk', $errors);
        }
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore aggiornamento bulk', $e->getMessage());
    }
}

/**
 * Cancella un'impostazione
 */
function deleteSetting($conn, $key) {
    try {
        // Verifica che l'impostazione esista
        $stmt = $conn->prepare("SELECT setting_key FROM RSA_Settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        if (!$stmt->fetch()) {
            handleError('Impostazione non trovata', null, 404);
        }
        
        // Non permettere la cancellazione di impostazioni critiche
        $protectedKeys = ['app_name', 'app_version', 'database_version'];
        if (in_array($key, $protectedKeys)) {
            handleError('Non è possibile cancellare questa impostazione', null, 403);
        }
        
        $stmt = $conn->prepare("DELETE FROM RSA_Settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        
        sendResponse(true, null, 'Impostazione cancellata');
        
    } catch (Exception $e) {
        handleError('Errore cancellazione impostazione', $e->getMessage());
    }
}

/**
 * Ripristina le impostazioni ai valori di default
 */
function resetToDefaults($conn) {
    try {
        $conn->beginTransaction();
        
        // Cancella tutte le impostazioni non critiche
        $stmt = $conn->prepare("
            DELETE FROM RSA_Settings 
            WHERE setting_key NOT IN ('app_name', 'app_version', 'database_version')
        ");
        $stmt->execute();
        
        // Reinserisce le impostazioni di default
        $defaultSettings = [
            ['timezone', 'Europe/Rome', 'string', 'Timezone dell\'applicazione'],
            ['language', 'it', 'string', 'Lingua dell\'interfaccia'],
            ['debug_mode', 'false', 'boolean', 'Modalità debug'],
            ['auto_backup_enabled', 'true', 'boolean', 'Backup automatico abilitato'],
            ['backup_frequency', 'daily', 'string', 'Frequenza backup automatico'],
            ['max_backups', '30', 'integer', 'Numero massimo di backup da mantenere'],
            ['working_hours_start', '06:00', 'string', 'Ora inizio turni'],
            ['working_hours_end', '22:00', 'string', 'Ora fine turni'],
            ['shift_duration', '8', 'integer', 'Durata turno in ore'],
            ['max_consecutive_days', '6', 'integer', 'Massimo giorni consecutivi'],
            ['min_rest_hours', '11', 'integer', 'Ore minime di riposo tra turni']
        ];
        
        foreach ($defaultSettings as $setting) {
            $stmt = $conn->prepare("
                INSERT INTO RSA_Settings (setting_key, setting_value, setting_type, description) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute($setting);
        }
        
        $conn->commit();
        sendResponse(true, null, 'Impostazioni ripristinate ai valori di default');
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore ripristino impostazioni', $e->getMessage());
    }
}

/**
 * Converte il valore dell'impostazione nel tipo corretto
 */
function convertSettingValue($value, $type) {
    switch ($type) {
        case 'boolean':
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        case 'integer':
            return (int) $value;
        case 'json':
            return json_decode($value, true);
        case 'string':
        default:
            return $value;
    }
}

/**
 * Formatta il valore per il salvataggio nel database
 */
function formatSettingValue($value, $type) {
    switch ($type) {
        case 'boolean':
            return $value ? 'true' : 'false';
        case 'integer':
            return (string) (int) $value;
        case 'json':
            return json_encode($value);
        case 'string':
        default:
            return (string) $value;
    }
}

?>
