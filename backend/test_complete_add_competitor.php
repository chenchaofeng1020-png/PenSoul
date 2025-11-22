<?php
require_once 'vendor/autoload.php';

// 完整的添加竞品功能测试
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

echo "=== 完整添加竞品功能测试 ===\n\n";

// 1. 注册用户
echo "1. 注册新用户...\n";
$registerData = [
    'username' => 'testuser_' . time(),
    'email' => 'test_' . time() . '@example.com',
    'password' => 'password123'
];

$response = makeRequest('http://localhost:8000/api/auth/register', 'POST', $registerData, [
    'Content-Type: application/json'
]);

if ($response['status'] !== 201) {
    echo "❌ 注册失败: {$response['body']}\n";
    exit(1);
}

echo "✅ 注册成功\n\n";

// 2. 登录
echo "2. 用户登录...\n";
$loginData = [
    'login' => $registerData['username'],
    'password' => $registerData['password']
];

$response = makeRequest('http://localhost:8000/api/auth/login', 'POST', $loginData, [
    'Content-Type: application/json'
]);

if ($response['status'] !== 200) {
    echo "❌ 登录失败: {$response['body']}\n";
    exit(1);
}

$loginResult = json_decode($response['body'], true);
$token = $loginResult['data']['token'] ?? null;
$username = $loginResult['data']['user']['username'] ?? null;

if (!$token) {
    echo "❌ 未获取到token\n";
    exit(1);
}

echo "✅ 登录成功，用户: {$username}\n\n";

// 3. 获取产品列表
echo "3. 获取产品列表...\n";
$response = makeRequest('http://localhost:8000/api/products', 'GET', null, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

if ($response['status'] !== 200) {
    echo "❌ 获取产品列表失败: {$response['body']}\n";
    exit(1);
}

$productsResult = json_decode($response['body'], true);
$productsData = $productsResult['data'] ?? [];
$products = $productsData['products'] ?? [];

if (empty($products)) {
    echo "❌ 没有找到产品\n";
    exit(1);
}

$productId = $products[0]['id'];
echo "✅ 获取到产品，使用产品ID: {$productId}\n\n";

// 4. 测试多种竞品数据格式
$testCases = [
    [
        'name' => '最小数据竞品',
        'description' => '只包含必填字段的竞品测试',
        'expected' => true
    ],
    [
        'name' => '完整数据竞品',
        'slogan' => '测试口号',
        'description' => '包含完整字段的竞品测试',
        'website_url' => 'https://example.com',
        'documentation_url' => 'https://docs.example.com',
        'logo_url' => 'https://example.com/logo.png',
        'main_customers' => '客户A,客户B,客户C',
        'expected' => true
    ],
    [
        'name' => '',
        'description' => '缺少名称的测试',
        'expected' => false
    ]
];

foreach ($testCases as $index => $testCase) {
    $caseNum = $index + 1;
    echo "4.{$caseNum} 测试案例: {$testCase['name']}...\n";
    
    $expected = $testCase['expected'];
    unset($testCase['expected']);
    
    // 添加product_id
    $testCase['product_id'] = $productId;
    
    $response = makeRequest("http://localhost:8000/api/products/{$productId}/competitors", 'POST', $testCase, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ]);
    
    $success = $response['status'] === 201;
    
    if ($expected && $success) {
        echo "✅ 测试通过 - 成功添加竞品\n";
        $result = json_decode($response['body'], true);
        if (isset($result['data']['id'])) {
            echo "   竞品ID: {$result['data']['id']}\n";
        }
    } elseif (!$expected && !$success) {
        echo "✅ 测试通过 - 正确拒绝无效数据\n";
        $result = json_decode($response['body'], true);
        echo "   错误信息: {$result['message']}\n";
    } else {
        echo "❌ 测试失败\n";
        echo "   期望: " . ($expected ? '成功' : '失败') . "\n";
        echo "   实际: " . ($success ? '成功' : '失败') . "\n";
        echo "   响应: {$response['body']}\n";
    }
    
    echo "\n";
}

// 5. 验证竞品列表
echo "5. 验证竞品列表...\n";
$response = makeRequest("http://localhost:8000/api/products/{$productId}/competitors", 'GET', null, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

if ($response['status'] !== 200) {
    echo "❌ 获取竞品列表失败: {$response['body']}\n";
} else {
    $result = json_decode($response['body'], true);
    $competitors = $result['data']['competitors'] ?? [];
    $count = count($competitors);
    echo "✅ 成功获取竞品列表，共 {$count} 个竞品\n";
    
    foreach ($competitors as $competitor) {
        echo "   - {$competitor['name']}: {$competitor['description']}\n";
    }
}

echo "\n=== 测试完成 ===\n";
echo "\n总结: 添加竞品功能测试完成，包括:\n";
echo "- ✅ 用户注册和登录\n";
echo "- ✅ 产品列表获取\n";
echo "- ✅ 多种数据格式的竞品添加测试\n";
echo "- ✅ 竞品列表验证\n";
echo "\n如果所有测试都通过，说明添加竞品功能工作正常！\n";
?>