<?php
require_once 'vendor/autoload.php';

// 设置token
$token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJwcm9kdWN0LWR1Y2siLCJpYXQiOjE3NTUzOTI5NDgsImV4cCI6MTc1NTM5NjU0OCwiZGF0YSI6eyJpZCI6IjEiLCJ1c2VybmFtZSI6InRlc3R1c2VyMTc1NTM5MjkzMSIsImVtYWlsIjoidGVzdDE3NTUzOTI5MzFAZXhhbXBsZS5jb20ifX0.VzOysPdqE8xxl-RiFjgfL94clQ3mtlEjyV7Rk4vc8Ag';

// 模拟HTTP请求
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/products/1/competitors';
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;

echo "Testing competitors API...\n";
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
echo "Token: " . substr($token, 0, 20) . "...\n\n";

// 包含主入口文件
ob_start();
include 'public/index.php';
$output = ob_get_clean();

echo "API Response:\n";
echo $output;
echo "\n";

// 尝试解析JSON
$data = json_decode($output, true);
if ($data) {
    echo "\nParsed JSON:\n";
    print_r($data);
    
    if (isset($data['data']['competitors'])) {
        echo "\nCompetitors count: " . count($data['data']['competitors']) . "\n";
    }
} else {
    echo "\nFailed to parse JSON response\n";
}
?>