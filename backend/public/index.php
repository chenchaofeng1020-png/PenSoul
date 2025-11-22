<?php

// 设置错误报告
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 引入自动加载
require_once __DIR__ . '/../vendor/autoload.php';

// 加载环境变量
$envFile = dirname(__DIR__) . '/.env';
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

// 引入必要的类
use App\Core\Router;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Controllers\CompetitorController;
use App\Controllers\CommentController;
use App\Controllers\CompetitorFeatureController;
use App\Controllers\ProductRequirementController;
use App\Controllers\CompetitorAnalysisController;
use App\Controllers\DocumentController;
use App\Controllers\UploadController;
use App\Controllers\RoadmapController;
use App\Controllers\RoadmapExportController;
use App\Controllers\TeamMemberController;
use App\Middleware\AuthMiddleware;
use App\Utils\Response;

// 设置CORS头
Response::setCorsHeaders();

// 创建路由实例
$router = new Router();

// 公开路由（不需要认证）
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login', [AuthController::class, 'login']);

// 需要认证的路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/auth/me', [AuthController::class, 'me']);

$router->middleware(AuthMiddleware::class)
       ->post('/api/auth/refresh', [AuthController::class, 'refresh']);

// 产品管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/products', [ProductController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{id}', [ProductController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products', [ProductController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{id}', [ProductController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{id}', [ProductController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{id}/stats', [ProductController::class, 'stats']);

// 竞品管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/competitors', [CompetitorController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/competitors/{id}', [CompetitorController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/competitors', [CompetitorController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{productId}/competitors/{id}', [CompetitorController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{productId}/competitors/{id}', [CompetitorController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/competitors/batch-delete', [CompetitorController::class, 'batchDestroy']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/competitors/stats', [CompetitorController::class, 'stats']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/competitors', [CompetitorController::class, 'all']);

// 评论管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/comments/{targetType}/{targetId}', [CommentController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/comments/{targetType}/{targetId}', [CommentController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/comments/{id}', [CommentController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/comments/{id}', [CommentController::class, 'destroy']);

// 竞品功能管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/competitors/{competitorId}/features', [CompetitorFeatureController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/competitors/{competitorId}/features/{id}', [CompetitorFeatureController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/competitors/{competitorId}/features', [CompetitorFeatureController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/competitors/{competitorId}/features/{id}', [CompetitorFeatureController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/competitors/{competitorId}/features/{id}', [CompetitorFeatureController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/competitors/{competitorId}/features/batch-delete', [CompetitorFeatureController::class, 'batchDestroy']);

// 产品需求管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/requirements', [ProductRequirementController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/requirements/{id}', [ProductRequirementController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/requirements', [ProductRequirementController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{productId}/requirements/{id}', [ProductRequirementController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{productId}/requirements/{id}', [ProductRequirementController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/requirements/batch-delete', [ProductRequirementController::class, 'batchDestroy']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/requirements/generate-from-analysis', [ProductRequirementController::class, 'generateFromAnalysis']);

// 竞品分析管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/competitors/{competitorId}/analyses', [CompetitorAnalysisController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/analyses/{id}', [CompetitorAnalysisController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/competitors/{competitorId}/analyses', [CompetitorAnalysisController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/analyses/{id}', [CompetitorAnalysisController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/analyses/{id}', [CompetitorAnalysisController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/competitors/{competitorId}/analyses/batch-delete', [CompetitorAnalysisController::class, 'batchDestroy']);

// 文档管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/documents', [DocumentController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/competitors/{competitorId}/documents', [DocumentController::class, 'index']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/documents/{id}', [DocumentController::class, 'show']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/competitors/{competitorId}/documents', [DocumentController::class, 'store']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/documents/{id}', [DocumentController::class, 'update']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/documents/{id}', [DocumentController::class, 'destroy']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/documents/{id}/download', [DocumentController::class, 'download']);

// 路线图管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/roadmap/items', [RoadmapController::class, 'getItems']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/roadmap/items', [RoadmapController::class, 'createItem']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{productId}/roadmap/items/{id}', [RoadmapController::class, 'updateItem']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{productId}/roadmap/items/{id}', [RoadmapController::class, 'deleteItem']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/roadmap/tags', [RoadmapController::class, 'getTags']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/roadmap/tags', [RoadmapController::class, 'createTag']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{productId}/roadmap/tags/{id}', [RoadmapController::class, 'updateTag']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{productId}/roadmap/tags/{id}', [RoadmapController::class, 'deleteTag']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/roadmap/export/pdf', [RoadmapExportController::class, 'exportPDF']);

// 团队成员管理路由
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/members', [TeamMemberController::class, 'getMembers']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/products/{productId}/members/invite', [TeamMemberController::class, 'inviteMember']);
$router->middleware(AuthMiddleware::class)
       ->put('/api/products/{productId}/members/{memberId}/role', [TeamMemberController::class, 'updateMemberRole']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/products/{productId}/members/{memberId}', [TeamMemberController::class, 'removeMember']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/invitations', [TeamMemberController::class, 'getInvitations']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/products/{productId}/members/logs', [TeamMemberController::class, 'getMemberLogs']);

// 邀请处理路由（公开路由，不需要认证）
$router->get('/api/invitations/{token}', [TeamMemberController::class, 'getInvitation']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/invitations/{token}/accept', [TeamMemberController::class, 'acceptInvitation']);
$router->post('/api/invitations/{token}/decline', [TeamMemberController::class, 'declineInvitation']);

// 文件上传路由
$router->middleware(AuthMiddleware::class)
       ->post('/api/upload/logo', [UploadController::class, 'uploadLogo']);
$router->middleware(AuthMiddleware::class)
       ->post('/api/upload/image', [UploadController::class, 'uploadImage']);
$router->middleware(AuthMiddleware::class)
       ->delete('/api/upload/file', [UploadController::class, 'deleteFile']);
$router->middleware(AuthMiddleware::class)
       ->get('/api/upload/config', [UploadController::class, 'getUploadConfig']);

// 健康检查路由
$router->get('/health', function() {
    Response::success([
        'status' => 'ok',
        'timestamp' => time(),
        'version' => '1.0.0'
    ], 'API服务正常运行');
});

// API信息路由
$router->get('/', function() {
    Response::success([
        'name' => '产品鸭竞品管理系统API',
        'version' => '1.0.0',
        'description' => '专业的竞品分析管理平台后端API',
        'endpoints' => [
            'POST /api/auth/register' => '用户注册',
            'POST /api/auth/login' => '用户登录',
            'GET /api/auth/me' => '获取当前用户信息',
            'POST /api/auth/refresh' => '刷新token',
            'GET /api/health' => '健康检查'
        ]
    ], '欢迎使用产品鸭API');
});

// 调试：输出所有注册的路由
if (isset($_GET['debug_routes'])) {
    header('Content-Type: application/json');
    $reflection = new ReflectionClass($router);
    $property = $reflection->getProperty('routes');
    $property->setAccessible(true);
    $routes = $property->getValue($router);
    echo json_encode($routes, JSON_PRETTY_PRINT);
    exit;
}

// 全局异常处理
try {
    // 分发路由
    $router->dispatch();
} catch (Exception $e) {
    // 记录错误日志
    error_log('API Error: ' . $e->getMessage());
    
    // 返回错误响应
    Response::error(
        ($_ENV['APP_DEBUG'] ?? false) ? $e->getMessage() : '服务器内部错误',
        500
    );
}