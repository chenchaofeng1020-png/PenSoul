<?php
require_once 'vendor/autoload.php';

use App\Models\Competitor;
use App\Config\Database;

echo "Checking competitors in database...\n\n";

try {
    // 初始化数据库连接
    $database = new Database();
    $pdo = $database->getConnection();
    
    // 查询所有竞品
    $stmt = $pdo->query("SELECT * FROM competitors");
    $competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total competitors in database: " . count($competitors) . "\n\n";
    
    if (count($competitors) > 0) {
        foreach ($competitors as $competitor) {
            echo "ID: " . $competitor['id'] . "\n";
            echo "Product ID: " . $competitor['product_id'] . "\n";
            echo "Name: " . $competitor['name'] . "\n";
            echo "Slogan: " . $competitor['slogan'] . "\n";
            echo "Description: " . substr($competitor['description'], 0, 100) . "...\n";
            echo "Main Customers: " . $competitor['main_customers'] . "\n";
            echo "Recent Updates: " . $competitor['recent_updates'] . "\n";
            echo "Last Updated: " . $competitor['last_updated'] . "\n";
            echo "Created At: " . $competitor['created_at'] . "\n";
            echo "Updated At: " . $competitor['updated_at'] . "\n";
            echo "---\n";
        }
    } else {
        echo "No competitors found in database.\n";
    }
    
    // 查询产品ID为1的竞品
    echo "\nCompetitors for product ID 1:\n";
    $stmt = $pdo->prepare("SELECT * FROM competitors WHERE product_id = ?");
    $stmt->execute([1]);
    $product1Competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Count: " . count($product1Competitors) . "\n";
    foreach ($product1Competitors as $competitor) {
        echo "- " . $competitor['name'] . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>