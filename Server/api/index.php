<?php
/**
 * RSA Schedule API - Index/Test Endpoint (Simplified for debugging)
 * Endpoint di test per verificare che il sistema funzioni
 */

// Abilita error reporting per debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    echo "Starting API test...\n";
    
    // Test 1: Include config
    require_once __DIR__ . '/../config/config.php';
    echo "Config loaded...\n";

    setCorsHeaders();

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }

    // Test 2: Include DatabaseManager solo
    require_once __DIR__ . '/../core/DatabaseManager.php';
    echo "DatabaseManager loaded...\n";
    
    // Test 3: Prova connessione database
    $db = DatabaseManager::getInstance();
    echo "Database instance created...\n";
    
    $testQuery = $db->fetchOne("SELECT 1 as test");
    echo "Database query executed...\n";
    
    jsonResponse([
        'success' => true,
        'message' => 'RSA Schedule API is running (debug mode)',
        'timestamp' => date('c'),
        'database' => [
            'connected' => true,
            'test_query' => $testQuery['test'] === 1
        ]
    ]);
    
} catch (Exception $e) {
    // Error output per debug
    http_response_code(500);
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n"; 
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    
    // Anche in JSON per le chiamate API
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ]);
} catch (Error $e) {
    http_response_code(500);
    echo "PHP ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
