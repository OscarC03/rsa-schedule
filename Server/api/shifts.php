<?php
/**
 * RSA Schedule API - Shifts Endpoint
 * Gestisce operazioni CRUD per i turni
 * 
 * Endpoints:
 * GET /api/shifts.php?year=X&month=Y - Legge turni per mese
 * GET /api/shifts.php?start=X&end=Y - Legge turni per range date
 * POST /api/shifts.php - Salva turni (singolo o matrice)
 * DELETE /api/shifts.php?resourceId=X&date=Y - Elimina turno specifico
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

require_once __DIR__ . '/../core/ShiftsManager.php';

try {
    $shiftsManager = new ShiftsManager();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Legge turni per periodo
            if (isset($_GET['year']) && isset($_GET['month'])) {
                // Per mese specifico
                $year = (int) $_GET['year'];
                $month = (int) $_GET['month']; // Frontend passa 0-11
                
                $shifts = $shiftsManager->getShiftsByMonth($year, $month);
                
                echo json_encode([
                    'success' => true,
                    'data' => $shifts,
                    'year' => $year,
                    'month' => $month,
                    'count' => count($shifts)
                ]);
                
            } elseif (isset($_GET['start']) && isset($_GET['end'])) {
                // Per range di date
                $startDate = $_GET['start'];
                $endDate = $_GET['end'];
                
                $shifts = $shiftsManager->getShiftsByDateRange($startDate, $endDate);
                
                echo json_encode([
                    'success' => true,
                    'data' => $shifts,
                    'date_range' => [$startDate, $endDate],
                    'count' => count($shifts)
                ]);
                
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Required parameters: (year & month) OR (start & end)'
                ]);
            }
            break;
            
        case 'POST':
            // Salva turni
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON input'
                ]);
                break;
            }
            
            // Verifica se è una matrice o un singolo turno
            if (isset($input['matrix']) || (is_array($input) && !isset($input['resourceId']))) {
                // Matrice di turni
                $matrixData = $input['matrix'] ?? $input;
                $result = $shiftsManager->saveShiftMatrix($matrixData);
            } else {
                // Singolo turno
                $result = $shiftsManager->saveShift($input);
            }
            
            echo json_encode($result);
            break;
            
        case 'DELETE':
            // Elimina turno
            if (isset($_GET['resourceId']) && isset($_GET['date'])) {
                // Elimina turno specifico
                $result = $shiftsManager->deleteShift($_GET['resourceId'], $_GET['date']);
                echo json_encode($result);
                
            } elseif (isset($_GET['start']) && isset($_GET['end'])) {
                // Elimina range di turni
                $result = $shiftsManager->deleteShiftsByDateRange($_GET['start'], $_GET['end']);
                echo json_encode($result);
                
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Required parameters: (resourceId & date) OR (start & end)'
                ]);
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
