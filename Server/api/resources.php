<?php
/**
 * API per la gestione delle risorse OSS (operatori)
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
logActivity("resources_api_$method", ['action' => $action, 'ip' => $_SERVER['REMOTE_ADDR']]);

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
        case 'list':
        case 'resources.php':
        case '':
            getAllResources($conn);
            break;
            
        case 'active':
            getActiveResources($conn);
            break;
            
        default:
            // Cerca per ID specifico
            if (is_numeric($action) || strpos($action, 'resource') === 0) {
                getResourceById($conn, $action);
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
        case 'add':
            createResource($conn, $data);
            break;
            
        case 'import':
            importResources($conn, $data);
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
            updateResource($conn, $data);
            break;
            
        case 'bulk':
            bulkUpdateResources($conn, $data);
            break;
            
        default:
            // Aggiorna per ID specifico
            if (isset($data['id'])) {
                updateResourceById($conn, $data['id'], $data);
            } else {
                handleError('Azione PUT non riconosciuta', $action, 404);
            }
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
                deleteResource($conn, $data['id']);
            } else {
                handleError('ID risorsa mancante', null, 400);
            }
            break;
            
        default:
            // Cancella per ID specifico nell'URL
            if (is_numeric($action) || strpos($action, 'resource') === 0) {
                deleteResource($conn, $action);
            } else {
                handleError('Azione DELETE non riconosciuta', $action, 404);
            }
    }
}

/**
 * Ottiene tutte le risorse
 */
function getAllResources($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT id, first_name, last_name, resource_type, working_days, 
                   is_active, created_at, updated_at 
            FROM RSA_Resources 
            ORDER BY resource_type, first_name, last_name
        ");
        $stmt->execute();
        $resources = $stmt->fetchAll();
        
        // Decodifica working_days per le risorse part-time
        foreach ($resources as &$resource) {
            if ($resource['working_days']) {
                $resource['working_days'] = json_decode($resource['working_days'], true);
            }
        }
        
        sendResponse(true, $resources, 'Risorse caricate con successo');
        
    } catch (Exception $e) {
        handleError('Errore caricamento risorse', $e->getMessage());
    }
}

/**
 * Ottiene solo le risorse attive
 */
function getActiveResources($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT id, first_name, last_name, resource_type, working_days 
            FROM RSA_Resources 
            WHERE is_active = 1 
            ORDER BY resource_type, first_name, last_name
        ");
        $stmt->execute();
        $resources = $stmt->fetchAll();
        
        // Decodifica working_days per le risorse part-time
        foreach ($resources as &$resource) {
            if ($resource['working_days']) {
                $resource['working_days'] = json_decode($resource['working_days'], true);
            }
        }
        
        sendResponse(true, $resources, 'Risorse attive caricate');
        
    } catch (Exception $e) {
        handleError('Errore caricamento risorse attive', $e->getMessage());
    }
}

/**
 * Ottiene una risorsa per ID
 */
