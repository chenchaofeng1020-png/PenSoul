<?php

// 测试获取竞品列表API

$baseUrl = 'http://localhost:8000';

// 1. 登录获取token
echo "=== 登录获取token ===\n";
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
    echo "登录成功\n";
} else {
    echo "登录失败\n";
    exit(1);
}

curl_close($ch);

// 2. 获取产品列表
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

if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 200) {
    $productId = $productsData['data']['products'][0]['id'];
    echo "产品ID: {$productId}\n";
} else {
    echo "获取产品失败\n";
    exit(1);
}

curl_close($ch);

// 3. 获取竞品列表
echo "\n=== 获取竞品列表 ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/products/' . $productId . '/competitors');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$competitorsResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP状态码: {$httpCode}\n";
echo "完整响应: {$competitorsResponse}\n";

$competitorsData = json_decode($competitorsResponse, true);

if ($httpCode == 200) {
    echo "\n解析后的数据结构:\n";
    print_r($competitorsData);
    
    if (isset($competitorsData['data']['competitors'])) {
        echo "\n竞品数量: " . count($competitorsData['data']['competitors']) . "\n";
        foreach ($competitorsData['data']['competitors'] as $competitor) {
            echo "- {$competitor['name']}\n";
        }
    } else {
        echo "\n没有找到competitors字段\n";
    }
} else {
    echo "获取竞品列表失败\n";
}

curl_close($ch);

echo "\n=== 测试完成 ===\n";