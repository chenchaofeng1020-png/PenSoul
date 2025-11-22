<?php

// 测试修复后的添加竞品功能

$baseUrl = 'http://localhost:8000';

// 1. 注册新用户
echo "=== 注册新用户 ===\n";
$registerData = [
    'username' => 'testuser_competitor_fix',
    'email' => 'testcompetitorfix@example.com',
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/auth/register');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($registerData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$registerResponse = curl_exec($ch);
$registerData = json_decode($registerResponse, true);

if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 201) {
    echo "注册成功\n";
} else {
    echo "注册失败: " . ($registerData['message'] ?? 'Unknown error') . "\n";
}

curl_close($ch);

// 2. 登录用户
echo "\n=== 登录用户 ===\n";
$loginData = [
    'login' => 'testuser_competitor_fix',
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/auth/login');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$loginResponse = curl_exec($ch);
$loginResult = json_decode($loginResponse, true);

if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 200 && isset($loginResult['data']['token'])) {
    $token = $loginResult['data']['token'];
    echo "登录成功，获取到token\n";
} else {
    echo "登录失败: " . ($loginResult['message'] ?? 'Unknown error') . "\n";
    exit(1);
}

curl_close($ch);

// 3. 获取用户产品列表
echo "\n=== 获取产品列表 ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/products');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$productsResponse = curl_exec($ch);
$productsData = json_decode($productsResponse, true);

if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 200 && isset($productsData['data']['products'])) {
    $products = $productsData['data']['products'];
    echo "获取到 " . count($products) . " 个产品\n";
    
    if (count($products) > 0) {
        $productId = $products[0]['id'];
        $productName = $products[0]['name'];
        echo "使用产品: {$productName} (ID: {$productId})\n";
    } else {
        echo "没有找到产品\n";
        exit(1);
    }
} else {
    echo "获取产品列表失败: " . ($productsData['message'] ?? 'Unknown error') . "\n";
    exit(1);
}

curl_close($ch);

// 4. 添加竞品
echo "\n=== 添加竞品 ===\n";
$competitorData = [
    'name' => '测试竞品',
    'slogan' => '这是一个测试竞品',
    'description' => '用于测试添加竞品功能的测试数据',
    'website_url' => 'https://test-competitor.com',
    'documentation_url' => 'https://test-competitor.com/docs',
    'logo_url' => 'https://test-competitor.com/logo.png',
    'main_customers' => '客户A,客户B,客户C'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/products/' . $productId . '/competitors');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($competitorData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$addResponse = curl_exec($ch);
$addResult = json_decode($addResponse, true);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP状态码: {$httpCode}\n";
echo "响应内容: " . $addResponse . "\n";

if ($httpCode == 201 && isset($addResult['success']) && $addResult['success']) {
    echo "竞品添加成功！\n";
    echo "竞品ID: " . $addResult['data']['id'] . "\n";
    echo "竞品名称: " . $addResult['data']['name'] . "\n";
} else {
    echo "竞品添加失败: " . ($addResult['message'] ?? 'Unknown error') . "\n";
    if (isset($addResult['errors'])) {
        echo "详细错误: " . json_encode($addResult['errors']) . "\n";
    }
}

curl_close($ch);

// 5. 获取竞品列表验证
echo "\n=== 验证竞品列表 ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/products/' . $productId . '/competitors');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$listResponse = curl_exec($ch);
$listData = json_decode($listResponse, true);

if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 200 && isset($listData['data']['competitors'])) {
    $competitors = $listData['data']['competitors'];
    echo "竞品列表中共有 " . count($competitors) . " 个竞品\n";
    
    foreach ($competitors as $competitor) {
        if ($competitor['name'] === '测试竞品') {
            echo "✓ 找到新添加的竞品: {$competitor['name']}\n";
            echo "  口号: {$competitor['slogan']}\n";
            echo "  描述: {$competitor['description']}\n";
            break;
        }
    }
} else {
    echo "获取竞品列表失败\n";
}

curl_close($ch);

echo "\n=== 测试完成 ===\n";