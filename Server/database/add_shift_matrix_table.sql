-- Script per aggiungere la tabella rsa_shift_matrix al database esistente
-- Eseguire questo script solo se la tabella non esiste già

CREATE TABLE IF NOT EXISTS `my_turnioperapia`.`rsa_shift_matrix` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `year_month` VARCHAR(7) NOT NULL,
  `matrix_data` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_year_month` (`year_month`)
) ENGINE = MyISAM;
