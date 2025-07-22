<?php
/**
 * RSA Schedule - Settings Manager
 * Gestisce personalizzazioni colori e impostazioni globali
 */

require_once __DIR__ . '/DatabaseManager.php';

class SettingsManager {
    private DatabaseManager $db;
    
    public function __construct() {
        $this->db = DatabaseManager::getInstance();
    }
    
    /**
     * Legge personalizzazioni colori per un periodo
     * @param int $year Anno
     * @param int $month Mese (0-11, compatibile frontend)
     * @return array Personalizzazioni colori
     */
    public function getDateColors(int $year, int $month): array {
        // Converte mese da frontend (0-11) a SQL (1-12)
        $sqlMonth = $month + 1;
        
        $sql = "SELECT * FROM rsa_date_colors 
                WHERE year = :year AND month = :month
                ORDER BY date";
        
        $colors = $this->db->fetchAll($sql, [
            'year' => $year,
            'month' => $sqlMonth
        ]);
        
        // Converti per frontend
        $result = [];
        foreach ($colors as $color) {
            $result[] = [
                'date' => $color['date'],
                'useAlternativeColors' => (bool) $color['use_alternative_colors'],
                'customColors' => json_decode($color['custom_colors'], true) ?? []
            ];
        }
        
        return $result;
    }
    
    /**
     * Salva personalizzazioni colori per una data
     * @param array $colorData Dati personalizzazione colori
     * @return array Risultato operazione
     */
    public function saveDateColor(array $colorData): array {
        try {
            $dateObj = new DateTime($colorData['date']);
            
            $data = [
                'date' => $colorData['date'],
                'year' => (int) $dateObj->format('Y'),
                'month' => (int) $dateObj->format('n'), // n = mese senza zero iniziale
                'use_alternative_colors' => $colorData['useAlternativeColors'] ?? false,
                'custom_colors' => json_encode($colorData['customColors'] ?? [])
            ];
            
            // Verifica se esiste già
            $existing = $this->db->fetchOne(
                "SELECT id FROM rsa_date_colors WHERE date = :date",
                ['date' => $colorData['date']]
            );
            
            if ($existing) {
                // Aggiornamento
                $affected = $this->db->update(
                    'rsa_date_colors',
                    $data,
                    'date = :date',
                    ['date' => $colorData['date']]
                );
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'id' => $existing['id'],
                    'affected_rows' => $affected
                ];
            } else {
                // Inserimento
                $id = $this->db->insert('rsa_date_colors', $data);
                
                return [
                    'success' => true,
                    'action' => 'created',
                    'id' => $id
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Save date color failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Salva batch di personalizzazioni colori
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @param array $colorsArray Array personalizzazioni
     * @return array Risultato operazione
     */
    public function saveDateColors(int $year, int $month, array $colorsArray): array {
        try {
            $this->db->beginTransaction();
            
            $savedCount = 0;
            $errors = [];
            
            foreach ($colorsArray as $colorData) {
                $result = $this->saveDateColor($colorData);
                
                if ($result['success']) {
                    $savedCount++;
                } else {
                    $errors[] = [
                        'date' => $colorData['date'] ?? 'unknown',
                        'error' => $result['message'] ?? 'Unknown error'
                    ];
                }
            }
            
            if (empty($errors)) {
                $this->db->commit();
                return [
                    'success' => true,
                    'action' => 'batch_colors_saved',
                    'saved_count' => $savedCount
                ];
            } else {
                $this->db->rollback();
                return [
                    'success' => false,
                    'error' => 'Batch colors save partially failed',
                    'saved_count' => $savedCount,
                    'errors' => $errors
                ];
            }
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'error' => 'Batch colors save failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Legge una impostazione globale
     * @param string $key Chiave impostazione
     * @return mixed Valore impostazione o null
     */
    public function getSetting(string $key): mixed {
        $sql = "SELECT setting_value FROM rsa_settings WHERE setting_key = :key";
        $result = $this->db->fetchOne($sql, ['key' => $key]);
        
        if ($result) {
            return json_decode($result['setting_value'], true);
        }
        
        return null;
    }
    
    /**
     * Salva una impostazione globale
     * @param string $key Chiave impostazione
     * @param mixed $value Valore impostazione
     * @return array Risultato operazione
     */
    public function saveSetting(string $key, mixed $value): array {
        try {
            $data = [
                'setting_key' => $key,
                'setting_value' => json_encode($value)
            ];
            
            // Verifica se esiste già
            $existing = $this->db->fetchOne(
                "SELECT id FROM rsa_settings WHERE setting_key = :key",
                ['key' => $key]
            );
            
            if ($existing) {
                // Aggiornamento
                $affected = $this->db->update(
                    'rsa_settings',
                    ['setting_value' => json_encode($value)],
                    'setting_key = :key',
                    ['key' => $key]
                );
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'key' => $key,
                    'affected_rows' => $affected
                ];
            } else {
                // Inserimento
                $id = $this->db->insert('rsa_settings', $data);
                
                return [
                    'success' => true,
                    'action' => 'created',
                    'key' => $key,
                    'id' => $id
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Save setting failed',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Elimina personalizzazioni colori per una data
     * @param string $date Data (YYYY-MM-DD)
     * @return array Risultato operazione
     */
    public function deleteDateColor(string $date): array {
        try {
            $affected = $this->db->delete(
                'rsa_date_colors',
                'date = :date',
                ['date' => $date]
            );
            
            return [
                'success' => true,
                'action' => 'deleted',
                'affected_rows' => $affected
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delete date color failed',
                'message' => $e->getMessage()
            ];
        }
    }
}
