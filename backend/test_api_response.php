<?php

// 测试API响应
echo "=== API响应测试 ===\n";

// 测试本地API端点
$endpoints = [
    'http://localhost:8000/',
    'http://localhost:8000/health'
];

foreach ($endpoints as $url) {
    echo "\n测试端点: $url\n";
    
    // 使用cURL获取响应
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
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
        continue;
    }
    
    echo "HTTP状态码: $httpCode\n";
    echo "响应内容: $response\n";
    
    // 尝试解析JSON
    $data = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        echo "JSON解析成功\n";
        echo "格式化JSON:\n";
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "JSON解析失败: " . json_last_error_msg() . "\n";
    }
}

echo "\n=== 测试完成 ===\n";