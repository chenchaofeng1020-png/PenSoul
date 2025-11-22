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
use App\Utils\Response;
use App\Controllers\ProductController;
use App\Middleware\AuthMiddleware;

echo "=== 模拟真实API请求测试 ===\n";

// 首先登录获取token
echo "\n1. 模拟登录获取token\n";
$loginUrl = 'http://localhost:8000/api/auth/login';
$loginData = [
    'login' => 'testauth',
    'password' => '123456'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "登录响应状态码: $httpCode\n";
echo "登录响应内容: $response\n";

if ($httpCode === 200) {
    $loginResult = json_decode($response, true);
    if (isset($loginResult['data']['token'])) {
        $token = $loginResult['data']['token'];
        echo "获取到token: $token\n";
        
        // 2. 使用token请求产品列表
        echo "\n2. 使用token请求产品列表\n";
        $productsUrl = 'http://localhost:8000/api/products';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $productsUrl);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        echo "产品列表响应状态码: $httpCode\n";
        echo "产品列表响应内容: $response\n";
        
        if ($httpCode === 401) {
            echo "\n❌ 发现问题：即使使用有效token，仍然返回401认证失败\n";
            
            // 3. 直接验证token
            echo "\n3. 直接验证token\n";
            try {
                JWT::init();
                $verifiedData = JWT::verify($token);
                echo "Token验证成功: " . json_encode($verifiedData) . "\n";
                
                // 4. 模拟HTTP请求头环境
                echo "\n4. 模拟HTTP请求头环境\n";
                $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
                $_SERVER['REQUEST_METHOD'] = 'GET';
                $_SERVER['REQUEST_URI'] = '/api/products';
                
                try {
                    $requestData = JWT::validateRequest();
                    echo "HTTP请求验证成功: " . json_encode($requestData) . "\n";
                } catch (Exception $e) {
                    echo "HTTP请求验证失败: " . $e->getMessage() . "\n";
                }
                
            } catch (Exception $e) {
                echo "Token验证失败: " . $e->getMessage() . "\n";
            }
        } else {
            echo "\n✅ 请求成功\n";
        }
        
    } else {
        echo "登录响应中没有找到token\n";
    }
} else {
    echo "登录失败\n";
}

echo "\n=== 测试完成 ===\n";
?>