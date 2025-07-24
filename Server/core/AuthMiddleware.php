<?php

require_once __DIR__ . '/AuthManager.php';
require_once __DIR__ . '/DatabaseManager.php';
require_once __DIR__ . '/../config/config.php';

/**
 * Middleware di autenticazione per API
 */
function requireAuth($db) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token di autenticazione richiesto']);
        exit();
    }
    
    $token = $matches[1];
    
    // Crea AuthManager con entrambi i parametri richiesti
    $authManager = new AuthManager(DatabaseManager::getInstance(), JWT_CONFIG['secret_key']);
    $result = $authManager->validateToken($token);
    
    if (!$result['success']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token non valido o scaduto']);
        exit();
    }
    
    return $result['user'];
}

/**
 * Helper per ottenere i dati utente senza interrompere l'esecuzione
 */
function getCurrentUser($db) {
    try {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        
        // Crea AuthManager con entrambi i parametri richiesti
        $authManager = new AuthManager(DatabaseManager::getInstance(), JWT_CONFIG['secret_key']);
        $result = $authManager->validateToken($token);
        
        return $result['success'] ? $result['user'] : null;
    } catch (Exception $e) {
        error_log("Errore getCurrentUser: " . $e->getMessage());
        return null;
    }
}
