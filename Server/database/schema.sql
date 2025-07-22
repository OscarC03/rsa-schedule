-- ============================================
-- RSA SCHEDULE DATABASE SCHEMA
-- Altervista.org MySQL 8 + PHP 8
-- ============================================

-- Tabella Risorse (OSS)
CREATE TABLE `my_turnioperapia`.`rsa_resources` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME',
  `forbidden_shift_types` JSON,
  `fixed_days` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_resource_type` (`type`),
  INDEX `idx_resource_name` (`last_name`, `first_name`)
) ENGINE = MyISAM;

-- Tabella Turni
CREATE TABLE `my_turnioperapia`.`rsa_shifts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `resource_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `shift_type` VARCHAR(20),
  `absence` VARCHAR(30),
  `absence_hours` INT,
  `floor` INT DEFAULT 0,
  `custom_color` VARCHAR(7),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_resource_date` (`resource_id`, `date`),
  INDEX `idx_date` (`date`),
  INDEX `idx_resource_date` (`resource_id`, `date`),
  INDEX `idx_shift_type` (`shift_type`)
) ENGINE = MyISAM;

-- Tabella Personalizzazioni Colori per Data
CREATE TABLE `my_turnioperapia`.`rsa_date_colors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `use_alternative_colors` BOOLEAN DEFAULT FALSE,
  `custom_colors` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date` (`date`),
  INDEX `idx_year_month` (`year`, `month`)
) ENGINE = MyISAM;

-- Tabella Impostazioni Globali
CREATE TABLE `my_turnioperapia`.`rsa_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting` (`setting_key`)
) ENGINE = MyISAM;

-- ============================================
-- DATI INIZIALI - INSERT RESOURCES
-- ============================================

INSERT INTO `my_turnioperapia`.`rsa_resources` 
(`id`, `first_name`, `last_name`, `type`, `forbidden_shift_types`, `fixed_days`) VALUES
(1, 'Valeria', 'Aschero', 'FULL_TIME', '[]', '[]'),
(2, 'Loredana', 'Baudino', 'FULL_TIME', '[]', '[]'),
(3, 'Valentina', 'Borgna', 'FULL_TIME', '[]', '[]'),
(4, 'Elda', 'Briatore', 'PART_TIME_70', '[]', '[2, 3, 4]'),
(5, 'Anita', 'Canavese', 'FULL_TIME', '[]', '[]'),
(6, 'Laura', 'Canavese', 'PART_TIME_50', '[]', '[2, 3]'),
(7, 'Franca', 'Chiappa', 'FULL_TIME', '[]', '[]'),
(8, 'Michela', 'Colman', 'FULL_TIME', '[]', '[]'),
(9, 'Sabahete', 'Copani', 'FULL_TIME', '[]', '[]'),
(10, 'Lidia', 'Dragomir', 'FULL_TIME', '[]', '[]'),
(11, 'Donatella', 'Frequenti', 'FULL_TIME', '[]', '[]'),
(12, 'Antonietta', 'Gallizio', 'FULL_TIME', '[]', '[]'),
(13, 'Ol''ha', 'Kuku', 'FULL_TIME', '[]', '[]'),
(14, 'Clara', 'Magnino', 'FULL_TIME', '[]', '[]'),
(15, 'Roberta', 'Marenco', 'PART_TIME_70', '[]', '[3, 4, 5]'),
(16, 'Eleonora', 'Nita', 'FULL_TIME', '[]', '[]'),
(17, 'Tiziana', 'Odasso', 'PART_TIME_70', '[]', '[1, 2, 6]'),
(18, 'Luisa', 'Odello', 'FULL_TIME', '[]', '[]'),
(19, 'Josinete', 'Passos Ramos', 'FULL_TIME', '[]', '[]'),
(20, 'Candida', 'Roberi', 'FULL_TIME', '[]', '[]'),
(21, 'Calogero', 'Sansone', 'FULL_TIME', '[]', '[]'),
(22, 'Alessandra', 'Sardo', 'FULL_TIME', '[]', '[]'),
(23, 'Stefania', 'Sereno', 'FULL_TIME', '[]', '[]'),
(24, 'Osenira', 'Silva Camara', 'FULL_TIME', '[]', '[]'),
(25, 'Ioana Rodica', 'Simionescu', 'FULL_TIME', '[]', '[]'),
(26, 'Liudmyla', 'Smirnova', 'FULL_TIME', '[]', '[]'),
(27, 'Anna', 'Vieira Dos Santos', 'FULL_TIME', '[]', '[]');
