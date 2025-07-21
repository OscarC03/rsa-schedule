<?php
/**
 * API per il controllo dello status generale del sistema
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

// Verifica rate limiting
checkRateLimit();

// Ottiene informazioni richiesta
$request = getRequestInfo();
$method = $request['method'];

// Logga l'attività
logActivity("status_api_$method", ['ip' => $_SERVER['REMOTE_ADDR']]);

try {
    switch ($method) {
        case 'GET':
            getSystemStatus();
            break;
            
        default:
            handleError('Solo metodo GET supportato per status', null, 405);
    }
} catch (Exception $e) {
    handleError('Errore interno del server', $e->getMessage());
}

/**
 * Ottiene lo status completo del sistema
 */
function getSystemStatus() {
    try {
        $status = [
            'timestamp' => date('Y-m-d H:i:s'),
            'application' => [
                'name' => APP_NAME,
                'version' => APP_VERSION,
                'debug_mode' => DEBUG_MODE,
                'timezone' => date_default_timezone_get()
            ],
            'server' => getServerInfo(),
            'database' => getDatabaseInfo(),
            'storage' => getStorageInfo(),
            'performance' => getPerformanceInfo(),
            'health' => 'OK'
        ];
        
        // Determina lo stato di salute generale
        $issues = [];
        
        if (!$status['database']['connected']) {
            $issues[] = 'Database disconnesso';
            $status['health'] = 'ERROR';
        }
        
        if (!$status['database']['initialized']) {
            $issues[] = 'Database non inizializzato';
            $status['health'] = 'WARNING';
        }
        
        if ($status['storage']['logs_writable'] === false) {
            $issues[] = 'Directory logs non scrivibile';
            $status['health'] = 'WARNING';
        }
        
        if (!empty($issues)) {
            $status['issues'] = $issues;
        }
        
        sendResponse(true, $status, 'Status sistema recuperato');
        
    } catch (Exception $e) {
        handleError('Errore recupero status', $e->getMessage());
    }
}

/**
 * Informazioni sul server
 */
function getServerInfo() {
    return [
        'php_version' => PHP_VERSION,
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? '',
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'extensions' => [
            'pdo' => extension_loaded('pdo'),
            'pdo_mysql' => extension_loaded('pdo_mysql'),
            'json' => extension_loaded('json'),
            'mbstring' => extension_loaded('mbstring')
        ]
    ];
}

/**
 * Informazioni sul database
 */
