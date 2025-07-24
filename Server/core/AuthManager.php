<?php

require_once 'JWTManager.php';

class AuthManager {
    private $db;
    private $jwtManager;
    private $maxLoginAttempts = 5;
    private $lockoutDuration = 900; // 15 minuti in secondi

    public function __construct($database, $jwtSecretKey) {
        $this->db = $database->getConnection(); // Ottiene la connessione PDO
        $this->jwtManager = new JWTManager($jwtSecretKey);
    }

    /**
     * Autentica un utente con email e password
     */
    public function authenticate($email, $password) {
        try {
            // Verifica se l'utente esiste e non è bloccato
            $user = $this->getUserByEmail($email);
            if (!$user) {
                return ['success' => false, 'message' => 'Credenziali non valide'];
            }

            // Verifica se l'account è attivo
            if (!$user['is_active']) {
                return ['success' => false, 'message' => 'Account disattivato'];
            }

            // Verifica se l'account è temporaneamente bloccato
            if ($this->isAccountLocked($user)) {
                return ['success' => false, 'message' => 'Account temporaneamente bloccato. Riprova più tardi.'];
            }            // Verifica la password usando bcrypt
            if (!password_verify($password, $user['password_hash'])) {
                $this->incrementLoginAttempts($user['id']);
                return ['success' => false, 'message' => 'Credenziali non valide'];
            }

            // Login riuscito - reset tentativi e aggiorna ultimo login
            $this->resetLoginAttempts($user['id']);
            $this->updateLastLogin($user['id']);

            // Genera JWT token
            $token = $this->jwtManager->generateToken($user);

            return [
                'success' => true,
                'token' => $token
                // Non includiamo più i dati utente separatamente - sono nel token
            ];

        } catch (Exception $e) {
            error_log("Errore autenticazione: " . $e->getMessage());
            return ['success' => false, 'message' => 'Errore del server'];
        }
    }

    /**
     * Verifica la validità di un token JWT
     */
    public function validateToken($token) {
        return $this->jwtManager->validateToken($token);
    }    /**
     * Logout (con JWT non c'è bisogno di revocare nulla)
     */
    public function logout() {
        // Con JWT non abbiamo bisogno di revocare nulla nel database
        // Il token scadrà automaticamente
        return ['success' => true, 'message' => 'Logout effettuato'];
    }

    /**
     * Ottiene un utente per email
     */    private function getUserByEmail($email) {
        $stmt = $this->db->prepare("SELECT * FROM rsa_users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Verifica se l'account è bloccato
     */
    private function isAccountLocked($user) {
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            return true;
        }
        return false;
    }

    /**
     * Incrementa i tentativi di login e blocca se necessario
     */    private function incrementLoginAttempts($userId) {
        $stmt = $this->db->prepare("
            UPDATE rsa_users 
            SET login_attempts = login_attempts + 1,
                locked_until = CASE 
                    WHEN login_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? SECOND)
                    ELSE locked_until 
                END
            WHERE id = ?
        ");
        $stmt->execute([$this->maxLoginAttempts, $this->lockoutDuration, $userId]);
    }    /**
     * Reset dei tentativi di login
     */
    private function resetLoginAttempts($userId) {
        $stmt = $this->db->prepare("UPDATE rsa_users SET login_attempts = 0, locked_until = NULL WHERE id = ?");
        $stmt->execute([$userId]);
    }

    /**
     * Aggiorna l'ultimo login
     */
    private function updateLastLogin($userId) {
        $stmt = $this->db->prepare("UPDATE rsa_users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$userId]);
    }

    /**
     * Genera un nuovo token di autenticazione
     */
    private function generateAuthToken($userId) {
        // Genera un token sicuro
        $token = bin2hex(random_bytes(32));
        
        // Calcola scadenza (120 minuti)
        $expiresAt = date('Y-m-d H:i:s', time() + $this->tokenExpiry);

        // Salva nel database
        $stmt = $this->db->prepare("
            INSERT INTO `rsa-auth-tokens` (user_id, token, expires_at) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$userId, $token, $expiresAt]);

        return $token;
    }    /**
     * Utility per creare hash password sicuro con bcrypt
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}
