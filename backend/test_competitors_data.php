<?php

// 数据库连接
try {
    $pdo = new PDO(
        "sqlite:" . __DIR__ . "/database/product_duck.sqlite",
        null,
        null,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "数据库连接成功\n";
} catch (PDOException $e) {
    die("数据库连接失败: " . $e->getMessage());
}

// 检查产品表
echo "\n=== 检查产品表 ===\n";
$stmt = $pdo->query("SELECT * FROM products ORDER BY id");
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "产品总数: " . count($products) . "\n";
foreach ($products as $product) {
    echo "产品ID: {$product['id']}, 名称: {$product['name']}, 用户ID: {$product['user_id']}\n";
}

// 检查竞品表
echo "\n=== 检查竞品表 ===\n";
$stmt = $pdo->query("SELECT * FROM competitors ORDER BY id");
$competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "竞品总数: " . count($competitors) . "\n";
foreach ($competitors as $competitor) {
    echo "竞品ID: {$competitor['id']}, 名称: {$competitor['name']}, 产品ID: {$competitor['product_id']}\n";
}

// 检查用户表
echo "\n=== 检查用户表 ===\n";
$stmt = $pdo->query("SELECT id, username, email FROM users ORDER BY id");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "用户总数: " . count($users) . "\n";
foreach ($users as $user) {
    echo "用户ID: {$user['id']}, 用户名: {$user['username']}, 邮箱: {$user['email']}\n";
}

// 测试API调用 - 使用testauth用户
echo "\n=== 测试API调用 ===\n";

// 1. 登录获取token
$loginData = [
    'login' => 'testauth',
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/auth/login');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$loginResponse = curl_exec($ch);
$loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "登录状态码: $loginHttpCode\n";
echo "登录响应: $loginResponse\n";

if ($loginHttpCode === 200) {
    $loginData = json_decode($loginResponse, true);
    if (isset($loginData['data']['token'])) {
        $token = $loginData['data']['token'];
        echo "获取到token: " . substr($token, 0, 20) . "...\n";
        
        // 2. 获取产品列表
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/products');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $productsResponse = curl_exec($ch);
        $productsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "\n产品列表状态码: $productsHttpCode\n";
        echo "产品列表响应: $productsResponse\n";
        
        if ($productsHttpCode === 200) {
            $productsData = json_decode($productsResponse, true);
            if (isset($productsData['data']['products']) && count($productsData['data']['products']) > 0) {
                $firstProduct = $productsData['data']['products'][0];
                $productId = $firstProduct['id'];
                echo "\n使用产品ID: $productId 获取竞品列表\n";
                
                // 3. 获取竞品列表
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/products/$productId/competitors");
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/json'
                ]);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                
                $competitorsResponse = curl_exec($ch);
                $competitorsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                echo "竞品列表状态码: $competitorsHttpCode\n";
                echo "竞品列表响应: $competitorsResponse\n";
            } else {
                echo "用户没有产品\n";
            }
        }
    }
}

echo "\n测试完成\n";
?>