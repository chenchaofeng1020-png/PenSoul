<?php
require_once 'vendor/autoload.php';

use App\Config\Database;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Utils\JWT;

echo "Testing user login and competitors data...\n\n";

// 模拟登录请求
$_POST['email'] = '578688700@qq.com';
$_POST['password'] = '123456abc';

// 创建认证控制器并登录
$authController = new AuthController();
ob_start();
$authController->login();
$loginResponse = ob_get_clean();

echo "Login Response:\n";
echo $loginResponse . "\n\n";

// 解析登录响应获取token
$loginData = json_decode($loginResponse, true);
if (!$loginData || !isset($loginData['data']['token'])) {
    echo "Login failed or no token received\n";
    exit(1);
}

$token = $loginData['data']['token'];
echo "Token obtained: " . substr($token, 0, 50) . "...\n\n";

// 模拟带token的竞品请求
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
$_GET['product_id'] = '1'; // 测试产品ID 1的竞品

// 创建产品控制器并获取竞品
$productController = new ProductController();
ob_start();
$productController->getCompetitors();
$competitorsResponse = ob_get_clean();

echo "Competitors API Response:\n";
echo $competitorsResponse . "\n\n";

// 解析竞品响应
$competitorsData = json_decode($competitorsResponse, true);
if ($competitorsData) {
    echo "Parsed competitors data:\n";
    if (isset($competitorsData['data']) && is_array($competitorsData['data'])) {
        echo "Number of competitors: " . count($competitorsData['data']) . "\n";
        foreach ($competitorsData['data'] as $competitor) {
            echo "- ID: {$competitor['id']}, Name: {$competitor['name']}\n";
        }
    } else {
        echo "No competitors data found or invalid format\n";
    }
} else {
    echo "Failed to parse competitors response\n";
}

echo "\nTest completed.\n";
?>