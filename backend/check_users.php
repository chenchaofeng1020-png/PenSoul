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
use App\Config\Database;
use PDO;

echo "=== 检查用户信息 ===\n";

try {
    // 直接查询数据库
    $database = new Database();
    $conn = $database->getConnection();
    
    $query = "SELECT * FROM users";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "没有找到任何用户\n";
    } else {
        echo "找到 " . count($users) . " 个用户:\n";
        foreach ($users as $u) {
            echo "ID: {$u['id']}, Username: {$u['username']}, Email: {$u['email']}, Status: {$u['status']}\n";
        }
    }
    
    // 尝试验证密码
    echo "\n=== 测试密码验证 ===\n";
    $query = "SELECT * FROM users WHERE username = :username OR email = :email LIMIT 1";
    $stmt = $conn->prepare($query);
    $testUsername = 'chenoo';
    $testEmail = 'chenoo';
    $stmt->bindParam(':username', $testUsername);
    $stmt->bindParam(':email', $testEmail);
    $stmt->execute();
    $testUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($testUser) {
        echo "找到用户: {$testUser['username']}\n";
        
        // 创建User实例来验证密码
        $user = new User();
        $user->password_hash = $testUser['password_hash'];
        
        // 测试几个常见密码
        $testPasswords = ['123456', 'password', 'chenoo', 'admin'];
        foreach ($testPasswords as $pwd) {
            if ($user->verifyPassword($pwd)) {
                echo "✅ 密码 '$pwd' 验证成功\n";
                break;
            } else {
                echo "❌ 密码 '$pwd' 验证失败\n";
            }
        }
    } else {
        echo "没有找到用户 'chenoo'\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
}

echo "\n=== 检查完成 ===\n";
?>