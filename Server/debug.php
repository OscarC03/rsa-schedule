<?php
/**
 * Test debug per identificare il problema di inizializzazione
 * Esegui questo file direttamente per vedere gli errori dettagliati
 */

// Abilita tutti gli errori per debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h1>🔍 Debug Inizializzazione RSA Schedule</h1>\n";
echo "<pre>\n";

// Test 1: Inclusione file di configurazione - SENZA HEADERS
echo "📝 Test 1: Inclusione file configurazione...\n";

// Includi solo database.php direttamente
try {
    // Include manuale per evitare problemi con headers
    require_once __DIR__ . '/config/database.php';
    echo "✅ database.php caricato correttamente\n";
} catch (Exception $e) {
    echo "❌ Errore database.php: " . $e->getMessage() . "\n";
    exit;
}

// Test 2: Configurazione database
echo "\n📊 Test 2: Configurazione database...\n";

// Definiamo manualmente le costanti per evitare problemi con config.php
define('DB_HOST', 'localhost');
define('DB_NAME', 'my_turnioperapia');
define('DB_USER', 'turnioperapia');
define('DB_PASS', '');

echo "Host: " . DB_HOST . "\n";
echo "Database: " . DB_NAME . "\n";
echo "Username: " . DB_USER . "\n";
echo "Password: " . (empty(DB_PASS) ? '(vuota)' : '***') . "\n";

// Test 3: Connessione database
echo "\n🔗 Test 3: Connessione database...\n";
try {
    $db = new Database();
    echo "✅ Istanza Database creata\n";
    
    $conn = $db->connect();
    if ($conn) {
        echo "✅ Connessione database riuscita\n";
        echo "Server version: " . $conn->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n";
    } else {
        echo "❌ Connessione database fallita\n";
        exit;
    }
} catch (Exception $e) {
    echo "❌ Errore connessione: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    exit;
}

// Test 4: Controllo estensioni PHP
echo "\n🔧 Test 4: Estensioni PHP...\n";
$extensions = ['pdo', 'pdo_mysql', 'json', 'mbstring'];
foreach ($extensions as $ext) {
    $loaded = extension_loaded($ext);
    echo ($loaded ? "✅" : "❌") . " $ext: " . ($loaded ? "OK" : "MANCANTE") . "\n";
}

// Test 5: Controllo permessi directory
echo "\n📁 Test 5: Permessi directory...\n";
$dirs = [
    __DIR__ . '/logs' => 'Logs',
    __DIR__ . '/cache' => 'Cache',
    __DIR__ => 'Root'
];

foreach ($dirs as $dir => $name) {
    if (!is_dir($dir)) {
        $created = mkdir($dir, 0755, true);
        echo ($created ? "✅" : "❌") . " $name: " . ($created ? "Creata" : "Impossibile creare") . "\n";
    } else {
        $writable = is_writable($dir);
        echo ($writable ? "✅" : "❌") . " $name: " . ($writable ? "Scrivibile" : "NON scrivibile") . "\n";
    }
}

// Test 6: Creazione singola tabella
echo "\n🗄️ Test 6: Creazione tabella di test...\n";
try {
    $testSQL = "
        CREATE TABLE IF NOT EXISTS Test_Table (
            id INT AUTO_INCREMENT PRIMARY KEY,
            test_field VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $stmt = $conn->prepare($testSQL);
    $stmt->execute();
    echo "✅ Tabella di test creata correttamente\n";
    
    // Test inserimento
    $stmt = $conn->prepare("INSERT INTO Test_Table (test_field) VALUES (?)");
    $stmt->execute(['test_value']);
    echo "✅ Inserimento test riuscito\n";
    
    // Pulisci
    $stmt = $conn->prepare("DROP TABLE Test_Table");
    $stmt->execute();
    echo "✅ Tabella di test rimossa\n";
    
} catch (Exception $e) {
    echo "❌ Errore test tabella: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
}

// Test 7: Inizializzazione completa con debug
echo "\n🚀 Test 7: Inizializzazione completa...\n";
try {
    $result = $db->initializeDatabase();
    
    if ($result['success']) {
        echo "✅ Inizializzazione riuscita!\n";
        if (isset($result['steps'])) {
            echo "Steps completati:\n";
            foreach ($result['steps'] as $step) {
                echo "  - $step\n";
            }
        }
    } else {
        echo "❌ Inizializzazione fallita!\n";
        echo "Messaggio: " . $result['message'] . "\n";
        
        if (isset($result['error_details'])) {
            echo "Dettagli errore:\n";
            echo "  File: " . $result['error_details']['file'] . "\n";
            echo "  Line: " . $result['error_details']['line'] . "\n";
        }
        
        if (isset($result['steps_completed'])) {
            echo "Steps completati prima dell'errore:\n";
            foreach ($result['steps_completed'] as $step) {
                echo "  - $step\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "❌ Eccezione durante inizializzazione: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

// Test 8: Status finale
echo "\n📊 Test 8: Status finale database...\n";
try {
    $status = $db->checkDatabaseStatus();
    echo "Connesso: " . ($status['connected'] ? 'Sì' : 'No') . "\n";
    
    if ($status['connected'] && isset($status['tables'])) {
        echo "Tabelle:\n";
        foreach ($status['tables'] as $table => $info) {
            echo "  - $table: " . ($info['exists'] ? "Esiste" : "Mancante") . " (" . $info['records'] . " record)\n";
        }
    }
} catch (Exception $e) {
    echo "❌ Errore status: " . $e->getMessage() . "\n";
}

echo "\n🎯 Debug completato!\n";
echo "</pre>\n";

?>
