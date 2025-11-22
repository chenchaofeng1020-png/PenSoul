<?php

// 测试竞品管理API
echo "=== 竞品管理API测试 ===\n";

// 读取保存的token
$token = '';
if (file_exists('test_token.txt')) {
    $token = trim(file_get_contents('test_token.txt'));
    echo "使用保存的Token进行认证\n";
} else {
    echo "未找到Token文件，请先运行登录测试\n";
    exit(1);
}

// 使用产品ID 1（刚才创建的产品）
$productId = 1;

// 测试创建竞品
echo "\n--- 测试创建竞品 ---\n";
$createUrl = "http://localhost:8000/api/products/$productId/competitors";
$competitorData = [
    'name' => '竞品测试 ' . time(),
    'slogan' => '这是一个测试竞品',
    'description' => '用于测试竞品管理功能的示例竞品',
    'website_url' => 'https://competitor.com',
    'documentation_url' => 'https://docs.competitor.com',
    'logo_url' => 'https://competitor.com/logo.png',
    'main_customers' => '大型企业,中小企业'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($competitorData));
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
        $competitorId = $responseData['data']['id'];
        echo "竞品创建成功，ID: $competitorId\n";
        
        // 测试获取竞品列表
        echo "\n--- 测试获取竞品列表 ---\n";
        $listUrl = "http://localhost:8000/api/products/$productId/competitors";
        
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
        
        // 测试获取单个竞品详情
        echo "\n--- 测试获取竞品详情 ---\n";
        $detailUrl = "http://localhost:8000/api/products/$productId/competitors/$competitorId";
        
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
        
        // 测试更新竞品
        echo "\n--- 测试更新竞品 ---\n";
        $updateUrl = "http://localhost:8000/api/products/$productId/competitors/$competitorId";
        $updateData = [
            'name' => '更新后的竞品名称',
            'slogan' => '更新后的竞品标语',
            'description' => '更新后的竞品描述',
            'website_url' => 'https://updated-competitor.com',
            'main_customers' => '更新后的客户群体'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $updateUrl);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updateData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $token
        ]);
        
        $updateResponse = curl_exec($ch);
        $updateHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "HTTP状态码: $updateHttpCode\n";
        echo "响应内容: $updateResponse\n";
    }
} else {
    echo "JSON解析失败: " . json_last_error_msg() . "\n";
}

echo "\n=== 竞品管理API测试完成 ===\n";