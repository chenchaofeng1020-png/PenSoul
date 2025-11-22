<?php

// 测试用户登录API
echo "=== 用户登录API测试 ===\n";

$url = 'http://localhost:8000/api/auth/login';
$data = [
    'login' => 'testuser1755392931',
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "cURL错误: $error\n";
    exit(1);
}

echo "HTTP状态码: $httpCode\n";
echo "响应内容: $response\n";

// 尝试解析JSON
$responseData = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "JSON解析成功\n";
    echo "格式化响应:\n";
    echo json_encode($responseData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    
    // 如果登录成功，保存token用于后续测试
    if ($responseData['success'] && isset($responseData['data']['token'])) {
        file_put_contents('test_token.txt', $responseData['data']['token']);
        echo "Token已保存到test_token.txt文件\n";
    }
} else {
    echo "JSON解析失败: " . json_last_error_msg() . "\n";
    echo "原始响应: $response\n";
}

echo "\n=== 测试完成 ===\n";