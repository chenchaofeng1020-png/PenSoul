<?php
require_once 'vendor/autoload.php';

use App\Config\Database;

try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "Database initialized successfully\n";
    
    // 检查表是否存在
    $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table'");
    $tables = $stmt->fetchAll();
    
    echo "Tables created:\n";
    foreach ($tables as $table) {
        echo "- " . $table['name'] . "\n";
    }
    
    // 检查竞品数据
    $stmt = $conn->query("SELECT COUNT(*) as count FROM competitors");
    $result = $stmt->fetch();
    echo "Competitors count: " . $result['count'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}