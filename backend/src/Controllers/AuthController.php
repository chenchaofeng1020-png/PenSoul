<?php

namespace App\Controllers;

use App\Models\User;
use App\Models\Product;
use App\Utils\Response;
use App\Utils\JWT;
// use Respect\Validation\Validator as v;
use Exception;

class AuthController
{
    /**
     * 用户注册
     */
    public function register()
    {
        try {
            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            
            // 验证输入数据
            $this->validateRegisterInput($input);
            
            $user = new User();
            
            // 检查邮箱是否已存在
            if ($user->emailExists($input['email'])) {
                Response::error('邮箱已被注册', 400);
            }
            
            // 检查用户名是否已存在
            if ($user->usernameExists($input['username'])) {
                Response::error('用户名已被使用', 400);
            }
            
            // 设置用户信息
            $user->username = $input['username'];
            $user->email = $input['email'];
            $user->password_hash = User::hashPassword($input['password']);
            $user->avatar = $input['avatar'] ?? null;
            $user->status = 'active';
            
            // 创建用户
            if ($user->create()) {
                // 生成JWT token
                $tokenData = [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email
                ];
                
                $token = JWT::generate($tokenData);
                
                Response::success([
                    'user' => $user->toArray(),
                    'token' => $token
                ], '注册成功', 201);
            } else {
                Response::error('注册失败，请稍后重试', 500);
            }
            
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * 用户登录
     */
    public function login()
    {
        try {
            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            
            // 验证输入数据
            $this->validateLoginInput($input);
            
            $user = new User();
            
            // 根据邮箱或用户名查找用户
            $userInfo = null;
            if (filter_var($input['login'], FILTER_VALIDATE_EMAIL)) {
                $userInfo = $user->findByEmail($input['login']);
            } else {
                $userInfo = $user->findByUsername($input['login']);
            }
            
            if (!$userInfo) {
                Response::error('用户不存在', 401);
            }
            
            // 验证密码
            if (!$userInfo->verifyPassword($input['password'])) {
                Response::error('密码错误', 401);
            }
            
            // 检查用户状态
            if ($userInfo->status !== 'active') {
                Response::error('账户已被禁用，请联系管理员', 401);
            }
            
            // 检查是否为首次登录
            if ($userInfo->last_login_at === null) {
                // 首次登录，创建默认产品
                $product = new Product();
                $product->createDefaultProduct($userInfo->id);
            }
            
            // 更新最后登录时间
            $userInfo->updateLastLogin();
            
            // 生成JWT token
            $tokenData = [
                'id' => $userInfo->id,
                'username' => $userInfo->username,
                'email' => $userInfo->email
            ];
            
            $token = JWT::generate($tokenData);
            
            Response::success([
                'user' => $userInfo->toArray(),
                'token' => $token
            ], '登录成功');
            
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * 获取当前用户信息
     */
    public function me()
    {
        try {
            $userData = JWT::validateRequest();
            
            $user = new User();
            $userInfo = $user->findById($userData['id']);
            
            if (!$userInfo) {
                Response::error('用户不存在', 404);
            }
            
            Response::success($userInfo->toArray(), '获取用户信息成功');
            
        } catch (Exception $e) {
            Response::error($e->getMessage(), 401);
        }
    }
    
    /**
     * 刷新token
     */
    public function refresh()
    {
        try {
            $userData = JWT::validateRequest();
            
            // 生成新的token
            $token = JWT::generate($userData);
            
            Response::success([
                'token' => $token
            ], 'Token刷新成功');
            
        } catch (Exception $e) {
            Response::error($e->getMessage(), 401);
        }
    }
    
    /**
     * 验证注册输入
     */
    private function validateRegisterInput($input)
    {
        if (!$input) {
            throw new Exception('请求数据不能为空');
        }
        
        // 用户名验证
        $username = $input['username'] ?? '';
        if (empty($username) || strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            throw new Exception('用户名必须为3-50位字母、数字或下划线');
        }
        
        // 邮箱验证
        $email = $input['email'] ?? '';
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('请输入有效的邮箱地址');
        }
        
        // 密码验证
        $password = $input['password'] ?? '';
        if (empty($password) || strlen($password) < 6 || strlen($password) > 50) {
            throw new Exception('密码长度必须为6-50位');
        }
    }
    
    /**
     * 验证登录输入
     */
    private function validateLoginInput($input)
    {
        if (!$input) {
            throw new Exception('请求数据不能为空');
        }
        
        // 登录名验证（邮箱或用户名）
        $login = $input['login'] ?? '';
        if (empty($login)) {
            throw new Exception('请输入用户名或邮箱');
        }
        
        // 密码验证
        $password = $input['password'] ?? '';
        if (empty($password)) {
            throw new Exception('请输入密码');
        }
    }
}