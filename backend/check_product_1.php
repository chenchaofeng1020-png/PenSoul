<?php
require_once 'vendor/autoload.php';

use App\Config\Database;

echo "Checking Product ID 1 details...\n\n";

$database = new Database();
$db = $database->getConnection();

// 检查产品ID为1的详细信息
$stmt = $db->query("SELECT p.*, up.user_id FROM products p LEFT JOIN user_products up ON p.id = up.product_id WHERE p.id = 1");
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result) {
    echo "Product ID 1 details:\n";
    echo "Name: {$result['name']}\n";
    echo "User ID: {$result['user_id']}\n";
    echo "Created at: {$result['created_at']}\n";
    echo "Status: " . ($result['deleted_at'] ? 'Deleted' : 'Active') . "\n";
} else {
    echo "Product ID 1 not found\n";
}

// 检查所有产品和用户关联
echo "\n\nAll products and their users:\n";
$stmt = $db->query("SELECT p.id, p.name, up.user_id, u.username FROM products p LEFT JOIN user_products up ON p.id = up.product_id LEFT JOIN users u ON up.user_id = u.id WHERE p.deleted_at IS NULL ORDER BY p.id");
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($products as $product) {
    echo "Product ID {$product['id']}: {$product['name']} - User: {$product['username']} (ID: {$product['user_id']})\n";
}

echo "\nDone.\n";
?>