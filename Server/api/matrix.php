<?php
/**
 * RSA Schedule API - Matrix Endpoint
 * Gestisce operazioni CRUD per le matrici dei turni
 * 
 * Endpoints:
 * GET /api/matrix.php?year=X&month=Y - Legge matrice per mese
 * POST /api/matrix.php - Salva matrice
 * DELETE /api/matrix.php?year=X&month=Y - Elimina matrice per mese
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

require_once __DIR__ . '/../core/MatrixManager.php';

try {
    $matrixManager = new MatrixManager();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Legge matrice per mese
            if (isset($_GET['year']) && isset($_GET['month'])) {
                $year = (int) $_GET['year'];
                $month = (int) $_GET['month']; // Frontend passa 0-11
                
                $matrix = $matrixManager->getMatrix($year, $month);
                
                if ($matrix !== null) {
                    echo json_encode([
                        'success' => true,
                        'data' => $matrix,
                        'year' => $year,
                        'month' => $month
                    ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Matrix not found',
                        'year' => $year,
                        'month' => $month
                    ]);
                }
                
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Required parameters: year & month'
                ]);
            }
            break;
            
        case 'POST':
            // Salva matrice
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON input'
                ]);
                break;
            }
            
            if (!isset($input['year']) || !isset($input['month']) || !isset($input['matrix'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Required parameters: year, month, matrix'
                ]);
                break;
            }
            
            $year = (int) $input['year'];
            $month = (int) $input['month']; // Frontend passa 0-11
            $matrix = $input['matrix'];
            
            $result = $matrixManager->saveMatrix($year, $month, $matrix);
            echo json_encode($result);
            break;
            
        case 'DELETE':
            // Elimina matrice
            if (isset($_GET['year']) && isset($_GET['month'])) {
                $year = (int) $_GET['year'];
                $month = (int) $_GET['month']; // Frontend passa 0-11
                
                $result = $matrixManager->deleteMatrix($year, $month);
                echo json_encode($result);
                
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Required parameters: year & month'
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
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
