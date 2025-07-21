<?php
/**
 * API per la gestione dei turni OSS
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
logActivity("shifts_api_$method", ['action' => $action, 'ip' => $_SERVER['REMOTE_ADDR']]);

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
        case 'load':
            loadShifts($conn);
            break;
            
        case 'resources':
            loadResources($conn);
            break;
            
        case 'status':
            getDatabaseStatus($conn);
            break;
            
        default:
            handleError('Azione GET non riconosciuta', $action, 404);
    }
}

/**
 * Gestisce le richieste POST
 */
function handlePostRequest($conn, $action) {
    $data = getJsonInput();
    
    switch ($action) {
        case 'save':
            saveShifts($conn, $data);
            break;
            
        case 'backup':
            createBackup($conn, $data);
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
            updateShift($conn, $data);
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
        case 'clear':
            clearShifts($conn, $data);
            break;
            
        default:
            handleError('Azione DELETE non riconosciuta', $action, 404);
    }
}

/**
 * Carica i turni per un mese specifico
 */
function loadShifts($conn) {
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? (date('n') - 1); // JavaScript usa mesi 0-based
    
    if (!is_numeric($year) || !is_numeric($month)) {
        handleError('Anno e mese devono essere numerici', null, 400);
    }
    
    // Converte il mese JavaScript (0-based) in formato database
    $dbMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
    $yearMonth = "$year-$dbMonth";
    
    try {
        $stmt = $conn->prepare("
            SELECT resource_id, resource_name, shift_date, shift_type, floor_number,
                   absence_type, absence_hours, custom_color
            FROM RSA_Shifts 
            WHERE year_month = ?
            ORDER BY shift_date, resource_id
        ");
        $stmt->execute([$yearMonth]);
        $shifts = $stmt->fetchAll();
        
        // Converte i risultati nel formato atteso dal frontend
        $formattedShifts = [];
        foreach ($shifts as $shift) {
            $formattedShifts[] = [
                'resourceId' => $shift['resource_id'],
                'resourceName' => $shift['resource_name'],
                'date' => $shift['shift_date'],
                'shiftType' => $shift['shift_type'],
                'floor' => (int)$shift['floor_number'],
                'absence' => $shift['absence_type'],
                'absenceHours' => $shift['absence_hours'] ? (float)$shift['absence_hours'] : null,
                'customColor' => $shift['custom_color']
            ];
        }
        
        sendResponse(true, $formattedShifts, "Turni caricati per $yearMonth");
        
    } catch (Exception $e) {
        handleError('Errore caricamento turni', $e->getMessage());
    }
}

/**
 * Carica le risorse (operatori OSS)
 */
function loadResources($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT id, first_name, last_name, resource_type, working_days, is_active
            FROM RSA_Resources 
            WHERE is_active = TRUE
            ORDER BY resource_type, last_name, first_name
        ");
        $stmt->execute();
        $resources = $stmt->fetchAll();
        
        // Formatta le risorse per il frontend
        $formattedResources = [];
        foreach ($resources as $resource) {
            $workingDays = $resource['working_days'] ? json_decode($resource['working_days'], true) : null;
            
            $formattedResources[] = [
                'id' => $resource['id'],
                'firstName' => $resource['first_name'],
                'lastName' => $resource['last_name'],
                'type' => $resource['resource_type'],
                'workingDays' => $workingDays
            ];
        }
        
        sendResponse(true, $formattedResources, 'Risorse caricate con successo');
        
    } catch (Exception $e) {
        handleError('Errore caricamento risorse', $e->getMessage());
    }
}

/**
 * Salva i turni per un mese
 */
