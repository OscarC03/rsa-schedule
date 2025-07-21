<?php
/**
 * Configurazione generale del sistema
 */

// Headers CORS per permettere chiamate dal frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Gestisce le richieste OPTIONS per CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurazione errori
error_reporting(E_ALL);
ini_set('display_errors', 0); // Non mostrare errori in produzione
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Timezone
date_default_timezone_set('Europe/Rome');

// Costanti configurazione
define('APP_NAME', 'RSA Schedule Manager');
define('APP_VERSION', '1.0.0');
define('DEBUG_MODE', false); // Disattivato per produzione

// Configurazione database (già definita in database.php)
define('DB_HOST', 'localhost');
define('DB_NAME', 'my_turnioperapia');
define('DB_USER', 'turnioperapia');
define('DB_PASS', '');

/**
 * Funzione per inviare risposte JSON standardizzate
 */
function sendResponse($success, $data = null, $message = '', $httpCode = 200) {
    http_response_code($httpCode);
    
    $response = [
        'success' => $success,
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Funzione per gestire errori
 */
function handleError($message, $details = null, $httpCode = 500) {
    error_log("ERROR: $message" . ($details ? " - Details: " . print_r($details, true) : ""));
    
    if (DEBUG_MODE && $details) {
        sendResponse(false, $details, $message, $httpCode);
    } else {
        sendResponse(false, null, $message, $httpCode);
    }
}

/**
 * Funzione per validare i dati JSON in input
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('Dati JSON non validi', json_last_error_msg(), 400);
    }
    
    return $data;
}

/**
 * Funzione per loggare attività
 */
function logActivity($action, $details = null) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'details' => $details
    ];
    
    $logFile = __DIR__ . '/../logs/activity.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, json_encode($logEntry) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

/**
 * Funzione per ottenere il metodo HTTP e l'azione dall'URL
 */
function getRequestInfo() {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    $path = parse_url($uri, PHP_URL_PATH);
    $pathParts = array_filter(explode('/', $path));
    
    return [
        'method' => $method,
        'path' => $path,
        'parts' => array_values($pathParts),
        'action' => end($pathParts) ?: 'index'
    ];
}

/**
 * Funzione per verificare rate limiting (anti-spam)
 */
function checkRateLimit($maxRequests = 60, $timeWindow = 60) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $cacheFile = __DIR__ . "/../cache/rate_limit_" . md5($ip) . ".json";
    
    // Crea directory cache se non esiste
    $cacheDir = dirname($cacheFile);
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    
    $now = time();
    $requests = [];
    
    // Legge richieste esistenti
    if (file_exists($cacheFile)) {
        $content = file_get_contents($cacheFile);
        $requests = json_decode($content, true) ?: [];
    }
    
    // Filtra richieste vecchie
    $requests = array_filter($requests, function($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });
    
    // Controlla limite
    if (count($requests) >= $maxRequests) {
        handleError('Troppe richieste. Riprova tra poco.', null, 429);
    }
    
    // Aggiunge richiesta corrente
    $requests[] = $now;
    file_put_contents($cacheFile, json_encode($requests), LOCK_EX);
}

/**
 * Funzione per pulire i log e cache vecchi
 */
function cleanupOldFiles() {
    $logsDir = __DIR__ . '/../logs/';
    $cacheDir = __DIR__ . '/../cache/';
    $maxAge = 30 * 24 * 60 * 60; // 30 giorni
    
    foreach ([$logsDir, $cacheDir] as $dir) {
        if (is_dir($dir)) {
            $files = glob($dir . '*');
            foreach ($files as $file) {
                if (is_file($file) && (time() - filemtime($file)) > $maxAge) {
                    unlink($file);
                }
            }
        }
    }
}

// Pulisci file vecchi (1% probabilità ad ogni richiesta)
if (rand(1, 100) === 1) {
    cleanupOldFiles();
}
?>
