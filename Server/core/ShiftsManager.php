<?php
/**
 * RSA Schedule - Shifts Manager
 * Gestisce i turni (salvataggio/lettura database)
 */

require_once __DIR__ . '/DatabaseManager.php';

class ShiftsManager {
    private DatabaseManager $db;
    
    public function __construct() {
        $this->db = DatabaseManager::getInstance();
    }
    
    /**
     * Legge tutti i turni per un periodo specifico
     * @param string $startDate Data inizio (YYYY-MM-DD)
     * @param string $endDate Data fine (YYYY-MM-DD)
     * @return array Array di turni in formato frontend
     */
    public function getShiftsByDateRange(string $startDate, string $endDate): array {
        $sql = "SELECT * FROM rsa_shifts 
                WHERE date >= :start_date AND date <= :end_date 
                ORDER BY resource_id, date";
        
        $shifts = $this->db->fetchAll($sql, [
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        // Converti per frontend
        $result = [];
        foreach ($shifts as $shift) {
            $result[] = [
                'id' => (string) $shift['id'],
                'resourceId' => (string) $shift['resource_id'],
                'date' => $shift['date'],
                'shiftType' => $shift['shift_type'],
                'absence' => $shift['absence'],
                'absenceHours' => $shift['absence_hours'] ? (int) $shift['absence_hours'] : null,
                'floor' => (int) $shift['floor'],
                'customColor' => $shift['custom_color']
            ];
        }
        
        return $result;
    }
    
    /**
     * Legge tutti i turni per un mese specifico
     * @param int $year Anno
     * @param int $month Mese (0-11, compatibile con frontend)
     * @return array Array di turni
     */
    public function getShiftsByMonth(int $year, int $month): array {
        // Converte mese da frontend (0-11) a SQL (1-12)
        $sqlMonth = $month + 1;
        
        $sql = "SELECT * FROM rsa_shifts 
                WHERE YEAR(date) = :year AND MONTH(date) = :month
                ORDER BY resource_id, date";
        
        return $this->db->fetchAll($sql, [
            'year' => $year,
            'month' => $sqlMonth
        ]);
    }
    
    /**
     * Salva un turno (nuovo o aggiornamento)
     * @param array $shiftData Dati turno in formato frontend
     * @return array Risultato operazione
     */
    public function saveShift(array $shiftData): array {
        try {
            $data = [
                'resource_id' => (int) $shiftData['resourceId'],
                'date' => $shiftData['date'],
                'shift_type' => $shiftData['shiftType'] ?? null,
                'absence' => $shiftData['absence'] ?? null,
                'absence_hours' => isset($shiftData['absenceHours']) ? (int) $shiftData['absenceHours'] : null,
                'floor' => (int) ($shiftData['floor'] ?? 0),
                'custom_color' => $shiftData['customColor'] ?? null
            ];
            
            // Verifica se esiste già un turno per questa risorsa e data
            $existing = $this->db->fetchOne(
                "SELECT id FROM rsa_shifts WHERE resource_id = :resource_id AND date = :date",
                ['resource_id' => $data['resource_id'], 'date' => $data['date']]
            );
            
            if ($existing) {
                // Aggiornamento
                $affected = $this->db->update(
                    'rsa_shifts',
                    $data,
                    'resource_id = :resource_id AND date = :date',
                    ['resource_id' => $data['resource_id'], 'date' => $data['date']]
                );
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'id' => $existing['id'],
                    'affected_rows' => $affected
                ];
            } else {
                // Inserimento
                $id = $this->db->insert('rsa_shifts', $data);
                
                return [
                    'success' => true,
                    'action' => 'created',
                    'id' => $id
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Save shift failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Salva matrice completa di turni (batch operation)
     * @param array $matrixData Matrice turni dal frontend
     * @return array Risultato operazione
     */
    public function saveShiftMatrix(array $matrixData): array {
        try {
            $this->db->beginTransaction();
            
            $savedCount = 0;
            $errors = [];
            
            foreach ($matrixData as $resourceId => $dates) {
                foreach ($dates as $date => $shiftData) {
                    if ($shiftData && !empty($shiftData)) {
                        $shiftData['resourceId'] = $resourceId;
                        $shiftData['date'] = $date;
                        
                        $result = $this->saveShift($shiftData);
                        
                        if ($result['success']) {
                            $savedCount++;
                        } else {
                            $errors[] = [
                                'resourceId' => $resourceId,
                                'date' => $date,
                                'error' => $result['message'] ?? 'Unknown error'
                            ];
                        }
                    }
                }
            }
            
            if (empty($errors)) {
                $this->db->commit();
                return [
                    'success' => true,
                    'action' => 'matrix_saved',
                    'saved_count' => $savedCount
                ];
            } else {
                $this->db->rollback();
                return [
                    'success' => false,
                    'error' => 'Matrix save partially failed',
                    'saved_count' => $savedCount,
                    'errors' => $errors
                ];
            }
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => 'Matrix save failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Elimina un turno
     * @param string $resourceId ID risorsa
     * @param string $date Data (YYYY-MM-DD)
     * @return array Risultato operazione
     */
    public function deleteShift(string $resourceId, string $date): array {
        try {
            $affected = $this->db->delete(
                'rsa_shifts',
                'resource_id = :resource_id AND date = :date',
                ['resource_id' => $resourceId, 'date' => $date]
            );
            
            return [
                'success' => true,
                'action' => 'deleted',
                'affected_rows' => $affected
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delete shift failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Elimina tutti i turni di un periodo
     * @param string $startDate Data inizio
     * @param string $endDate Data fine
     * @return array Risultato operazione
     */
    public function deleteShiftsByDateRange(string $startDate, string $endDate): array {
        try {
            $affected = $this->db->delete(
                'rsa_shifts',
                'date >= :start_date AND date <= :end_date',
                ['start_date' => $startDate, 'end_date' => $endDate]
            );
            
            return [
                'success' => true,
                'action' => 'range_deleted',
                'affected_rows' => $affected,
                'date_range' => [$startDate, $endDate]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delete range failed',
                'message' => $e->getMessage()
            ];
        }
    }
}
