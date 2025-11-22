<?php

// 测试PHP环境和类加载
echo "=== PHP环境测试 ===\n";
echo "PHP版本: " . PHP_VERSION . "\n";
echo "当前目录: " . __DIR__ . "\n";
echo "内存限制: " . ini_get('memory_limit') . "\n";

// 测试自动加载
echo "\n=== 自动加载测试 ===\n";
require_once __DIR__ . '/vendor/autoload.php';

// 测试基础类
try {
    echo "测试JWT类: ";
    if (class_exists('JWT')) {
        echo "✓ 存在\n";
    } else {
        echo "✗ 不存在\n";
    }
    
    echo "测试Validator类: ";
    if (class_exists('Validator')) {
        echo "✓ 存在\n";
    } else {
        echo "✗ 不存在\n";
    }
    
    echo "测试Database类: ";
    if (class_exists('Database')) {
        echo "✓ 存在\n";
    } else {
        echo "✗ 不存在\n";
    }
    
    echo "测试App\\Utils\\Response类: ";
    if (class_exists('App\\Utils\\Response')) {
        echo "✓ 存在\n";
    } else {
        echo "✗ 不存在\n";
    }
    
    echo "测试App\\Core\\Router类: ";
    if (class_exists('App\\Core\\Router')) {
        echo "✓ 存在\n";
    } else {
        echo "✗ 不存在\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
}

// 测试简单的JSON响应
echo "\n=== JSON响应测试 ===\n";
try {
    $data = [
        'status' => 'success',
        'message' => 'PHP环境正常',
        'timestamp' => time()
    ];
    echo "JSON输出: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
} catch (Exception $e) {
    echo "JSON错误: " . $e->getMessage() . "\n";
}

echo "\n=== 测试完成 ===\n";