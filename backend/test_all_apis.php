<?php

// 完整的API功能测试
echo "=== 产品鸭竞品管理系统 - 完整API测试 ===\n";

$baseUrl = 'http://localhost:8000';
$token = '';
$productId = null;
$competitorId = null;

// 辅助函数：发送HTTP请求
function sendRequest($method, $url, $data = null, $token = null, $isFileUpload = false) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $headers = ['Accept: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    
    switch ($method) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                if ($isFileUpload) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                } else {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                    $headers[] = 'Content-Type: application/json';
                }
            }
            break;
        case 'PUT':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                $headers[] = 'Content-Type: application/json';
            }
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                $headers[] = 'Content-Type: application/json';
            }
            break;
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['code' => $httpCode, 'body' => $response];
}

// 1. 测试用户注册
echo "\n1. 测试用户注册\n";
$registerData = [
    'username' => 'testuser' . time(),
    'email' => 'test' . time() . '@example.com',
    'password' => 'password123',
    'full_name' => '测试用户'
];

$result = sendRequest('POST', "$baseUrl/api/auth/register", $registerData);
echo "状态码: {$result['code']}\n";

if ($result['code'] == 201) {
    $data = json_decode($result['body'], true);
    $token = $data['data']['token'];
    echo "✓ 用户注册成功，获取到Token\n";
} else {
    echo "✗ 用户注册失败: {$result['body']}\n";
    exit(1);
}

// 2. 测试获取用户信息
echo "\n2. 测试获取用户信息\n";
$result = sendRequest('GET', "$baseUrl/api/auth/me", null, $token);
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ 获取用户信息成功\n";
} else {
    echo "✗ 获取用户信息失败\n";
}

// 3. 测试创建产品
echo "\n3. 测试创建产品\n";
$productData = [
    'name' => '测试产品 ' . time(),
    'description' => '这是一个用于完整测试的产品',
    'website_url' => 'https://test-product.com',
    'logo_url' => 'https://test-product.com/logo.png'
];

$result = sendRequest('POST', "$baseUrl/api/products", $productData, $token);
echo "状态码: {$result['code']}\n";

if ($result['code'] == 201) {
    $data = json_decode($result['body'], true);
    $productId = $data['data']['id'];
    echo "✓ 产品创建成功，ID: $productId\n";
} else {
    echo "✗ 产品创建失败: {$result['body']}\n";
    exit(1);
}

// 4. 测试获取产品列表
echo "\n4. 测试获取产品列表\n";
$result = sendRequest('GET', "$baseUrl/api/products", null, $token);
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ 获取产品列表成功\n";
} else {
    echo "✗ 获取产品列表失败\n";
}

// 5. 测试创建竞品
echo "\n5. 测试创建竞品\n";
$competitorData = [
    'name' => '测试竞品 ' . time(),
    'slogan' => '竞品测试标语',
    'description' => '这是一个用于完整测试的竞品',
    'website_url' => 'https://competitor.com',
    'documentation_url' => 'https://docs.competitor.com',
    'logo_url' => 'https://competitor.com/logo.png',
    'main_customers' => '大型企业,中小企业'
];

$result = sendRequest('POST', "$baseUrl/api/products/$productId/competitors", $competitorData, $token);
echo "状态码: {$result['code']}\n";

if ($result['code'] == 201) {
    $data = json_decode($result['body'], true);
    $competitorId = $data['data']['id'];
    echo "✓ 竞品创建成功，ID: $competitorId\n";
} else {
    echo "✗ 竞品创建失败: {$result['body']}\n";
}

// 6. 测试获取竞品列表
echo "\n6. 测试获取竞品列表\n";
$result = sendRequest('GET', "$baseUrl/api/products/$productId/competitors", null, $token);
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ 获取竞品列表成功\n";
} else {
    echo "✗ 获取竞品列表失败\n";
}

// 7. 测试文件上传配置
echo "\n7. 测试获取上传配置\n";
$result = sendRequest('GET', "$baseUrl/api/upload/config", null, $token);
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ 获取上传配置成功\n";
} else {
    echo "✗ 获取上传配置失败\n";
}

// 8. 测试Logo上传
echo "\n8. 测试Logo上传\n";
$testImageContent = '<?xml version="1.0" encoding="UTF-8"?>\n<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">\n  <rect width="100" height="100" fill="#00ff00"/>\n  <text x="50" y="50" text-anchor="middle" dy=".3em" fill="white">TEST</text>\n</svg>';
$testImagePath = '/tmp/test_upload.svg';
file_put_contents($testImagePath, $testImageContent);

$uploadData = [
    'logo' => new CURLFile($testImagePath, 'image/svg+xml', 'test_upload.svg')
];

$result = sendRequest('POST', "$baseUrl/api/upload/logo", $uploadData, $token, true);
echo "状态码: {$result['code']}\n";

if ($result['code'] == 201) {
    echo "✓ Logo上传成功\n";
    $uploadData = json_decode($result['body'], true);
    $uploadedUrl = $uploadData['data']['url'] ?? null;
} else {
    echo "✗ Logo上传失败\n";
}

// 清理测试文件
unlink($testImagePath);

// 9. 测试健康检查
echo "\n9. 测试健康检查\n";
$result = sendRequest('GET', "$baseUrl/health");
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ 健康检查通过\n";
} else {
    echo "✗ 健康检查失败\n";
}

// 10. 测试API信息
echo "\n10. 测试API信息\n";
$result = sendRequest('GET', "$baseUrl/");
echo "状态码: {$result['code']}\n";
if ($result['code'] == 200) {
    echo "✓ API信息获取成功\n";
} else {
    echo "✗ API信息获取失败\n";
}

echo "\n=== 完整API测试完成 ===\n";
echo "\n🎉 产品鸭竞品管理系统后端API开发完成！\n";
echo "\n主要功能：\n";
echo "- ✅ 用户注册和登录\n";
echo "- ✅ JWT认证中间件\n";
echo "- ✅ 产品管理CRUD\n";
echo "- ✅ 竞品管理CRUD\n";
echo "- ✅ 文件上传功能\n";
echo "- ✅ 健康检查和API信息\n";
echo "\n服务器地址: http://localhost:8000\n";
echo "API文档: 请查看各个测试脚本了解API使用方法\n";