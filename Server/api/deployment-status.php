<?php
/**
 * API Endpoint: Deployment Status Check
 * Returns comprehensive system status for frontend integration
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

// Set JSON headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $status = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'server' => $_SERVER['HTTP_HOST'],
        'deployment_status' => 'operational',
        'version' => '1.0.0'
    ];

    // Check PHP version
    $status['php'] = [
        'version' => phpversion(),
        'compatible' => version_compare(phpversion(), '7.4', '>=')
    ];

    // Check required extensions
    $status['extensions'] = [
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'json' => extension_loaded('json'),
        'mbstring' => extension_loaded('mbstring')
    ];

    // Check database connection
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if ($conn) {
            $status['database'] = [
                'connected' => true,
                'mysql_version' => $conn->getAttribute(PDO::ATTR_SERVER_VERSION)
            ];

            // Check tables
            $dbStatus = $db->checkDatabaseStatus();
            $status['database']['tables'] = $dbStatus['tables'] ?? [];
            
            $allTablesExist = true;
            $totalRecords = 0;
            
            foreach ($status['database']['tables'] as $table => $info) {
                if (!$info['exists']) {
                    $allTablesExist = false;
                }
                $totalRecords += $info['records'];
            }
            
            $status['database']['initialized'] = $allTablesExist;
            $status['database']['total_records'] = $totalRecords;
            $status['database']['needs_setup'] = !$allTablesExist;
            
        } else {
            $status['database'] = [
                'connected' => false,
                'error' => 'Connection failed'
            ];
            $status['deployment_status'] = 'database_error';
        }
        
    } catch (Exception $e) {
        $status['database'] = [
            'connected' => false,
            'error' => $e->getMessage()
        ];
        $status['deployment_status'] = 'database_error';
    }

    // Check critical files
    $requiredFiles = [
        'config/database.php',
        'config/config.php',
        'api/init.php',
        'api/resources.php',
        'api/shifts.php',
        'api/settings.php',
        'install.php'
    ];

    $status['files'] = [];
    $missingFiles = [];
    
    foreach ($requiredFiles as $file) {
        $exists = file_exists(__DIR__ . '/../' . $file);
        $status['files'][$file] = $exists;
        if (!$exists) {
            $missingFiles[] = $file;
        }
    }
    
    if (!empty($missingFiles)) {
        $status['deployment_status'] = 'incomplete';
        $status['missing_files'] = $missingFiles;
    }

    // Overall health check
    $isHealthy = $status['php']['compatible'] && 
                 $status['extensions']['pdo_mysql'] && 
                 $status['database']['connected'] && 
                 empty($missingFiles);

    $status['healthy'] = $isHealthy;
    
    if (!$isHealthy) {
        $status['deployment_status'] = 'needs_attention';
    }

    // Add helpful URLs
    $status['urls'] = [
        'installation_wizard' => 'install.php',
        'database_test' => 'test-database-init.php',
        'deployment_verify' => 'deployment-verify.php',
        'api_status' => 'api/status.php'
    ];

    // Recommendations
    $recommendations = [];
    
    if (!$status['database']['initialized']) {
        $recommendations[] = 'Run database initialization via install.php';
    }
    
    if ($status['database']['total_records'] === 0) {
        $recommendations[] = 'Insert default data via installation wizard';
    }
    
    if (!empty($missingFiles)) {
        $recommendations[] = 'Upload missing files: ' . implode(', ', $missingFiles);
    }
    
    if (!empty($recommendations)) {
        $status['recommendations'] = $recommendations;
    }

    // Return status
    echo json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'deployment_status' => 'error',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