function getDatabaseInfo() {
    try {
        $db = new Database();
        $dbStatus = $db->checkDatabaseStatus();
        
        $info = [
            'connected' => $dbStatus['connected'],
            'host' => DB_HOST,
            'database' => DB_NAME,
            'user' => DB_USER
        ];
        
        if ($dbStatus['connected']) {
            $conn = $db->getConnection();
            
            $info['server_version'] = $conn->getAttribute(PDO::ATTR_SERVER_VERSION);
            $info['connection_status'] = $conn->getAttribute(PDO::ATTR_CONNECTION_STATUS);
            
            $allTablesExist = true;
            $totalRecords = 0;
            
            foreach ($dbStatus['tables'] as $table => $tableInfo) {
                if (!$tableInfo['exists']) {
                    $allTablesExist = false;
                }
                $totalRecords += $tableInfo['records'];
            }
            
            $info['tables'] = $dbStatus['tables'];
            $info['initialized'] = $allTablesExist;
            $info['total_records'] = $totalRecords;
            
            // Statistiche aggiuntive se inizializzato
            if ($allTablesExist) {
                $info['statistics'] = getDatabaseStatistics($conn);
            }
        } else {
            $info['error'] = $dbStatus['error'] ?? 'Errore sconosciuto';
        }
        
        return $info;
        
    } catch (Exception $e) {
        return [
            'connected' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Statistiche dettagliate del database
 */
function getDatabaseStatistics($conn) {
    try {
        $stats = [];
        
        // Statistiche turni
        $stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_shifts,
                COUNT(DISTINCT resource_id) as active_resources,
                COUNT(DISTINCT year_month) as months_with_data,
                MIN(shift_date) as earliest_shift,
                MAX(shift_date) as latest_shift
            FROM RSA_Shifts
        ");
        $stmt->execute();
        $stats['shifts'] = $stmt->fetch();
        
        // Statistiche risorse
        $stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_resources,
                SUM(CASE WHEN resource_type = 'FULL_TIME' THEN 1 ELSE 0 END) as full_time,
                SUM(CASE WHEN resource_type = 'PART_TIME' THEN 1 ELSE 0 END) as part_time,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_resources
            FROM RSA_Resources
        ");
        $stmt->execute();
        $stats['resources'] = $stmt->fetch();
        
        // Statistiche backup
        $stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_backups,
                SUM(CASE WHEN backup_type = 'automatic' THEN 1 ELSE 0 END) as automatic,
                SUM(CASE WHEN backup_type = 'manual' THEN 1 ELSE 0 END) as manual,
                MAX(created_at) as last_backup
            FROM RSA_Backups
        ");
        $stmt->execute();
        $stats['backups'] = $stmt->fetch();
        
        // Dimensioni tabelle
        $stmt = $conn->prepare("
            SELECT 
                table_name,
                round(((data_length + index_length) / 1024 / 1024), 2) as size_mb
            FROM information_schema.TABLES 
            WHERE table_schema = ? 
            AND table_name LIKE 'RSA_%'
        ");
        $stmt->execute([DB_NAME]);
        $stats['table_sizes'] = $stmt->fetchAll();
        
        return $stats;
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

/**
 * Informazioni sull'archiviazione
 */
function getStorageInfo() {
    $info = [
        'base_path' => __DIR__ . '/..',
        'logs_directory' => __DIR__ . '/../logs',
        'cache_directory' => __DIR__ . '/../cache'
    ];
    
    // Controlla se le directory sono scrivibili
    $info['logs_writable'] = is_dir($info['logs_directory']) ? is_writable($info['logs_directory']) : false;
    $info['cache_writable'] = is_dir($info['cache_directory']) ? is_writable($info['cache_directory']) : false;
    
    // Dimensioni dei file di log se disponibili
    if ($info['logs_writable']) {
        $logFiles = glob($info['logs_directory'] . '/*.log');
        $info['log_files'] = [];
        
        foreach ($logFiles as $logFile) {
            $info['log_files'][basename($logFile)] = [
                'size_bytes' => filesize($logFile),
                'size_mb' => round(filesize($logFile) / 1024 / 1024, 2),
                'modified' => date('Y-m-d H:i:s', filemtime($logFile))
            ];
        }
    }
    
    // Spazio disco se disponibile (funziona su molti sistemi)
    if (function_exists('disk_free_space') && function_exists('disk_total_space')) {
        $free = disk_free_space($info['base_path']);
        $total = disk_total_space($info['base_path']);
        
        if ($free !== false && $total !== false) {
            $info['disk_space'] = [
                'free_bytes' => $free,
                'total_bytes' => $total,
                'free_mb' => round($free / 1024 / 1024, 2),
                'total_mb' => round($total / 1024 / 1024, 2),
                'usage_percent' => round((($total - $free) / $total) * 100, 2)
            ];
        }
    }
    
    return $info;
}

/**
 * Informazioni sulle performance
 */
function getPerformanceInfo() {
    return [
        'memory_usage' => [
            'current_bytes' => memory_get_usage(),
            'current_mb' => round(memory_get_usage() / 1024 / 1024, 2),
            'peak_bytes' => memory_get_peak_usage(),
            'peak_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2),
            'limit' => ini_get('memory_limit')
        ],
        'execution_time' => [
            'current_seconds' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
            'limit_seconds' => ini_get('max_execution_time')
        ],
        'opcache' => function_exists('opcache_get_status') ? opcache_get_status() : null
    ];
}

?>
