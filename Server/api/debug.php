<?php
/**
 * Debug Script per identificare l'errore 500
 */

// Abilita tutti gli errori per debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "=== RSA Schedule API Debug ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Script running...\n";

try {
    echo "1. Testing basic PHP...\n";
    
    // Test 1: Verifica se possiamo includere il config
    echo "2. Loading config...\n";
    if (file_exists(__DIR__ . '/../config/config.php')) {
        require_once __DIR__ . '/../config/config.php';
        echo "   ✓ Config loaded successfully\n";
    } else {
        echo "   ✗ Config file not found\n";
        exit(1);
    }
    
    // Test 2: Verifica PDO
    echo "3. Testing PDO extension...\n";
    if (extension_loaded('pdo')) {
        echo "   ✓ PDO extension loaded\n";
    } else {
        echo "   ✗ PDO extension not loaded\n";
        exit(1);
    }
    
    if (extension_loaded('pdo_mysql')) {
        echo "   ✓ PDO MySQL driver loaded\n";
    } else {
        echo "   ✗ PDO MySQL driver not loaded\n";
        exit(1);
    }
    
    // Test 3: Verifica DatabaseManager
    echo "4. Testing DatabaseManager class...\n";
    if (file_exists(__DIR__ . '/../core/DatabaseManager.php')) {
        require_once __DIR__ . '/../core/DatabaseManager.php';
        echo "   ✓ DatabaseManager file loaded\n";
        
        // Test connessione database (senza password per ora)
        echo "5. Testing database connection...\n";
        try {
            $pdo = new PDO(
                "mysql:host=localhost;dbname=my_turnioperapia;charset=utf8mb4",
                "turnioperapia",
                "", // Password vuota per ora
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
            echo "   ✓ Database connection successful\n";
            
            // Test query semplice
            $result = $pdo->query("SELECT 1 as test")->fetch();
            if ($result['test'] == 1) {
                echo "   ✓ Database query successful\n";
            }
            
        } catch (PDOException $e) {
            echo "   ✗ Database connection failed: " . $e->getMessage() . "\n";
            echo "   Error Code: " . $e->getCode() . "\n";
        }
        
    } else {
        echo "   ✗ DatabaseManager file not found\n";
        exit(1);
    }
    
    echo "\n=== Debug completed successfully ===\n";
    
} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "PHP ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
