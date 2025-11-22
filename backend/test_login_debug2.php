<?php
require_once 'vendor/autoload.php';

// 加载环境变量
if (file_exists('.env')) {
    $lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

use App\Controllers\AuthController;
use App\Utils\JWT;

echo "=== 测试登录API ===\n";

// 模拟POST请求数据
$_POST = [];
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';

// 模拟请求体
$requestBody = json_encode([
    'login' => 'chenoo',
    'password' => '123456'
]);

// 将请求体写入临时文件，模拟php://input
$tempFile = tempnam(sys_get_temp_dir(), 'test_input');
file_put_contents($tempFile, $requestBody);

// 重定向php://input到临时文件
ini_set('auto_prepend_file', '');

try {
    // 直接调用登录逻辑
    $authController = new AuthController();
    
    // 捕获输出
    ob_start();
    
    // 模拟file_get_contents('php://input')
    $originalInput = file_get_contents($tempFile);
    echo "请求数据: $originalInput\n";
    
    // 手动处理登录逻辑
    $input = json_decode($originalInput, true);
    echo "解析后的输入: " . print_r($input, true) . "\n";
    
    // 测试JWT初始化
    JWT::init();
    echo "JWT初始化完成\n";
    
    // 调用登录方法
    $authController->login();
    
    $output = ob_get_clean();
    echo "登录响应: $output\n";
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    echo "堆栈跟踪: " . $e->getTraceAsString() . "\n";
} finally {
    // 清理临时文件
    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
}

echo "\n=== 测试完成 ===\n";
?>