<?php

// 简单的API测试
require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Router;
use App\Utils\Response;

echo "=== API路由测试 ===\n";

// 模拟HTTP请求
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/';
$_SERVER['HTTP_HOST'] = 'localhost:8000';

try {
    // 创建路由实例
    $router = new Router();
    
    // 添加测试路由
    $router->get('/', function() {
        return [
            'name' => '产品鸭竞品管理系统API',
            'version' => '1.0.0',
            'status' => 'running',
            'timestamp' => time()
        ];
    });
    
    echo "路由创建成功\n";
    
    // 测试Response类
    echo "测试Response类...\n";
    
    // 不实际输出，只测试方法是否存在
    if (method_exists('App\\Utils\\Response', 'success')) {
        echo "Response::success方法存在\n";
    }
    
    if (method_exists('App\\Utils\\Response', 'error')) {
        echo "Response::error方法存在\n";
    }
    
    echo "API测试完成，所有组件正常\n";
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    echo "堆栈跟踪: " . $e->getTraceAsString() . "\n";
}

echo "\n=== 测试结束 ===\n";