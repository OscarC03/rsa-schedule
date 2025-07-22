<?php
// Test molto basilare per verificare che PHP funzioni
echo "PHP is working!\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n";

// Test JSON
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Basic PHP test successful',
    'php_version' => phpversion(),
    'timestamp' => date('c')
]);
?>
