<?php

namespace App\Controllers;

use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use Respect\Validation\Validator as v;

class ProductController
{
    private $productModel;

    public function __construct()
    {
        $this->productModel = new Product();
    }

    /**
     * 获取用户的产品列表
     */
    public function index()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            $result = $this->productModel->getUserProducts($userId, $page, $limit, $search);

            if ($result === false) {
                return Response::error('获取产品列表失败');
            }

            return Response::success($result, '获取产品列表成功');
        } catch (\Exception $e) {
            error_log('Get products error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个产品详情
     */
    public function show($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($id, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            $product = $this->productModel->findById($id) ?? null;
            if (!$product) {
                return Response::error('产品不存在', 404);
            }

            // 获取产品统计信息
            $stats = $this->productModel->getProductStats($id, $userId);
            if ($stats) {
                $product['stats'] = $stats;
            }

            return Response::success($product, '获取产品详情成功');
        } catch (\Exception $e) {
            error_log('Get product error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建新产品
     */
    public function store()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateProductData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查产品名称是否已存在
            if ($this->productModel->isNameExists($input['name'], $userId)) {
                return Response::error('产品名称已存在', 400);
            }

            // 准备数据
            $productData = [
                'name' => trim($input['name']),
                'description' => trim($input['description'] ?? ''),
                'website_url' => trim($input['website_url'] ?? ''),
                'logo_url' => trim($input['logo_url'] ?? ''),
                'user_id' => $userId
            ];

            $product = $this->productModel->create($productData);
            if (!$product) {
                return Response::error('创建产品失败');
            }

            return Response::success($product, '创建产品成功', 201);
        } catch (\Exception $e) {
            error_log('Create product error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新产品
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($id, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateProductData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查产品名称是否已存在（排除当前产品）
            if ($this->productModel->isNameExists($input['name'], $userId, $id)) {
                return Response::error('产品名称已存在', 400);
            }

            // 准备数据
            $productData = [
                'name' => trim($input['name']),
                'description' => trim($input['description'] ?? ''),
                'website_url' => trim($input['website_url'] ?? ''),
                'logo_url' => trim($input['logo_url'] ?? '')
            ];

            $product = $this->productModel->update($id, $productData, $userId);
            if (!$product) {
                return Response::error('更新产品失败');
            }

            return Response::success($product, '更新产品成功');
        } catch (\Exception $e) {
            error_log('Update product error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除产品
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($id, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查产品是否存在
            $product = $this->productModel->findById($id);
            if (!$product) {
                return Response::error('产品不存在', 404);
            }

            $result = $this->productModel->delete($id, $userId);
            if (!$result) {
                return Response::error('删除产品失败');
            }

            return Response::success(null, '删除产品成功');
        } catch (\Exception $e) {
            error_log('Delete product error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 验证产品数据
     */
    private function validateProductData($data)
    {
        $errors = [];

        // 产品名称验证
        if (!isset($data['name']) || empty(trim($data['name']))) {
            $errors['name'] = '产品名称不能为空';
        } elseif (strlen(trim($data['name'])) > 100) {
            $errors['name'] = '产品名称不能超过100个字符';
        }

        // 描述验证（可选）
        if (isset($data['description']) && strlen($data['description']) > 1000) {
            $errors['description'] = '产品描述不能超过1000个字符';
        }

        // 网站URL验证（可选）
        if (isset($data['website_url']) && !empty(trim($data['website_url']))) {
            if (!filter_var($data['website_url'], FILTER_VALIDATE_URL)) {
                $errors['website_url'] = '请输入有效的网站URL';
            }
        }

        // Logo URL验证（可选）
        if (isset($data['logo_url']) && !empty(trim($data['logo_url']))) {
            if (!filter_var($data['logo_url'], FILTER_VALIDATE_URL)) {
                $errors['logo_url'] = '请输入有效的Logo URL';
            }
        }

        return empty($errors) ? true : $errors;
    }

    /**
     * 获取产品统计信息
     */
    public function stats($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            $stats = $this->productModel->getProductStats($id, $userId);
            if ($stats === false) {
                return Response::error('获取统计信息失败');
            }

            return Response::success($stats, '获取统计信息成功');
        } catch (\Exception $e) {
            error_log('Get product stats error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }
}