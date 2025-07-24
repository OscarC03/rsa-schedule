<?php

/**
 * JWT Manager - Gestione JSON Web Token sicura
 * Non salva token nel database, tutto è self-contained nel token
 */
class JWTManager {
    private $secretKey;
    private $algorithm;
    private $tokenExpiry;
    private $issuer;
    private $audience;

    public function __construct($secretKey = null) {
        // Usa la configurazione dal config.php se disponibile
        if (defined('JWT_CONFIG')) {
            $this->secretKey = $secretKey ?: JWT_CONFIG['secret_key'];
            $this->algorithm = JWT_CONFIG['algorithm'];
            $this->tokenExpiry = JWT_CONFIG['expiry_hours'] * 3600; // Converti ore in secondi
            $this->issuer = JWT_CONFIG['issuer'];
            $this->audience = JWT_CONFIG['audience'];
        } else {
            // Fallback per compatibilità
            $this->secretKey = $secretKey ?: 'fallback_secret_key_change_immediately';
            $this->algorithm = 'HS256';
            $this->tokenExpiry = 7200; // 2 ore
            $this->issuer = 'RSA-Schedule';
            $this->audience = 'RSA-Users';
        }
        
        // Validazione chiave segreta
        if (strlen($this->secretKey) < 32) {
            throw new InvalidArgumentException('JWT secret key deve essere almeno 32 caratteri');
        }
    }

    /**
     * Genera un JWT sicuro
     */
    public function generateToken($user) {
        $now = time();
        
        $header = json_encode([
            'typ' => 'JWT', 
            'alg' => $this->algorithm
        ]);
          $payload = json_encode([
            'iss' => $this->issuer,        // issuer
            'aud' => $this->audience,      // audience  
            'iat' => $now,                 // issued at
            'exp' => $now + $this->tokenExpiry, // expires at
            'nbf' => $now,                 // not before
            'jti' => bin2hex(random_bytes(16)), // unique token ID
            // Dati utente
            'user_id' => (int)$user['id'],
            'email' => $user['email'],            'username' => isset($user['username']) ? $user['username'] : '',
            'first_name' => isset($user['first_name']) ? $user['first_name'] : '',
            'last_name' => isset($user['last_name']) ? $user['last_name'] : '',
            'role' => $user['role'],
            'login_time' => $now
        ]);

        $headerEncoded = $this->base64UrlEncode($header);
        $payloadEncoded = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, $this->secretKey, true);
        $signatureEncoded = $this->base64UrlEncode($signature);

        return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
    }

    /**
     * Valida e decodifica un JWT con controlli di sicurezza completi
     */
    public function validateToken($token) {
        if (empty($token)) {
            return ['success' => false, 'message' => 'Token vuoto'];
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return ['success' => false, 'message' => 'Token formato non valido'];
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        try {
            // Verifica signature
            $expectedSignature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, $this->secretKey, true);
            $expectedSignatureEncoded = $this->base64UrlEncode($expectedSignature);
            
            if (!hash_equals($expectedSignatureEncoded, $signatureEncoded)) {
                return ['success' => false, 'message' => 'Signature token non valida'];
            }

            // Decodifica header e payload
            $header = json_decode($this->base64UrlDecode($headerEncoded), true);
            $payload = json_decode($this->base64UrlDecode($payloadEncoded), true);

            if (!$header || !$payload) {
                return ['success' => false, 'message' => 'Token corrotto'];
            }

            // Verifica algoritmo
            if ($header['alg'] !== $this->algorithm) {
                return ['success' => false, 'message' => 'Algoritmo token non supportato'];
            }

            // Verifica issuer e audience
            if (isset($payload['iss']) && $payload['iss'] !== $this->issuer) {
                return ['success' => false, 'message' => 'Token issuer non valido'];
            }
            
            if (isset($payload['aud']) && $payload['aud'] !== $this->audience) {
                return ['success' => false, 'message' => 'Token audience non valido'];
            }

            // Verifica timing
            $now = time();
            
            if (isset($payload['exp']) && $payload['exp'] < $now) {
                return ['success' => false, 'message' => 'Token scaduto'];
            }
            
            if (isset($payload['nbf']) && $payload['nbf'] > $now) {
                return ['success' => false, 'message' => 'Token non ancora valido'];
            }
            
            if (isset($payload['iat']) && $payload['iat'] > $now) {
                return ['success' => false, 'message' => 'Token emesso nel futuro'];
            }

            return [
                'success' => true, 
                'payload' => $payload,
                'expires_in' => isset($payload['exp']) ? $payload['exp'] - $now : null
            ];

        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Errore validazione token'];
        }
    }

    /**
     * Estrae solo i dati utente dal payload
     */
    public function extractUserData($token) {
        $validation = $this->validateToken($token);
        
        if (!$validation['success']) {
            return $validation;
        }

        $payload = $validation['payload'];
          return [
            'success' => true,
            'user' => [
                'id' => $payload['user_id'],
                'email' => $payload['email'],                'username' => isset($payload['username']) ? $payload['username'] : '',
                'first_name' => isset($payload['first_name']) ? $payload['first_name'] : '',
                'last_name' => isset($payload['last_name']) ? $payload['last_name'] : '',
                'role' => $payload['role'],
                'login_time' => $payload['login_time']
            ],
            'expires_in' => $validation['expires_in']
        ];
    }

    /**
     * Rinnova un token se è ancora valido
     */
    public function refreshToken($token) {
        $validation = $this->validateToken($token);
        
        if (!$validation['success']) {
            return $validation;
        }

        // Crea un nuovo token con gli stessi dati utente
        $payload = $validation['payload'];        $userData = [
            'id' => $payload['user_id'],
            'email' => $payload['email'],
            'username' => isset($payload['username']) ? $payload['username'] : '',
            'first_name' => isset($payload['first_name']) ? $payload['first_name'] : '',
            'last_name' => isset($payload['last_name']) ? $payload['last_name'] : '',
            'role' => $payload['role']
        ];

        $newToken = $this->generateToken($userData);
        
        return [
            'success' => true,
            'token' => $newToken,
            'message' => 'Token rinnovato con successo'
        ];
    }

    /**
     * Base64 URL encoding (RFC 4648)
     */
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decoding (RFC 4648)
     */
    private function base64UrlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    /**
     * Ottiene informazioni sul token senza validare la scadenza
     */
    public function inspectToken($token) {
        if (empty($token)) {
            return ['success' => false, 'message' => 'Token vuoto'];
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return ['success' => false, 'message' => 'Token formato non valido'];
        }

        try {
            $payload = json_decode($this->base64UrlDecode($parts[1]), true);
            
            if (!$payload) {
                return ['success' => false, 'message' => 'Payload non decodificabile'];
            }

            $now = time();
            
            return [
                'success' => true,
                'payload' => $payload,
                'is_expired' => isset($payload['exp']) && $payload['exp'] < $now,
                'expires_at' => isset($payload['exp']) ? date('Y-m-d H:i:s', $payload['exp']) : null,
                'issued_at' => isset($payload['iat']) ? date('Y-m-d H:i:s', $payload['iat']) : null,
                'time_to_expiry' => isset($payload['exp']) ? $payload['exp'] - $now : null
            ];

        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Errore ispezione token'];
        }
    }
}
