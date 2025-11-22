<?php
require_once 'vendor/autoload.php';

// 直接连接数据库
$db = new PDO('sqlite:database/product_duck.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== 重置testauth用户密码 ===\n\n";

// 新密码
$newPassword = 'testpass123';
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

echo "新密码: $newPassword\n";
echo "哈希后的密码: $hashedPassword\n\n";

// 更新密码
$stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE username = ?");
$result = $stmt->execute([$hashedPassword, 'testauth']);

if ($result) {
    echo "✅ 密码更新成功\n";
    
    // 验证密码
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE username = ?");
    $stmt->execute(['testauth']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($newPassword, $user['password_hash'])) {
        echo "✅ 密码验证成功\n";
    } else {
        echo "❌ 密码验证失败\n";
    }
} else {
    echo "❌ 密码更新失败\n";
}

echo "\n=== 完成 ===\n";
?>