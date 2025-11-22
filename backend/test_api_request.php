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

echo "=== API请求测试 ===\n";

// 首先生成一个有效的token
$testData = [
    'id' => 3,
    'username' => 'chenoo',
    'email' => 'chenoo@example.com'
];

$token = JWT::generate($testData);
echo "生成的token: $token\n";

// 测试1: 模拟正确的Authorization头
echo "\n=== 测试1: 正确的Authorization头 ===\n";
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;

try {
    $result = JWT::validateRequest();
    echo "验证成功: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "验证失败: " . $e->getMessage() . "\n";
}

// 测试2: 测试不同的头格式
echo "\n=== 测试2: 小写authorization头 ===\n";
unset($_SERVER['HTTP_AUTHORIZATION']);
$_SERVER['HTTP_AUTHORIZATION'] = 'bearer ' . $token;

try {
    $result = JWT::validateRequest();
    echo "验证成功: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "验证失败: " . $e->getMessage() . "\n";
}

// 测试3: 测试过期token
echo "\n=== 测试3: 过期token ===\n";
// 手动创建过期token
$header = ['typ' => 'JWT', 'alg' => 'HS256'];
$payload = [
    'iss' => 'product-duck',
    'iat' => time() - 7200,
    'exp' => time() - 3600, // 已过期
    'data' => $testData
];

$headerEncoded = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
$payloadEncoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
$signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $_ENV['JWT_SECRET'] ?? 'default-secret-key', true);
$signatureEncoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

$expiredToken = $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $expiredToken;

try {
    $result = JWT::validateRequest();
    echo "验证成功: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "验证失败（预期）: " . $e->getMessage() . "\n";
}

// 测试4: 测试无token
echo "\n=== 测试4: 无Authorization头 ===\n";
unset($_SERVER['HTTP_AUTHORIZATION']);

try {
    $result = JWT::validateRequest();
    echo "验证成功: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "验证失败（预期）: " . $e->getMessage() . "\n";
}

// 测试5: 测试错误格式的token
echo "\n=== 测试5: 错误格式的token ===\n";
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer invalid-token';

try {
    $result = JWT::validateRequest();
    echo "验证成功: " . json_encode($result) . "\n";
} catch (Exception $e) {
    echo "验证失败（预期）: " . $e->getMessage() . "\n";
}

echo "\n=== 测试完成 ===\n";
?>