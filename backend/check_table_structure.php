<?php
require_once 'vendor/autoload.php';

use App\Config\Database;

echo "Checking competitors table structure...\n\n";

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // 检查 competitors 表结构
    $stmt = $pdo->query("PRAGMA table_info(competitors)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Competitors table columns:\n";
    foreach ($columns as $column) {
        echo "- " . $column['name'] . " (" . $column['type'] . ")\n";
    }
    
    echo "\n";
    
    // 查询一条记录看实际数据
    $stmt = $pdo->query("SELECT * FROM competitors LIMIT 1");
    $sample = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($sample) {
        echo "Sample record fields:\n";
        foreach ($sample as $key => $value) {
            echo "- $key: " . (is_string($value) && strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) . "\n";
        }
    }
    
    echo "\n";

    // 追加检查 competitor_analyses 表结构
    foreach ([
        'competitor_features',
        'competitor_analyses'
    ] as $tbl) {
        echo "Checking $tbl table structure...\n";
        $stmt = $pdo->query("PRAGMA table_info($tbl)");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            echo "- " . $column['name'] . " (" . $column['type'] . ")\n";
        }
        echo "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>