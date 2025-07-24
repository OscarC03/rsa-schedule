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
     */    public function saveMatrix(int $year, int $month, array $matrix): array {
        try {
            // Log dei parametri ricevuti
            error_log("MatrixManager::saveMatrix called with year=$year, month=$month");
            error_log("Matrix data size: " . count($matrix) . " items");
            
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            $matrixJson = json_encode($matrix, JSON_UNESCAPED_UNICODE);
            
            if ($matrixJson === false) {
                error_log("JSON encoding failed for matrix data");
                return [
                    'success' => false,
                    'error' => 'Failed to encode matrix data to JSON'
                ];
            }
            
            // Escape per sicurezza
            $matrixJsonEscaped = addslashes($matrixJson);
            
            $conn = $this->db->getConnection();
            error_log("Database connection established for matrix save");
              // Verifica se la tabella esiste
            $tableCheck = $conn->query("SHOW TABLES LIKE 'rsa_shift_matrix'");
            if ($tableCheck->rowCount() === 0) {
                error_log("Table rsa_shift_matrix does not exist");
                return [
                    'success' => false,
                    'error' => 'Table rsa_shift_matrix does not exist. Please run the setup SQL script.'
                ];
            }
              // Verifica se esiste già una matrice per questo mese - QUERY DIRETTA
            $checkSql = "SELECT `id` FROM `rsa_shift_matrix` WHERE `year_month` = '$yearMonth'";
            error_log("Check query: $checkSql");
            $stmt = $conn->query($checkSql);
            $existing = $stmt->fetch();
            
            error_log("Existing record check for $yearMonth: " . ($existing ? "found ID " . $existing['id'] : "not found"));
            
            if ($existing) {
                // Aggiornamento - QUERY DIRETTA
                error_log("Updating existing matrix for $yearMonth");
                $updateSql = "UPDATE `rsa_shift_matrix` SET `matrix_data` = '$matrixJsonEscaped', `updated_at` = NOW() WHERE `year_month` = '$yearMonth'";
                error_log("Update query: " . substr($updateSql, 0, 100) . "...");
                $result = $conn->exec($updateSql);
                
                error_log("Update result: " . ($result !== false ? "success" : "failed"));
                
                return [
                    'success' => ($result !== false),
                    'action' => 'updated',
                    'year_month' => $yearMonth,
                    'message' => 'Matrix updated successfully',
                    'affected_rows' => $result
                ];            } else {
                // Inserimento - QUERY DIRETTA
                error_log("Inserting new matrix for $yearMonth");
                $insertSql = "INSERT INTO `rsa_shift_matrix` (`year_month`, `matrix_data`) VALUES ('$yearMonth', '$matrixJsonEscaped')";
                error_log("Insert query: " . substr($insertSql, 0, 100) . "...");
                $result = $conn->exec($insertSql);
                
                error_log("Insert result: " . ($result !== false ? "success" : "failed"));
                if ($result !== false) {
                    error_log("New record ID: " . $conn->lastInsertId());
                }
                
                return [
                    'success' => ($result !== false),
                    'action' => 'inserted',
                    'year_month' => $yearMonth,
                    'message' => 'Matrix saved successfully',
                    'id' => $conn->lastInsertId()
                ];
            }
            
        } catch (Exception $e) {
            error_log("MatrixManager::saveMatrix error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage(),
                'year_month' => $yearMonth ?? null,
                'debug_info' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ];
        }
    }
    
    /**
     * Carica una matrice dal database
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @return array|null Matrice o null se non trovata
     */    public function getMatrix(int $year, int $month): ?array {
        try {
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            
            error_log("MatrixManager::getMatrix called for $yearMonth");
            
            $conn = $this->db->getConnection();
              // Query diretta
            $sql = "SELECT `matrix_data` FROM `rsa_shift_matrix` WHERE `year_month` = '$yearMonth'";
            error_log("Get query: $sql");
            $stmt = $conn->query($sql);
            $result = $stmt->fetch();
            
            if ($result && $result['matrix_data']) {
                error_log("Matrix found for $yearMonth");
                return json_decode($result['matrix_data'], true);
            }
            
            error_log("No matrix found for $yearMonth");
            return null;
            
        } catch (Exception $e) {
            error_log("MatrixManager::getMatrix error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Elimina una matrice dal database
     * @param int $year Anno
     * @param int $month Mese (0-11, frontend)
     * @return array Risultato operazione
     */    public function deleteMatrix(int $year, int $month): array {
        try {
            // Converte mese da frontend (0-11) a stringa (01-12)
            $sqlMonth = str_pad($month + 1, 2, '0', STR_PAD_LEFT);
            $yearMonth = "{$year}-{$sqlMonth}";
            
            $conn = $this->db->getConnection();
              // Query diretta
            $sql = "DELETE FROM `rsa_shift_matrix` WHERE `year_month` = '$yearMonth'";
            error_log("Delete query: $sql");
            $result = $conn->exec($sql);
            
            return [
                'success' => ($result !== false),
                'action' => 'deleted',
                'year_month' => $yearMonth,
                'affected_rows' => $result
            ];
            
        } catch (Exception $e) {
            error_log("MatrixManager::deleteMatrix error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage(),
                'year_month' => $yearMonth ?? null
            ];
        }
    }
    
    /**
     * Lista tutte le matrici disponibili
     * @return array Lista delle matrici con metadati
     */
    public function listMatrices(): array {        try {
            $conn = $this->db->getConnection();
            $stmt = $conn->query("SELECT `year_month`, `created_at`, `updated_at` FROM `rsa_shift_matrix` ORDER BY `year_month` DESC");
            
            $matrices = [];
            while ($row = $stmt->fetch()) {
                $matrices[] = [
                    'year_month' => $row['year_month'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }
            
            return [
                'success' => true,
                'data' => $matrices,
                'count' => count($matrices)
            ];
            
        } catch (Exception $e) {
            error_log("MatrixManager::listMatrices error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
}
