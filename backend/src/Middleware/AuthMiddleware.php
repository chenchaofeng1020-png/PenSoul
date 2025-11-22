<?php

namespace App\Middleware;

use App\Utils\JWT;
use App\Utils\Response;
use App\Models\User;
use Exception;

class AuthMiddleware
{
    /**
     * 处理认证中间件
     */
    public function handle()
    {
        try {
            // 验证JWT token
            $userData = JWT::validateRequest();
            
            // 验证用户是否存在且状态正常
            $user = new User();
            $userInfo = $user->findById($userData['id']);
            
            if (!$userInfo) {
                Response::error('用户不存在', 401);
            }
            
            if ($userInfo->status !== 'active') {
                Response::error('用户账户已被禁用', 401);
            }
            
            // 将用户信息存储到全局变量中，供后续使用
            $GLOBALS['current_user'] = $userInfo->toArray();
            
        } catch (Exception $e) {
            Response::error('认证失败: ' . $e->getMessage(), 401);
        }
    }
    
    /**
     * 获取当前登录用户信息
     */
    public static function getCurrentUser()
    {
        return $GLOBALS['current_user'] ?? null;
    }
    
    /**
     * 获取当前登录用户ID
     */
    public static function getCurrentUserId()
    {
        $user = self::getCurrentUser();
        return $user ? $user['id'] : null;
    }
}