<?php
/**
 * RSA Schedule - Configuration
 * Configurazioni globali per Altervista.org
 */

// Database Configuration per Altervista.org
define('DB_CONFIG', [
    'host' => 'localhost',
    'database' => 'my_turnioperapia',
    'username' => 'turnioperapia', // Sostituisci con il tuo username Altervista
    'password' => '', // Sostituisci con la tua password database
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]
]);

// API Configuration
define('API_CONFIG', [
    'version' => '1.0',
    'timezone' => 'Europe/Rome',
    'max_execution_time' => 30,
    'memory_limit' => '128M'
]);

// Error Reporting (Abilita temporaneamente per debug)
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Set timezone
date_default_timezone_set(API_CONFIG['timezone']);

// Set limits
set_time_limit(API_CONFIG['max_execution_time']);
ini_set('memory_limit', API_CONFIG['memory_limit']);

// CORS Headers per tutte le API
function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');
}

// Gestione response JSON standard
function jsonResponse(array $data, int $httpCode = 200): never {
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Gestione errori standard
function jsonError(string $message, int $httpCode = 500, ?Exception $exception = null): never {
    $error = [
        'success' => false,
        'error' => $message,
        'timestamp' => date('c'),
        'http_code' => $httpCode
    ];
    
    if (DEBUG_MODE && $exception) {
        $error['debug'] = [
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ];
    }
    
    jsonResponse($error, $httpCode);
}

// Log errori (per Altervista)
function logError(string $message, ?Exception $exception = null): void {
    $logEntry = date('[Y-m-d H:i:s] ') . $message;
    
    if ($exception) {
        $logEntry .= ' - Exception: ' . $exception->getMessage();
        $logEntry .= ' in ' . $exception->getFile() . ':' . $exception->getLine();
    }
    
    $logEntry .= PHP_EOL;
    
    // Log nel file di error log di PHP (visibile nel pannello Altervista)
    error_log($logEntry);
}
