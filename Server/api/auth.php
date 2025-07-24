<?php
// Evita output di errori PHP che possono rompere il JSON
error_reporting(0);
ini_set('display_errors', 0);

// Gestione errori fatali
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && $error['type'] === E_ERROR) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Errore fatale del server']);
    }
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/config.php';
require_once '../core/DatabaseManager.php';
require_once '../core/JWTManager.php';
require_once '../core/AuthManager.php';

// Verifica che tutte le classi siano caricate
if (!class_exists('DatabaseManager')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DatabaseManager non caricato']);
    exit();
}

if (!class_exists('JWTManager')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'JWTManager non caricato']);
    exit();
}

if (!class_exists('AuthManager')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'AuthManager non caricato']);
    exit();
}

try {
    $database = DatabaseManager::getInstance();
    
    // JWT Secret Key - in produzione dovrebbe essere in config.php
    $jwtSecret = defined('JWT_SECRET') ? JWT_SECRET : 'rsa-schedule-secret-key-2024-very-long-and-secure';
    
    $authManager = new AuthManager($database, $jwtSecret);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Dati non validi']);
            exit();
        }

        $action = $input['action'] ?? '';

        switch ($action) {
            case 'login':
                $email = trim($input['email'] ?? '');
                $password = $input['password'] ?? '';

                if (empty($email) || empty($password)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Email e password sono obbligatori']);
                    exit();
                }

                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Formato email non valido']);
                    exit();
                }

                $result = $authManager->authenticate($email, $password);
                
                if ($result['success']) {
                    http_response_code(200);
                } else {
                    http_response_code(401);
                }
                
                echo json_encode($result);
                break;

            case 'validate':
                $token = $input['token'] ?? '';

                if (empty($token)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Token richiesto']);
                    exit();
                }

                $result = $authManager->validateToken($token);
                
                if ($result['success']) {
                    http_response_code(200);
                } else {
                    http_response_code(401);
                }
                
                echo json_encode($result);
                break;

            case 'logout':
                $token = $input['token'] ?? '';

                if (empty($token)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Token richiesto']);
                    exit();
                }

                $result = $authManager->revokeToken($token);
                
                http_response_code(200);
                echo json_encode($result);
                break;

            case 'cleanup':
                // Endpoint per pulizia token scaduti (da chiamare periodicamente)
                $result = $authManager->cleanupExpiredTokens();
                http_response_code(200);
                echo json_encode($result);
                break;

            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Azione non valida']);
        }

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    }

} catch (Exception $e) {
    error_log("Errore API auth: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Errore del server']);
}
