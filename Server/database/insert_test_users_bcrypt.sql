-- ============================================
-- RSA SCHEDULE - UTENTI DI TEST CON BCRYPT
-- Password sicure per ambiente di test/produzione
-- ============================================

-- Elimina eventuali utenti di test esistenti
DELETE FROM rsa_users WHERE email IN (
    'admin@opera-pia-garelli.it',
    'supervisor@opera-pia-garelli.it', 
    'user@opera-pia-garelli.it',
    'test@opera-pia-garelli.it'
);

-- ============================================
-- UTENTE AMMINISTRATORE
-- Email: admin@opera-pia-garelli.it
-- Password: admin123
-- ============================================
INSERT INTO rsa_users (
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at
) VALUES (
    'admin',
    'admin@opera-pia-garelli.it',
    '$2y$12$AztemFRxEU2FYWMlTItq4eS2cuDl3gVbAdz7qcUdzgwPvjGP9hIbS',
    'admin',
    1,
    NOW()
);

-- ============================================
-- UTENTE SUPERVISORE
-- Email: supervisor@opera-pia-garelli.it
-- Password: supervisor123
-- ============================================
INSERT INTO rsa_users (
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at
) VALUES (
    'supervisor',
    'supervisor@opera-pia-garelli.it',
    '$2y$12$A4A6XlvvCoSd7Rnvq3yrh.ClzCEfTTIIWDXlq21EoewfvD/DPZ8GO',
    'supervisor',
    1,
    NOW()
);

-- ============================================
-- UTENTE STANDARD
-- Email: user@opera-pia-garelli.it
-- Password: user123
-- ============================================
INSERT INTO rsa_users (
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at
) VALUES (
    'user',
    'user@opera-pia-garelli.it',
    '$2y$12$ae3qgjGtCr1q7aouNOl0IOrd1StQElIeVCC3sr0uTDZdmecoRUfMu',
    'user',
    1,
    NOW()
);

-- ============================================
-- UTENTE DI TEST
-- Email: test@opera-pia-garelli.it
-- Password: test123
-- ============================================
INSERT INTO rsa_users (
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at
) VALUES (
    'test',
    'test@opera-pia-garelli.it',
    '$2y$12$hEAZJ9XkpEF1QjooDXu9G.Nf.hTqEQ4yECU8ZuojzlJwJMl53GAgW',
    'user',
    1,
    NOW()
);

-- ============================================
-- VERIFICA INSERIMENTO
-- ============================================
SELECT 
    id,
    username,
    email,
    role,
    is_active,
    created_at
FROM rsa_users 
WHERE email LIKE '%opera-pia-garelli.it'
ORDER BY role DESC, username;
