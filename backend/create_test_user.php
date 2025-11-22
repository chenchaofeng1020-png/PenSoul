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

use App\Models\User;

echo "=== 创建测试用户 ===\n";

try {
    $user = new User();
    
    // 设置用户信息
    $user->username = 'testauth';
    $user->email = 'testauth@example.com';
    $user->password_hash = User::hashPassword('123456');
    $user->status = 'active';
    
    // 创建用户
    if ($user->create()) {
        echo "✅ 测试用户创建成功\n";
        echo "用户名: testauth\n";
        echo "邮箱: testauth@example.com\n";
        echo "密码: 123456\n";
        echo "用户ID: {$user->id}\n";
    } else {
        echo "❌ 用户创建失败\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
}

echo "\n=== 创建完成 ===\n";
?>