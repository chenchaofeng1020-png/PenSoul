<?php
require_once 'vendor/autoload.php';

use App\Config\Database;
use App\Models\User;
use App\Utils\JWT;
use App\Models\Product;
use App\Models\Competitor;

echo "Testing login and competitors...\n";

// 1. 验证用户登录
$database = new Database();
$db = $database->getConnection();
$userModel = new User();
$userModel->db = $db;

$email = '578688700@qq.com';
$password = '123456abc';

echo "\n1. Testing user login:\n";
echo "Email: $email\n";

$user = $userModel->findByEmail($email);
if (!$user) {
    echo "❌ User not found\n";
    exit(1);
}

if (!password_verify($password, $user->password_hash)) {
    echo "❌ Password verification failed\n";
    exit(1);
}

echo "✅ User login successful\n";
echo "User ID: {$user->id}\n";
echo "Username: {$user->username}\n";

// 2. 生成JWT token
$token = JWT::generate([
    'id' => $user->id,
    'email' => $user->email
]);

echo "\n2. JWT Token generated:\n";
echo "Token: " . substr($token, 0, 50) . "...\n";

// 3. 验证token
try {
    $decoded = JWT::verify($token);
    if ($decoded && $decoded['id'] == $user->id) {
        echo "✅ Token verification successful\n";
    } else {
        echo "❌ Token verification failed\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "❌ Token verification failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 4. 检查用户的产品
echo "\n3. Checking user's products:\n";
$productModel = new Product();
$products = $productModel->getUserProducts($user->id, 1, 100);

if (empty($products['products'])) {
    echo "❌ No products found for user\n";
} else {
    echo "✅ Found " . count($products['products']) . " products:\n";
    foreach ($products['products'] as $product) {
        echo "  - Product ID: {$product['id']}, Name: {$product['name']}\n";
    }
}

// 5. 检查竞品数据
echo "\n4. Checking competitors for each product:\n";
$competitorModel = new Competitor();

foreach ($products['products'] as $product) {
    $competitors = $competitorModel->getProductCompetitors($product['id'], 1, 100);
    echo "Product '{$product['name']}' (ID: {$product['id']}):\n";
    
    if (empty($competitors['competitors'])) {
        echo "  ❌ No competitors found\n";
    } else {
        echo "  ✅ Found " . count($competitors['competitors']) . " competitors:\n";
        foreach ($competitors['competitors'] as $competitor) {
            echo "    - {$competitor['name']} (ID: {$competitor['id']})\n";
        }
    }
}

echo "\nTest completed.\n";
?>