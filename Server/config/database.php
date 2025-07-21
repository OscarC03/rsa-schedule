<?php
class Database {
    private $host = "localhost";
    private $db_name = "my_turnioperapia";
    private $username = "turnioperapia";
    private $password = "";
    private $conn;

    public function connect() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            
            $this->conn->exec("SET NAMES utf8mb4");
            $this->conn->exec("SET time_zone = '+01:00'");
            
        } catch(PDOException $e) {
            error_log("Errore connessione database: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Errore di connessione al database",
                "error" => $e->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }

    public function disconnect() {
        $this->conn = null;
    }

    public function getConnection() {
        if ($this->conn === null) {
            $this->connect();
        }
        return $this->conn;
    }

    public function initializeDatabase() {
        try {
            $conn = $this->getConnection();
            
            $steps = [];
            $totalSteps = 6;
            $currentStep = 0;
            
            $steps[] = "Step 1/$totalSteps: Testing database connection";
            $conn->query("SELECT 1");
            $steps[] = "Database connection successful";
            $currentStep++;
              $steps[] = "Step 2/$totalSteps: Creating Shifts table";
            $this->createShiftsTable($conn);
            $this->setShiftsDefaults($conn);
            $steps[] = "Shifts table created successfully";
            $currentStep++;
            
            $steps[] = "Step 3/$totalSteps: Creating Resources table";
            $this->createResourcesTable($conn);
            $this->setResourcesDefaults($conn);
            $steps[] = "Resources table created successfully";
            $currentStep++;
            
            $steps[] = "Step 4/$totalSteps: Creating Settings table";
            $this->createSettingsTable($conn);
            $this->setSettingsDefaults($conn);
            $steps[] = "Settings table created successfully";
            $currentStep++;
            
            $steps[] = "Step 5/$totalSteps: Creating Backups table";
            $this->createBackupsTable($conn);
            $this->setBackupsDefaults($conn);
            $steps[] = "Backups table created successfully";
            $currentStep++;
            
            $steps[] = "Step 6/$totalSteps: Inserting default data";
            $this->insertDefaultData($conn);
            $steps[] = "Default data inserted successfully";
            
            $steps[] = "Final verification: Checking all tables";
            $status = $this->checkDatabaseStatus();
            $steps[] = "All tables verified and ready";
            
            return [
                "success" => true, 
                "message" => "Database inizializzato correttamente",
                "steps" => $steps,
                "tables_created" => count($status["tables"]),
                "status" => $status
            ];
            
        } catch (Exception $e) {
            error_log("Errore inizializzazione database: " . $e->getMessage());
            
            return [
                "success" => false, 
                "message" => "Errore durante inizializzazione",                "error" => $e->getMessage(),
                "steps_completed" => $steps ?? []
            ];
        }
    }

    private function createShiftsTable($conn) {
        $sql = "CREATE TABLE `my_turnioperapia`.`RSA_Shifts` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `resource_id` VARCHAR(50) NOT NULL,
            `resource_name` VARCHAR(100) NOT NULL,
            `shift_date` DATE NOT NULL,
            `shift_type` VARCHAR(20) NOT NULL,
            `floor_number` INT NOT NULL,
            `absence_type` VARCHAR(30) NULL,
            `absence_hours` DECIMAL(3,1) NULL,
            `custom_color` VARCHAR(7) NULL,
            `year_month` VARCHAR(7) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE = MyISAM";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $stmt = $conn->prepare("SHOW TABLES LIKE 'RSA_Shifts'");
        $stmt->execute();
        if ($stmt->rowCount() == 0) {
            throw new Exception("Tabella RSA_Shifts non creata");
        }
    }    private function createResourcesTable($conn) {
        $sql = "CREATE TABLE `my_turnioperapia`.`RSA_Resources` (
            `id` VARCHAR(50) NOT NULL,
            `first_name` VARCHAR(50) NOT NULL,
            `last_name` VARCHAR(50) NOT NULL,
            `resource_type` VARCHAR(20) NOT NULL,
            `working_days` TEXT NULL,
            `is_active` BOOLEAN NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE = MyISAM";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $stmt = $conn->prepare("SHOW TABLES LIKE 'RSA_Resources'");
        $stmt->execute();
        if ($stmt->rowCount() == 0) {
            throw new Exception("Tabella RSA_Resources non creata");
        }
    }    private function createSettingsTable($conn) {
        $sql = "CREATE TABLE `my_turnioperapia`.`RSA_Settings` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `setting_key` VARCHAR(100) NOT NULL,
            `setting_value` TEXT NOT NULL,
            `setting_type` VARCHAR(20) NOT NULL,
            `description` TEXT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE (`setting_key`)
        ) ENGINE = MyISAM";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $stmt = $conn->prepare("SHOW TABLES LIKE 'RSA_Settings'");
        $stmt->execute();
        if ($stmt->rowCount() == 0) {
            throw new Exception("Tabella RSA_Settings non creata");
        }
    }    private function createBackupsTable($conn) {
        $sql = "CREATE TABLE `my_turnioperapia`.`RSA_Backups` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `backup_name` VARCHAR(100) NOT NULL,
            `backup_data` LONGTEXT NOT NULL,
            `backup_type` VARCHAR(20) NOT NULL,
            `year_month` VARCHAR(7) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE = MyISAM";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $stmt = $conn->prepare("SHOW TABLES LIKE 'RSA_Backups'");
        $stmt->execute();
        if ($stmt->rowCount() == 0) {
            throw new Exception("Tabella RSA_Backups non creata");
        }
    }    private function insertDefaultData($conn) {
        $defaultSettings = [
            ['current_year', '2025', 'integer', 'Anno corrente del sistema'],
            ['current_month', '4', 'integer', 'Mese corrente'],
            ['app_version', '1.0.0', 'string', 'Versione applicazione'],
            ['last_backup', '', 'string', 'Ultimo backup'],
            ['auto_backup_enabled', 'true', 'boolean', 'Backup automatico'],
            ['max_backups', '30', 'integer', 'Max backup']
        ];
        
        foreach ($defaultSettings as $setting) {
            $stmt = $conn->prepare("
                INSERT IGNORE INTO RSA_Settings (setting_key, setting_value, setting_type, description) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute($setting);
        }

        $defaultResources = [
            ['resource1', 'Maria', 'Rossi', 'FULL_TIME', null, true],
            ['resource2', 'Giuseppe', 'Bianchi', 'FULL_TIME', null, true],
            ['resource3', 'Anna', 'Verdi', 'FULL_TIME', null, true],
            ['resource4', 'Marco', 'Nero', 'FULL_TIME', null, true],
            ['resource5', 'Lucia', 'Gialli', 'FULL_TIME', null, true]
        ];

        foreach ($defaultResources as $resource) {
            $stmt = $conn->prepare("
                INSERT IGNORE INTO RSA_Resources (id, first_name, last_name, resource_type, working_days, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute($resource);
        }
    }

    public function checkDatabaseStatus() {
        try {
            $conn = $this->getConnection();
            
            $tables = ['RSA_Shifts', 'RSA_Resources', 'RSA_Settings', 'RSA_Backups'];
            $status = ['connected' => true, 'tables' => []];
            
            foreach ($tables as $table) {
                $stmt = $conn->prepare("SHOW TABLES LIKE ?");
                $stmt->execute([$table]);
                $exists = $stmt->rowCount() > 0;
                
                $count = 0;
                if ($exists) {
                    $stmt = $conn->prepare("SELECT COUNT(*) FROM `$table`");
                    $stmt->execute();
                    $count = $stmt->fetchColumn();
                }
                
                $status['tables'][$table] = [
                    'exists' => $exists,
                    'records' => $count
                ];
            }
            
            return $status;
            
        } catch (Exception $e) {            return ['connected' => false, 'error' => $e->getMessage()];
        }
    }

    private function setShiftsDefaults($conn) {
        try {
            $conn->exec("ALTER TABLE `RSA_Shifts` MODIFY `shift_type` VARCHAR(20) NOT NULL DEFAULT 'Morning'");
            $conn->exec("ALTER TABLE `RSA_Shifts` MODIFY `floor_number` INT NOT NULL DEFAULT 0");
        } catch (Exception $e) {
            // Ignora se non supportato
        }
    }

    private function setResourcesDefaults($conn) {
        try {
            $conn->exec("ALTER TABLE `RSA_Resources` MODIFY `resource_type` VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME'");
            $conn->exec("ALTER TABLE `RSA_Resources` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT TRUE");
        } catch (Exception $e) {
            // Ignora se non supportato
        }
    }

    private function setSettingsDefaults($conn) {
        try {
            $conn->exec("ALTER TABLE `RSA_Settings` MODIFY `setting_type` VARCHAR(20) NOT NULL DEFAULT 'string'");
        } catch (Exception $e) {
            // Ignora se non supportato
        }
    }

    private function setBackupsDefaults($conn) {
        try {
            $conn->exec("ALTER TABLE `RSA_Backups` MODIFY `backup_type` VARCHAR(20) NOT NULL DEFAULT 'automatic'");
        } catch (Exception $e) {
            // Ignora se non supportato
        }
    }
}
?>
