<?php
/**
 * RSA Schedule API - Resources Endpoint
 * Gestisce operazioni CRUD per le risorse OSS
 * 
 * Endpoints:
 * GET /api/resources.php - Legge tutte le risorse
 * POST /api/resources.php - Salva/aggiorna risorse
 * DELETE /api/resources.php?id=X - Elimina risorsa
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

require_once __DIR__ . '/../core/ResourcesManager.php';

try {
    $resourcesManager = new ResourcesManager();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Legge tutte le risorse
            $resources = $resourcesManager->getAllResources();
            echo json_encode([
                'success' => true,
                'data' => $resources,
                'count' => count($resources)
            ]);
            break;
            
        case 'POST':
            // Salva risorse (singola o batch)
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON input'
                ]);
                break;
            }
            
            // Verifica se è un array di risorse o una singola risorsa
            if (isset($input[0]) && is_array($input[0])) {
                // Batch di risorse
                $result = $resourcesManager->saveAllResources($input);
            } else {
                // Singola risorsa
                $result = $resourcesManager->saveResource($input);
            }
            
            echo json_encode($result);
            break;
            
        case 'DELETE':
            // Elimina risorsa
            $resourceId = $_GET['id'] ?? null;
            
            if (!$resourceId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Resource ID required'
                ]);
                break;
            }
            
            $result = $resourcesManager->deleteResource($resourceId);
            echo json_encode($result);
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