function saveShifts($conn, $data) {
    if (!isset($data['shifts']) || !isset($data['year']) || !isset($data['month'])) {
        handleError('Dati mancanti: shifts, year, month sono obbligatori', null, 400);
    }
    
    $shifts = $data['shifts'];
    $year = $data['year'];
    $month = $data['month'];
    
    // Converte il mese JavaScript in formato database
    $dbMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
    $yearMonth = "$year-$dbMonth";
    
    try {
        $conn->beginTransaction();
        
        // Cancella i turni esistenti per il mese
        $stmt = $conn->prepare("DELETE FROM RSA_Shifts WHERE year_month = ?");
        $stmt->execute([$yearMonth]);
        
        // Inserisce i nuovi turni
        $stmt = $conn->prepare("
            INSERT INTO RSA_Shifts 
            (resource_id, resource_name, shift_date, shift_type, floor_number, 
             absence_type, absence_hours, custom_color, year_month) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $savedCount = 0;
        foreach ($shifts as $shift) {
            // Estrae il nome della risorsa dall'ID (se non fornito)
            $resourceName = $shift['resourceName'] ?? $shift['resourceId'];
            
            $stmt->execute([
                $shift['resourceId'],
                $resourceName,
                $shift['date'],
                $shift['shiftType'],
                $shift['floor'] ?? 0,
                $shift['absence'] ?? null,
                $shift['absenceHours'] ?? null,
                $shift['customColor'] ?? null,
                $yearMonth
            ]);
            $savedCount++;
        }
        
        $conn->commit();
        
        // Crea backup automatico
        createAutomaticBackup($conn, $yearMonth, $shifts);
        
        sendResponse(true, ['saved_count' => $savedCount], "Salvati $savedCount turni per $yearMonth");
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore salvataggio turni', $e->getMessage());
    }
}

/**
 * Aggiorna un singolo turno
 */
function updateShift($conn, $data) {
    if (!isset($data['resourceId']) || !isset($data['date']) || !isset($data['shiftData'])) {
        handleError('Dati mancanti: resourceId, date, shiftData sono obbligatori', null, 400);
    }
    
    $resourceId = $data['resourceId'];
    $date = $data['date'];
    $shiftData = $data['shiftData'];
    
    // Calcola year_month dalla data
    $dateObj = new DateTime($date);
    $yearMonth = $dateObj->format('Y-m');
    
    try {
        // Verifica se il turno esiste
        $stmt = $conn->prepare("
            SELECT id FROM RSA_Shifts 
            WHERE resource_id = ? AND shift_date = ?
        ");
        $stmt->execute([$resourceId, $date]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            // Aggiorna turno esistente
            $stmt = $conn->prepare("
                UPDATE RSA_Shifts 
                SET shift_type = ?, floor_number = ?, absence_type = ?, 
                    absence_hours = ?, custom_color = ?
                WHERE resource_id = ? AND shift_date = ?
            ");
            $stmt->execute([
                $shiftData['shiftType'],
                $shiftData['floor'] ?? 0,
                $shiftData['absence'] ?? null,
                $shiftData['absenceHours'] ?? null,
                $shiftData['customColor'] ?? null,
                $resourceId,
                $date
            ]);
        } else {
            // Crea nuovo turno
            $stmt = $conn->prepare("
                INSERT INTO RSA_Shifts 
                (resource_id, resource_name, shift_date, shift_type, floor_number, 
                 absence_type, absence_hours, custom_color, year_month) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $resourceId,
                $shiftData['resourceName'] ?? $resourceId,
                $date,
                $shiftData['shiftType'],
                $shiftData['floor'] ?? 0,
                $shiftData['absence'] ?? null,
                $shiftData['absenceHours'] ?? null,
                $shiftData['customColor'] ?? null,
                $yearMonth
            ]);
        }
        
        sendResponse(true, null, 'Turno aggiornato con successo');
        
    } catch (Exception $e) {
        handleError('Errore aggiornamento turno', $e->getMessage());
    }
}

/**
 * Crea un backup automatico
 */
function createAutomaticBackup($conn, $yearMonth, $shifts) {
    try {
        $backupData = [
            'year_month' => $yearMonth,
            'timestamp' => date('Y-m-d H:i:s'),
            'shifts_count' => count($shifts),
            'shifts' => $shifts
        ];
        
        $stmt = $conn->prepare("
            INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
            VALUES (?, ?, 'automatic', ?)
        ");
        
        $backupName = "auto_backup_$yearMonth";
        $stmt->execute([
            $backupName,
            json_encode($backupData),
            $yearMonth
        ]);
        
        // Mantieni solo gli ultimi 10 backup automatici per mese
        $stmt = $conn->prepare("
            DELETE FROM RSA_Backups 
            WHERE backup_type = 'automatic' AND year_month = ? 
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM RSA_Backups 
                    WHERE backup_type = 'automatic' AND year_month = ? 
                    ORDER BY created_at DESC LIMIT 10
                ) AS keep_backups
            )
        ");
        $stmt->execute([$yearMonth, $yearMonth]);
        
    } catch (Exception $e) {
        error_log("Errore backup automatico: " . $e->getMessage());
        // Non bloccare il salvataggio per errori di backup
    }
}

/**
 * Ottiene lo stato del database
 */
function getDatabaseStatus($conn) {
    try {
        $db = new Database();
        $status = $db->checkDatabaseStatus();
        sendResponse(true, $status, 'Status database recuperato');
    } catch (Exception $e) {
        handleError('Errore recupero status', $e->getMessage());
    }
}

/**
 * Cancella turni per un periodo
 */
function clearShifts($conn, $data) {
    if (!isset($data['year']) || !isset($data['month'])) {
        handleError('Anno e mese sono obbligatori', null, 400);
    }
    
    $year = $data['year'];
    $month = $data['month'];
    $dbMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
    $yearMonth = "$year-$dbMonth";
    
    try {
        $conn->beginTransaction();
        
        // Crea backup prima di cancellare
        $stmt = $conn->prepare("SELECT * FROM RSA_Shifts WHERE year_month = ?");
        $stmt->execute([$yearMonth]);
        $shiftsToDelete = $stmt->fetchAll();
        
        if (!empty($shiftsToDelete)) {
            $backupData = [
                'year_month' => $yearMonth,
                'timestamp' => date('Y-m-d H:i:s'),
                'action' => 'clear_before_delete',
                'shifts' => $shiftsToDelete
            ];
            
            $stmt = $conn->prepare("
                INSERT INTO RSA_Backups (backup_name, backup_data, backup_type, year_month) 
                VALUES (?, ?, 'manual', ?)
            ");
            $stmt->execute([
                "clear_backup_$yearMonth",
                json_encode($backupData),
                $yearMonth
            ]);
        }
        
        // Cancella i turni
        $stmt = $conn->prepare("DELETE FROM RSA_Shifts WHERE year_month = ?");
        $stmt->execute([$yearMonth]);
        $deletedCount = $stmt->rowCount();
        
        $conn->commit();
        
        sendResponse(true, ['deleted_count' => $deletedCount], "Cancellati $deletedCount turni per $yearMonth");
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore cancellazione turni', $e->getMessage());
    }
}
?>
