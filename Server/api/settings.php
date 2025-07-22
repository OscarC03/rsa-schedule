<?php
/**
 * RSA Schedule API - Settings Endpoint
 * Gestisce personalizzazioni colori e impostazioni globali
 * 
 * Endpoints:
 * GET /api/settings.php?type=colors&year=X&month=Y - Legge personalizzazioni colori
 * GET /api/settings.php?type=setting&key=X - Legge impostazione specifica
 * POST /api/settings.php - Salva personalizzazioni/impostazioni
 * DELETE /api/settings.php?type=color&date=X - Elimina personalizzazione colori
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../core/SettingsManager.php';

try {
    $settingsManager = new SettingsManager();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $type = $_GET['type'] ?? null;
            
            switch ($type) {
                case 'colors':
                    // Legge personalizzazioni colori
                    if (!isset($_GET['year']) || !isset($_GET['month'])) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Year and month required for colors'
                        ]);
                        break;
                    }
                    
                    $year = (int) $_GET['year'];
                    $month = (int) $_GET['month']; // Frontend passa 0-11
                    
                    $colors = $settingsManager->getDateColors($year, $month);
                    
                    echo json_encode([
                        'success' => true,
                        'type' => 'colors',
                        'data' => $colors,
                        'year' => $year,
                        'month' => $month,
                        'count' => count($colors)
                    ]);
                    break;
                    
                case 'setting':
                    // Legge impostazione specifica
                    $key = $_GET['key'] ?? null;
                    
                    if (!$key) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Setting key required'
                        ]);
                        break;
                    }
                    
                    $value = $settingsManager->getSetting($key);
                    
                    echo json_encode([
                        'success' => true,
                        'type' => 'setting',
                        'key' => $key,
                        'data' => $value
                    ]);
                    break;
                    
                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Invalid type. Use: colors, setting'
                    ]);
                    break;
            }
            break;
            
        case 'POST':
            // Salva personalizzazioni/impostazioni
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON input'
                ]);
                break;
            }
            
            $type = $input['type'] ?? null;
            
            switch ($type) {
                case 'colors':
                    // Salva personalizzazioni colori
                    if (isset($input['data']) && is_array($input['data'])) {
                        // Batch di colori
                        $year = (int) $input['year'];
                        $month = (int) $input['month'];
                        $result = $settingsManager->saveDateColors($year, $month, $input['data']);
                    } else {
                        // Singola personalizzazione
                        $result = $settingsManager->saveDateColor($input);
                    }
                    echo json_encode($result);
                    break;
                    
                case 'setting':
                    // Salva impostazione globale
                    $key = $input['key'] ?? null;
                    $value = $input['value'] ?? null;
                    
                    if (!$key) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Setting key required'
                        ]);
                        break;
                    }
                    
                    $result = $settingsManager->saveSetting($key, $value);
                    echo json_encode($result);
                    break;
                    
                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Invalid type. Use: colors, setting'
                    ]);
                    break;
            }
            break;
            
        case 'DELETE':
            $type = $_GET['type'] ?? null;
            
            switch ($type) {
                case 'color':
                    // Elimina personalizzazione colori
                    $date = $_GET['date'] ?? null;
                    
                    if (!$date) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Date required for color deletion'
                        ]);
                        break;
                    }
                    
                    $result = $settingsManager->deleteDateColor($date);
                    echo json_encode($result);
                    break;
                    
                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Invalid type for deletion'
                    ]);
                    break;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Method not allowed'
            ]);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
