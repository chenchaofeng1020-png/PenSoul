<?php

require_once __DIR__ . '/vendor/autoload.php';

// 加载环境变量
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

use App\Models\User;

// 测试用户查找和密码验证
$user = new User();
$userInfo = $user->findByUsername('chenoo');

if ($userInfo) {
    echo "用户找到: " . $userInfo->username . "\n";
    echo "邮箱: " . $userInfo->email . "\n";
    echo "状态: " . $userInfo->status . "\n";
    echo "密码哈希: " . $userInfo->password_hash . "\n";
    
    // 测试不同的密码
    $passwords = ['chenoo', '123456', 'password'];
    
    foreach ($passwords as $password) {
        $result = $userInfo->verifyPassword($password);
        echo "密码 '{$password}' 验证结果: " . ($result ? '成功' : '失败') . "\n";
    }
} else {
    echo "用户未找到\n";
}