function getResourceById($conn, $id) {
    try {
        $stmt = $conn->prepare("
            SELECT * FROM RSA_Resources WHERE id = ?
        ");
        $stmt->execute([$id]);
        $resource = $stmt->fetch();
        
        if (!$resource) {
            handleError('Risorsa non trovata', null, 404);
        }
        
        // Decodifica working_days se presente
        if ($resource['working_days']) {
            $resource['working_days'] = json_decode($resource['working_days'], true);
        }
        
        sendResponse(true, $resource, 'Risorsa trovata');
        
    } catch (Exception $e) {
        handleError('Errore ricerca risorsa', $e->getMessage());
    }
}

/**
 * Crea una nuova risorsa
 */
function createResource($conn, $data) {
    // Validazione dati
    if (!isset($data['id']) || !isset($data['first_name']) || !isset($data['last_name'])) {
        handleError('ID, nome e cognome sono obbligatori', null, 400);
    }
    
    if (!isset($data['resource_type']) || !in_array($data['resource_type'], ['FULL_TIME', 'PART_TIME'])) {
        handleError('Tipo risorsa non valido', null, 400);
    }
    
    // Per part-time, working_days è obbligatorio
    if ($data['resource_type'] === 'PART_TIME' && !isset($data['working_days'])) {
        handleError('Giorni lavorativi obbligatori per part-time', null, 400);
    }
    
    try {
        // Verifica che l'ID non esista già
        $stmt = $conn->prepare("SELECT id FROM RSA_Resources WHERE id = ?");
        $stmt->execute([$data['id']]);
        if ($stmt->fetch()) {
            handleError('ID risorsa già esistente', null, 409);
        }
        
        $workingDays = null;
        if (isset($data['working_days']) && is_array($data['working_days'])) {
            $workingDays = json_encode($data['working_days']);
        }
        
        $stmt = $conn->prepare("
            INSERT INTO RSA_Resources 
            (id, first_name, last_name, resource_type, working_days, is_active) 
            VALUES (?, ?, ?, ?, ?, 1)
        ");
        
        $stmt->execute([
            $data['id'],
            $data['first_name'],
            $data['last_name'],
            $data['resource_type'],
            $workingDays
        ]);
        
        sendResponse(true, ['id' => $data['id']], 'Risorsa creata con successo');
        
    } catch (Exception $e) {
        handleError('Errore creazione risorsa', $e->getMessage());
    }
}

/**
 * Aggiorna una risorsa esistente
 */
function updateResource($conn, $data) {
    if (!isset($data['id'])) {
        handleError('ID risorsa mancante', null, 400);
    }
    
    try {
        // Verifica che la risorsa esista
        $stmt = $conn->prepare("SELECT id FROM RSA_Resources WHERE id = ?");
        $stmt->execute([$data['id']]);
        if (!$stmt->fetch()) {
            handleError('Risorsa non trovata', null, 404);
        }
        
        $updateFields = [];
        $params = [];
        
        if (isset($data['first_name'])) {
            $updateFields[] = "first_name = ?";
            $params[] = $data['first_name'];
        }
        
        if (isset($data['last_name'])) {
            $updateFields[] = "last_name = ?";
            $params[] = $data['last_name'];
        }
        
        if (isset($data['resource_type'])) {
            if (!in_array($data['resource_type'], ['FULL_TIME', 'PART_TIME'])) {
                handleError('Tipo risorsa non valido', null, 400);
            }
            $updateFields[] = "resource_type = ?";
            $params[] = $data['resource_type'];
        }
        
        if (isset($data['working_days'])) {
            $updateFields[] = "working_days = ?";
            $params[] = is_array($data['working_days']) ? json_encode($data['working_days']) : $data['working_days'];
        }
        
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            $params[] = $data['is_active'] ? 1 : 0;
        }
        
        if (empty($updateFields)) {
            handleError('Nessun campo da aggiornare', null, 400);
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $data['id'];
        
        $sql = "UPDATE RSA_Resources SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        sendResponse(true, null, 'Risorsa aggiornata con successo');
        
    } catch (Exception $e) {
        handleError('Errore aggiornamento risorsa', $e->getMessage());
    }
}

/**
 * Aggiorna una risorsa per ID specifico
 */
function updateResourceById($conn, $id, $data) {
    $data['id'] = $id;
    updateResource($conn, $data);
}

/**
 * Aggiornamento bulk di più risorse
 */
function bulkUpdateResources($conn, $data) {
    if (!isset($data['resources']) || !is_array($data['resources'])) {
        handleError('Array risorse mancante', null, 400);
    }
    
    try {
        $conn->beginTransaction();
        
        $updated = 0;
        $errors = [];
        
        foreach ($data['resources'] as $resourceData) {
            try {
                updateResource($conn, $resourceData);
                $updated++;
            } catch (Exception $e) {
                $errors[] = "Errore aggiornamento {$resourceData['id']}: " . $e->getMessage();
            }
        }
        
        if (empty($errors)) {
            $conn->commit();
            sendResponse(true, ['updated' => $updated], "Aggiornate $updated risorse");
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
 * Cancella una risorsa
 */
function deleteResource($conn, $id) {
    try {
        $conn->beginTransaction();
        
        // Verifica che la risorsa esista
        $stmt = $conn->prepare("SELECT id, first_name, last_name FROM RSA_Resources WHERE id = ?");
        $stmt->execute([$id]);
        $resource = $stmt->fetch();
        
        if (!$resource) {
            handleError('Risorsa non trovata', null, 404);
        }
        
        // Verifica se ci sono turni associati
        $stmt = $conn->prepare("SELECT COUNT(*) FROM RSA_Shifts WHERE resource_id = ?");
        $stmt->execute([$id]);
        $shiftsCount = $stmt->fetchColumn();
        
        if ($shiftsCount > 0) {
            // Non cancellare fisicamente, disattiva solo
            $stmt = $conn->prepare("UPDATE RSA_Resources SET is_active = 0, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$id]);
            
            $conn->commit();
            sendResponse(true, null, "Risorsa disattivata (aveva $shiftsCount turni associati)");
        } else {
            // Cancella fisicamente se non ha turni
            $stmt = $conn->prepare("DELETE FROM RSA_Resources WHERE id = ?");
            $stmt->execute([$id]);
            
            $conn->commit();
            sendResponse(true, null, 'Risorsa cancellata definitivamente');
        }
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore cancellazione risorsa', $e->getMessage());
    }
}

/**
 * Importa multiple risorse da array
 */
function importResources($conn, $data) {
    if (!isset($data['resources']) || !is_array($data['resources'])) {
        handleError('Array risorse mancante', null, 400);
    }
    
    try {
        $conn->beginTransaction();
        
        $imported = 0;
        $errors = [];
        
        foreach ($data['resources'] as $resourceData) {
            try {
                createResource($conn, $resourceData);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Errore importazione {$resourceData['id']}: " . $e->getMessage();
            }
        }
        
        if (empty($errors)) {
            $conn->commit();
            sendResponse(true, ['imported' => $imported], "Importate $imported risorse");
        } else {
            $conn->rollback();
            handleError('Errori durante importazione', $errors);
        }
        
    } catch (Exception $e) {
        $conn->rollback();
        handleError('Errore importazione risorse', $e->getMessage());
    }
}

?>
