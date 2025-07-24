<?php
/**
 * Utility per generare hash SHA256 delle password
 * Eseguire da linea di comando: php hash_password.php password123
 */

function hashPassword($password) {
    return hash('sha256', $password);
}

// Se eseguito da linea di comando
if (isset($argc) && $argc > 1) {
    $password = $argv[1];
    $hash = hashPassword($password);
    
    echo "Password: $password\n";
    echo "SHA256 Hash: $hash\n";
    echo "\nSQL per inserimento utente:\n";
    echo "INSERT INTO `rsa-users` (email, password_hash, first_name, last_name, role) VALUES\n";
    echo "('email@example.com', '$hash', 'Nome', 'Cognome', 'user');\n";
} else {
    echo "Uso: php hash_password.php 'password_da_hash'\n";
    echo "Esempio: php hash_password.php admin123\n";
}

// Per test interattivo via web
if (isset($_GET['password'])) {
    $password = $_GET['password'];
    $hash = hashPassword($password);
    
    echo "<h2>Password Hash Generator</h2>";
    echo "<p><strong>Password:</strong> " . htmlspecialchars($password) . "</p>";
    echo "<p><strong>SHA256 Hash:</strong> <code>$hash</code></p>";
    
    echo "<h3>SQL per inserimento:</h3>";
    echo "<textarea rows='5' cols='80' readonly>";
    echo "INSERT INTO `rsa-users` (email, password_hash, first_name, last_name, role) VALUES\n";
    echo "('email@example.com', '$hash', 'Nome', 'Cognome', 'user');";
    echo "</textarea>";
    
    echo "<hr>";
    echo "<form method='GET'>";
    echo "<label>Password: <input type='text' name='password' placeholder='Inserisci password'></label>";
    echo "<button type='submit'>Genera Hash</button>";
    echo "</form>";
} elseif (!isset($argc)) {
    // Interfaccia web di base
    echo "<h2>Password Hash Generator</h2>";
    echo "<form method='GET'>";
    echo "<label>Password: <input type='text' name='password' placeholder='Inserisci password' required></label>";
    echo "<button type='submit'>Genera Hash SHA256</button>";
    echo "</form>";
    
    echo "<hr>";
    echo "<h3>Utenti di test predefiniti:</h3>";
    echo "<ul>";
    echo "<li><strong>admin@opera-pia-garelli.it</strong> - Password: admin123</li>";
    echo "<li><strong>supervisor@opera-pia-garelli.it</strong> - Password: supervisor123</li>";
    echo "<li><strong>user@opera-pia-garelli.it</strong> - Password: user123</li>";
    echo "</ul>";
}
?>
