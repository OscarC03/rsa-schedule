<?php
/**
 * RSA Schedule - Resources Manager  
 * Gestisce le risorse OSS (salvattaggio/lettura database)
 */

require_once __DIR__ . '/DatabaseManager.php';

class ResourcesManager {
    private DatabaseManager $db;
    
    public function __construct() {
        $this->db = DatabaseManager::getInstance();
    }
    
    /**
     * Legge tutte le risorse dal database
     * @return array Array di risorse in formato JSON compatibile con frontend
     */
    public function getAllResources(): array {
        $sql = "SELECT * FROM rsa_resources ORDER BY last_name, first_name";
        $resources = $this->db->fetchAll($sql);
        
        // Converti per frontend
        $result = [];
        foreach ($resources as $resource) {
            $result[] = [
                'id' => (string) $resource['id'],
                'firstName' => $resource['first_name'],
                'lastName' => $resource['last_name'],
                'type' => $resource['type'],
                'forbiddenShiftTypes' => json_decode($resource['forbidden_shift_types'], true) ?? [],
                'fixedDays' => json_decode($resource['fixed_days'], true) ?? []
            ];
        }
        
        return $result;
    }
    
    /**
     * Salva una risorsa (nuova o aggiornamento)
     * @param array $resourceData Dati risorsa in formato frontend
     * @return array Risultato operazione
     */
    public function saveResource(array $resourceData): array {
        try {
            $data = [
                'first_name' => $resourceData['firstName'] ?? '',
                'last_name' => $resourceData['lastName'] ?? '',
                'type' => $resourceData['type'] ?? 'FULL_TIME',
                'forbidden_shift_types' => json_encode($resourceData['forbiddenShiftTypes'] ?? []),
                'fixed_days' => json_encode($resourceData['fixedDays'] ?? [])
            ];
            
            if (isset($resourceData['id']) && !empty($resourceData['id'])) {
                // Aggiornamento
                $affected = $this->db->update(
                    'rsa_resources', 
                    $data, 
                    'id = :id', 
                    ['id' => $resourceData['id']]
                );
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'id' => $resourceData['id'],
                    'affected_rows' => $affected
                ];
            } else {
                // Inserimento
                $id = $this->db->insert('rsa_resources', $data);
                
                return [
                    'success' => true,
                    'action' => 'created',
                    'id' => $id
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Save failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Salva tutte le risorse (batch operation)
     * @param array $resourcesArray Array di risorse dal frontend
     * @return array Risultato operazione
     */
    public function saveAllResources(array $resourcesArray): array {
        try {
            $this->db->beginTransaction();
            
            $results = [];
            foreach ($resourcesArray as $resource) {
                $result = $this->saveResource($resource);
                $results[] = $result;
                
                if (!$result['success']) {
                    $this->db->rollback();
                    return [
                        'success' => false,
                        'error' => 'Batch save failed',
                        'failed_resource' => $resource,
                        'results' => $results
                    ];
                }
            }
            
            $this->db->commit();
            
            return [
                'success' => true,
                'action' => 'batch_saved',
                'count' => count($resourcesArray),
                'results' => $results
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => 'Batch save failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Elimina una risorsa
     * @param string $resourceId ID risorsa
     * @return array Risultato operazione  
     */
    public function deleteResource(string $resourceId): array {
        try {
            // Prima elimina tutti i turni associati
            $this->db->delete('rsa_shifts', 'resource_id = :id', ['id' => $resourceId]);
            
            // Poi elimina la risorsa
            $affected = $this->db->delete('rsa_resources', 'id = :id', ['id' => $resourceId]);
            
            return [
                'success' => true,
                'action' => 'deleted',
                'id' => $resourceId,
                'affected_rows' => $affected
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delete failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Verifica se una risorsa exists
     * @param string $resourceId ID risorsa
     * @return bool True se esiste
     */
    public function resourceExists(string $resourceId): bool {
        $sql = "SELECT COUNT(*) as count FROM rsa_resources WHERE id = :id";
        $result = $this->db->fetchOne($sql, ['id' => $resourceId]);
        return ($result['count'] ?? 0) > 0;
    }
}
