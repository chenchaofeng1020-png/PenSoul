<?php

// 测试产品管理API
echo "=== 产品管理API测试 ===\n";

// 读取保存的token
$token = '';
if (file_exists('test_token.txt')) {
    $token = trim(file_get_contents('test_token.txt'));
    echo "使用保存的Token进行认证\n";
} else {
    echo "未找到Token文件，请先运行登录测试\n";
    exit(1);
}

// 测试创建产品
echo "\n--- 测试创建产品 ---\n";
$createUrl = 'http://localhost:8000/api/products';
$productData = [
    'name' => '测试产品 ' . time(),
    'description' => '用于测试产品管理功能的示例产品',
    'website_url' => 'https://test-product.com',
    'logo_url' => 'https://test-product.com/logo.png'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($productData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP状态码: $httpCode\n";
echo "响应内容: $response\n";

$responseData = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "JSON解析成功\n";
    if ($responseData['success'] && isset($responseData['data']['id'])) {
        $productId = $responseData['data']['id'];
        echo "产品创建成功，ID: $productId\n";
        
        // 测试获取产品列表
        echo "\n--- 测试获取产品列表 ---\n";
        $listUrl = 'http://localhost:8000/api/products';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $listUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token
        ]);
        
        $listResponse = curl_exec($ch);
        $listHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "HTTP状态码: $listHttpCode\n";
        echo "响应内容: $listResponse\n";
        
        // 测试获取单个产品详情
        echo "\n--- 测试获取产品详情 ---\n";
        $detailUrl = "http://localhost:8000/api/products/$productId";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $detailUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token
        ]);
        
        $detailResponse = curl_exec($ch);
        $detailHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "HTTP状态码: $detailHttpCode\n";
        echo "响应内容: $detailResponse\n";
    }
} else {
    echo "JSON解析失败: " . json_last_error_msg() . "\n";
}

echo "\n=== 产品管理API测试完成 ===\n";