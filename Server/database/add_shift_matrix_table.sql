-- Script per aggiungere la tabella rsa_shift_matrix al database esistente
-- Eseguire questo script solo se la tabella non esiste già
-- Sintassi coerente con rsa_users

CREATE TABLE `rsa_shift_matrix` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year_month` varchar(7) NOT NULL COMMENT 'Formato YYYY-MM',
  `matrix_data` longtext NOT NULL COMMENT 'Dati matrice in formato JSON',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_year_month` (`year_month`),
  KEY `idx_year_month` (`year_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
