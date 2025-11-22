<?php
require_once 'vendor/autoload.php';

// 测试添加竞品功能的调试脚本
function makeRequest($url, $method = 'GET', $data = null, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'status' => $httpCode,
        'body' => $response
    ];
}

echo "=== 添加竞品功能调试测试 ===\n\n";

// 1. 注册用户
echo "1. 注册用户...\n";
$registerData = [
    'username' => 'testuser_' . time(),
    'email' => 'test_' . time() . '@example.com',
    'password' => 'password123'
];

$response = makeRequest('http://localhost:8000/api/auth/register', 'POST', $registerData, [
    'Content-Type: application/json'
]);

echo "注册响应状态: {$response['status']}\n";
echo "注册响应内容: {$response['body']}\n\n";

if ($response['status'] !== 201) {
    echo "注册失败，停止测试\n";
    exit(1);
}

// 2. 登录
echo "2. 用户登录...\n";
$loginData = [
    'login' => $registerData['username'],
    'password' => $registerData['password']
];

$response = makeRequest('http://localhost:8000/api/auth/login', 'POST', $loginData, [
    'Content-Type: application/json'
]);

echo "登录响应状态: {$response['status']}\n";
echo "登录响应内容: {$response['body']}\n\n";

if ($response['status'] !== 200) {
    echo "登录失败，停止测试\n";
    exit(1);
}

$loginResult = json_decode($response['body'], true);
$token = $loginResult['data']['token'] ?? null;

if (!$token) {
    echo "未获取到token，停止测试\n";
    exit(1);
}

echo "获取到token: " . substr($token, 0, 20) . "...\n\n";

// 3. 获取产品列表
echo "3. 获取产品列表...\n";
$response = makeRequest('http://localhost:8000/api/products', 'GET', null, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

echo "产品列表响应状态: {$response['status']}\n";
echo "产品列表响应内容: {$response['body']}\n\n";

if ($response['status'] !== 200) {
    echo "获取产品列表失败，停止测试\n";
    exit(1);
}

$productsResult = json_decode($response['body'], true);
$productsData = $productsResult['data'] ?? [];
$products = $productsData['products'] ?? [];

if (empty($products)) {
    echo "没有找到产品，停止测试\n";
    exit(1);
}

$productId = $products[0]['id'];
echo "使用产品ID: {$productId}\n\n";

// 4. 添加竞品
echo "4. 添加竞品...\n";
$competitorData = [
    'product_id' => $productId,
    'name' => '测试竞品_' . time(),
    'description' => '这是一个测试竞品',
    'website' => 'https://example.com',
    'logo' => 'https://example.com/logo.png',
    'category' => '测试分类',
    'target_audience' => '测试用户群体',
    'key_features' => '测试功能1,测试功能2',
    'pricing_model' => 'freemium',
    'market_position' => 'competitor',
    'strengths' => '测试优势',
    'weaknesses' => '测试劣势',
    'market_share' => '5%',
    'funding_status' => 'Series A',
    'employee_count' => '50-100',
    'founded_year' => 2020,
    'headquarters' => '北京',
    'tags' => 'tag1,tag2'
];

$response = makeRequest("http://localhost:8000/api/products/{$productId}/competitors", 'POST', $competitorData, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

echo "添加竞品响应状态: {$response['status']}\n";
echo "添加竞品响应内容: {$response['body']}\n\n";

if ($response['status'] === 201) {
    echo "✅ 添加竞品成功！\n";
} else {
    echo "❌ 添加竞品失败！\n";
    
    // 解析错误信息
    $errorResult = json_decode($response['body'], true);
    if ($errorResult) {
        echo "错误详情: " . ($errorResult['message'] ?? '未知错误') . "\n";
        if (isset($errorResult['errors'])) {
            echo "验证错误: " . json_encode($errorResult['errors'], JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}

echo "\n=== 测试完成 ===\n";
?>