<?php

// 测试文件上传API
echo "=== 文件上传API测试 ===\n";

// 读取保存的token
$token = '';
if (file_exists('test_token.txt')) {
    $token = trim(file_get_contents('test_token.txt'));
    echo "使用保存的Token进行认证\n";
} else {
    echo "未找到Token文件，请先运行登录测试\n";
    exit(1);
}

// 测试获取上传配置
echo "\n--- 测试获取上传配置 ---\n";
$configUrl = "http://localhost:8000/api/upload/config";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $configUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP状态码: $httpCode\n";
echo "响应内容: $response\n";

// 创建一个测试图片文件（简单的SVG）
$testImageContent = '<?xml version="1.0" encoding="UTF-8"?>\n<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">\n  <rect width="100" height="100" fill="#ff0000"/>\n  <text x="50" y="50" text-anchor="middle" dy=".3em" fill="white">LOGO</text>\n</svg>';
$testImagePath = '/tmp/test_logo.svg';
file_put_contents($testImagePath, $testImageContent);

// 测试Logo上传
echo "\n--- 测试Logo上传 ---\n";
$uploadUrl = "http://localhost:8000/api/upload/logo";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $uploadUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'logo' => new CURLFile($testImagePath, 'image/svg+xml', 'test_logo.svg')
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP状态码: $httpCode\n";
echo "响应内容: $response\n";

// 解析响应获取文件URL
$responseData = json_decode($response, true);
if ($responseData && isset($responseData['data']['url'])) {
    $fileUrl = $responseData['data']['url'];
    echo "上传成功，文件URL: $fileUrl\n";
    
    // 测试删除文件
    echo "\n--- 测试删除文件 ---\n";
    $deleteUrl = "http://localhost:8000/api/upload/file";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $deleteUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['url' => $fileUrl]));
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
}

// 清理测试文件
unlink($testImagePath);

echo "\n=== 文件上传API测试完成 ===\n";