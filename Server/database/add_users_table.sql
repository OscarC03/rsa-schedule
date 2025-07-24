-- ============================================
-- RSA SCHEDULE - TABELLA UTENTI PER JWT AUTH
-- Aggiornato per sistema JWT con bcrypt
-- ============================================

-- Creazione tabella rsa_users per gestione autenticazione JWT
CREATE TABLE `rsa_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL COMMENT 'bcrypt hash della password',
  `role` enum('admin', 'supervisor', 'user', 'guest') NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTA: Con JWT non serve tabella token
-- I token sono self-contained e non salvati nel DB
-- ============================================
