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

use App\Utils\JWT;

echo "=== JWT测试 ===\n";

try {
    // 初始化JWT
    JWT::init();
    echo "JWT初始化成功\n";
    
    // 测试数据
    $testData = [
        'id' => 3,
        'username' => 'chenoo',
        'email' => 'chenoo@example.com'
    ];
    
    echo "测试数据: " . json_encode($testData) . "\n";
    
    // 生成token
    $token = JWT::generate($testData);
    echo "生成的token: $token\n";
    
    // 验证token
    $verifiedData = JWT::verify($token);
    echo "验证结果: " . json_encode($verifiedData) . "\n";
    
    // 测试过期token（生成一个已过期的token）
    echo "\n=== 测试过期token ===\n";
    
    // 手动创建一个过期的token
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload = [
        'iss' => 'product-duck',
        'iat' => time() - 7200, // 2小时前
        'exp' => time() - 3600, // 1小时前（已过期）
        'data' => $testData
    ];
    
    $headerEncoded = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
    $payloadEncoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $_ENV['JWT_SECRET'] ?? 'default-secret-key', true);
    $signatureEncoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    
    $expiredToken = $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    echo "过期token: $expiredToken\n";
    
    try {
        $expiredResult = JWT::verify($expiredToken);
        echo "过期token验证结果: " . json_encode($expiredResult) . "\n";
    } catch (Exception $e) {
        echo "过期token验证失败（预期）: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
    echo "堆栈跟踪: " . $e->getTraceAsString() . "\n";
}

echo "\n=== 测试完成 ===\n";
?>