<?php
/**
 * Router principale per le API del sistema RSA Schedule
 * Gestisce il routing verso le diverse API
 */

require_once __DIR__ . '/config/config.php';

// Logga la richiesta
logActivity('api_request', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'ip' => $_SERVER['REMOTE_ADDR'],
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
]);

// Ottiene informazioni sulla richiesta
$request = getRequestInfo();
$path = $request['path'];
$parts = $request['parts'];

// Determina quale API chiamare basandosi sul path
if (empty($parts)) {
    // Root API - mostra informazioni generali
    showApiInfo();
} else {
    $apiEndpoint = $parts[count($parts) - 2] ?? '';
    $apiFile = $parts[count($parts) - 1] ?? '';
    
    // Mapping degli endpoint
    $apiRoutes = [
        'shifts' => 'api/shifts.php',
        'resources' => 'api/resources.php',
        'settings' => 'api/settings.php',
        'backup' => 'api/backup.php',
        'init' => 'api/init.php',
        'status' => 'api/status.php'
    ];
    
    // Cerca la route corrispondente
    $targetFile = null;
    
    foreach ($apiRoutes as $route => $file) {
        if (strpos($path, $route) !== false || $apiFile === "$route.php") {
            $targetFile = __DIR__ . '/' . $file;
            break;
        }
    }
    
    if ($targetFile && file_exists($targetFile)) {
        require_once $targetFile;
    } else {
        handleError('Endpoint API non trovato', [
            'requested_path' => $path,
            'available_endpoints' => array_keys($apiRoutes)
        ], 404);
    }
}

/**
 * Mostra informazioni generali sull'API
 */
function showApiInfo() {
    $info = [
        'application' => APP_NAME,
        'version' => APP_VERSION,
        'timestamp' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get(),
        'endpoints' => [
            'init' => [
                'url' => '/api/init.php',
                'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
                'description' => 'Inizializzazione e gestione database'
            ],
            'shifts' => [
                'url' => '/api/shifts.php',
                'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
                'description' => 'Gestione turni OSS'
            ],
            'resources' => [
                'url' => '/api/resources.php',
                'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
                'description' => 'Gestione risorse (operatori OSS)'
            ],
            'settings' => [
                'url' => '/api/settings.php',
                'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
                'description' => 'Gestione impostazioni applicazione'
            ],
            'backup' => [
                'url' => '/api/backup.php',
                'methods' => ['GET', 'POST', 'DELETE'],
                'description' => 'Gestione backup e ripristino'
            ],
            'status' => [
                'url' => '/api/status.php',
                'methods' => ['GET'],
                'description' => 'Status generale del sistema'
            ]
        ],
        'documentation' => [
            'authentication' => 'Nessuna autenticazione richiesta per questa versione',
            'rate_limiting' => '60 richieste per minuto per IP',
            'content_type' => 'application/json',
            'cors' => 'Abilitato per tutti i domini'
        ]
    ];
    
    sendResponse(true, $info, 'API RSA Schedule attiva');
}

?>
