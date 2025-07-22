<?php
/**
 * RSA Schedule - Database Manager
 * Gestisce connessione MySQL per Altervista.org
 * PHP 8 + MySQL 8
 */

class DatabaseManager {
    private static $instance = null;
    private $connection;
    
    // Configurazione per Altervista.org
    private const DB_HOST = 'localhost';
    private const DB_NAME = 'my_turnioperapia';
    private const DB_USER = 'turnioperapia'; // Il tuo username Altervista
    private const DB_PASS = ''; // Password database Altervista
    
    private function __construct() {
        $this->connect();
    }
    
    public static function getInstance(): DatabaseManager {
        if (self::$instance === null) {
            self::$instance = new DatabaseManager();
        }
        return self::$instance;
    }
    
    private function connect(): void {
        try {
            $this->connection = new PDO(
                "mysql:host=" . self::DB_HOST . ";dbname=" . self::DB_NAME . ";charset=utf8mb4",
                self::DB_USER,
                self::DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (PDOException $e) {
            $this->handleError("Connessione database fallita", $e);
        }
    }
    
    public function getConnection(): PDO {
        return $this->connection;
    }
    
    public function query(string $sql, array $params = []): PDOStatement {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            $this->handleError("Query fallita: " . $sql, $e);
        }
    }
    
    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }
    
    public function fetchOne(string $sql, array $params = []): ?array {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }
    
    public function insert(string $table, array $data): int {
        $columns = implode(',', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        
        return (int) $this->connection->lastInsertId();
    }
    
    public function update(string $table, array $data, string $whereClause, array $whereParams = []): int {
        $setParts = [];
        foreach (array_keys($data) as $column) {
            $setParts[] = "{$column} = :{$column}";
        }
        $setClause = implode(', ', $setParts);
        
        $sql = "UPDATE {$table} SET {$setClause} WHERE {$whereClause}";
        $params = array_merge($data, $whereParams);
        
        return $this->query($sql, $params)->rowCount();
    }
    
    public function delete(string $table, string $whereClause, array $whereParams = []): int {
        $sql = "DELETE FROM {$table} WHERE {$whereClause}";
        return $this->query($sql, $whereParams)->rowCount();
    }
    
    public function beginTransaction(): void {
        $this->connection->beginTransaction();
    }
    
    public function commit(): void {
        $this->connection->commit();
    }
    
    public function rollback(): void {
        $this->connection->rollBack();
    }
    
    private function handleError(string $message, PDOException $e): never {
        error_log("Database Error: {$message} - " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database Error',
            'message' => $message
        ]);
        exit;
    }
}
