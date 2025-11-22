<?php

// 测试首次登录创建默认产品功能
echo "=== 测试首次登录创建默认产品 ===\n";

// 1. 先注册一个新用户
$registerUrl = 'http://localhost:8000/api/auth/register';
$username = 'testdefault_' . time();
$email = $username . '@example.com';
$registerData = [
    'username' => $username,
    'email' => $email,
    'password' => '123456'
];

echo "1. 注册新用户: $username\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $registerUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($registerData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$registerResponse = curl_exec($ch);
$registerHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "注册响应状态码: $registerHttpCode\n";
if ($registerHttpCode === 201) {
    echo "✓ 用户注册成功\n";
} else {
    echo "✗ 用户注册失败: $registerResponse\n";
    exit(1);
}

// 2. 首次登录
echo "\n2. 首次登录用户: $username\n";
$loginUrl = 'http://localhost:8000/api/auth/login';
$loginData = [
    'login' => $username,
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$loginResponse = curl_exec($ch);
$loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "登录响应状态码: $loginHttpCode\n";
if ($loginHttpCode === 200) {
    echo "✓ 用户登录成功\n";
    $loginData = json_decode($loginResponse, true);
    $token = $loginData['data']['token'];
    echo "获取到Token: " . substr($token, 0, 20) . "...\n";
} else {
    echo "✗ 用户登录失败: $loginResponse\n";
    exit(1);
}

// 3. 获取用户产品列表，检查是否有默认产品
echo "\n3. 检查用户产品列表\n";
$productsUrl = 'http://localhost:8000/api/products';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $productsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);

$productsResponse = curl_exec($ch);
$productsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "产品列表响应状态码: $productsHttpCode\n";
if ($productsHttpCode === 200) {
    $productsData = json_decode($productsResponse, true);
    echo "产品列表响应: " . json_encode($productsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    
    if (isset($productsData['data']['products']) && is_array($productsData['data']['products'])) {
        $products = $productsData['data']['products'];
        $hasDefaultProduct = false;
        
        foreach ($products as $product) {
            if ($product['name'] === '产品鸭') {
                $hasDefaultProduct = true;
                echo "✓ 找到默认产品: {$product['name']}\n";
                echo "  产品描述: {$product['description']}\n";
                break;
            }
        }
        
        if (!$hasDefaultProduct) {
            echo "✗ 未找到默认产品 '产品鸭'\n";
        }
    } else {
        echo "✗ 产品列表格式异常\n";
    }
} else {
    echo "✗ 获取产品列表失败: $productsResponse\n";
}

echo "\n=== 测试完成 ===\n";