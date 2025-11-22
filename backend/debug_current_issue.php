<?php
require_once 'vendor/autoload.php';

// 直接连接数据库
$db = new PDO('sqlite:database/product_duck.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== 调试当前问题 ===\n\n";

// 1. 检查testauth用户
echo "1. 检查testauth用户:\n";
$stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute(['testauth']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user) {
    echo "用户存在: ID={$user['id']}, username={$user['username']}\n";
} else {
    echo "用户不存在!\n";
    exit(1);
}

// 2. 检查用户的产品
echo "\n2. 检查用户的产品:\n";
$stmt = $db->prepare("SELECT * FROM products WHERE user_id = ?");
$stmt->execute([$user['id']]);
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "找到 " . count($products) . " 个产品:\n";
foreach ($products as $product) {
    echo "- ID: {$product['id']}, Name: {$product['name']}\n";
}

if (empty($products)) {
    echo "没有找到产品!\n";
    exit(1);
}

$firstProduct = $products[0];
echo "\n使用第一个产品: ID={$firstProduct['id']}, Name={$firstProduct['name']}\n";

// 3. 检查该产品的竞品
echo "\n3. 检查产品的竞品:\n";
$stmt = $db->prepare("SELECT * FROM competitors WHERE product_id = ? AND is_deleted = 0");
$stmt->execute([$firstProduct['id']]);
$competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "找到 " . count($competitors) . " 个竞品:\n";
foreach ($competitors as $competitor) {
    echo "- ID: {$competitor['id']}, Name: {$competitor['name']}, Status: {$competitor['status']}\n";
}

// 4. 模拟API调用
echo "\n4. 模拟API调用流程:\n";

// 模拟登录获取token
echo "模拟登录...\n";
$loginData = [
    'login' => 'testauth',
    'password' => 'testpass123'
];

echo "登录数据: " . json_encode($loginData) . "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/auth/login');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$loginResponse = curl_exec($ch);
$loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "登录响应状态码: $loginHttpCode\n";
$loginResult = json_decode($loginResponse, true);
if ($loginResult && $loginResult['success']) {
    $token = $loginResult['data']['token'];
    echo "登录成功，获得token\n";
    
    // 获取产品列表
    echo "\n获取产品列表...\n";
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
    
    echo "产品API响应状态码: $productsHttpCode\n";
    $productsResult = json_decode($productsResponse, true);
    if ($productsResult && $productsResult['success']) {
        $apiProducts = $productsResult['data']['products'];
        echo "API返回 " . count($apiProducts) . " 个产品\n";
        
        if (!empty($apiProducts)) {
            $testProductId = $apiProducts[0]['id'];
            echo "使用产品ID: $testProductId\n";
            
            // 获取竞品列表
            echo "\n获取竞品列表...\n";
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/products/$testProductId/competitors");
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $competitorsResponse = curl_exec($ch);
            $competitorsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            echo "竞品API响应状态码: $competitorsHttpCode\n";
            echo "竞品API响应内容:\n";
            echo $competitorsResponse . "\n";
            
            $competitorsResult = json_decode($competitorsResponse, true);
            if ($competitorsResult) {
                echo "\n解析后的竞品数据:\n";
                print_r($competitorsResult);
            }
        }
    } else {
        echo "产品API调用失败\n";
        echo $productsResponse . "\n";
    }
} else {
    echo "登录失败\n";
    echo $loginResponse . "\n";
}

echo "\n=== 调试完成 ===\n";
?>