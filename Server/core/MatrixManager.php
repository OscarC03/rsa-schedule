<?php
/**
 * RSA Schedule - Matrix Manager
 * Gestisce le matrici dei turni (salvataggio/lettura database)
 */

require_once __DIR__ . '/DatabaseManager.php';

class MatrixManager {
    private DatabaseManager $db;
    
    public function __construct() {
        $this->db = DatabaseManager::getInstance();
    }
      /**
     * Salva una matrice nel database
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @param array $matrix Matrice dei turni
     * @return array Risultato operazione
     */
    public function saveMatrix(int $year, int $month, array $matrix): array {
        try {
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            $matrixJson = addslashes(json_encode($matrix));
            
            // Verifica se esiste già una matrice per questo mese
            $sql = "SELECT `id` FROM `my_turnioperapia`.`rsa_shift_matrix` WHERE `year_month` = '{$yearMonth}'";
            $stmt = $this->db->getConnection()->query($sql);
            $existing = $stmt->fetch();
            
            if ($existing) {
                // Aggiornamento
                $updateSql = "UPDATE `my_turnioperapia`.`rsa_shift_matrix` SET `matrix_data` = '{$matrixJson}', `updated_at` = NOW() WHERE `year_month` = '{$yearMonth}'";
                $result = $this->db->getConnection()->exec($updateSql);
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'year_month' => $yearMonth,
                    'affected_rows' => $result
                ];
            } else {
                // Inserimento
                $insertSql = "INSERT INTO `my_turnioperapia`.`rsa_shift_matrix` (`year_month`, `matrix_data`) VALUES ('{$yearMonth}', '{$matrixJson}')";
                $result = $this->db->getConnection()->exec($insertSql);
                
                return [
                    'success' => true,
                    'action' => 'created',
                    'year_month' => $yearMonth,
                    'id' => $this->db->getConnection()->lastInsertId()
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Save matrix failed',
                'message' => $e->getMessage()
            ];
        }
    }
      /**
     * Legge una matrice dal database
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @return array|null Matrice o null se non trovata
     */
    public function getMatrix(int $year, int $month): ?array {
        try {
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            
            $sql = "SELECT `matrix_data` FROM `my_turnioperapia`.`rsa_shift_matrix` WHERE `year_month` = '{$yearMonth}'";
            $stmt = $this->db->getConnection()->query($sql);
            $result = $stmt->fetch();
            
            if ($result && $result['matrix_data']) {
                return json_decode($result['matrix_data'], true);
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
      /**
     * Elimina una matrice dal database
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @return array Risultato operazione
     */
    public function deleteMatrix(int $year, int $month): array {
        try {
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            
            $sql = "DELETE FROM `my_turnioperapia`.`rsa_shift_matrix` WHERE `year_month` = '{$yearMonth}'";
            $result = $this->db->getConnection()->exec($sql);
            
            return [
                'success' => true,
                'action' => 'deleted',
                'year_month' => $yearMonth,
                'affected_rows' => $result
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Delete matrix failed',
                'message' => $e->getMessage()
            ];
        }
    }
}
