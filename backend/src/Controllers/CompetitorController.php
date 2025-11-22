<?php

namespace App\Controllers;

use App\Models\Competitor;
use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;

class CompetitorController
{
    private $competitorModel;
    private $productModel;

    public function __construct()
    {
        $this->competitorModel = new Competitor();
        $this->productModel = new Product();
    }

    /**
     * 获取产品的竞品列表
     */
    public function index($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';

            $result = $this->competitorModel->getProductCompetitors($productId, $page, $limit, $search);

            if ($result === false) {
                return Response::error('获取竞品列表失败');
            }

            return Response::success($result, '获取竞品列表成功');
        } catch (\Exception $e) {
            error_log('Get competitors error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取用户所有产品的竞品列表
     */
    public function all()
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

            $result = $this->competitorModel->getUserCompetitors($userId, $page, $limit, $search);

            if ($result === false) {
                return Response::error('获取竞品列表失败');
            }

            return Response::success('获取竞品列表成功', $result);
        } catch (\Exception $e) {
            error_log('Get all competitors error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个竞品详情
     */
    public function show($productId, $id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($id) || $id <= 0) {
                return Response::error('无效的ID参数', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查竞品是否属于该产品
            if (!$this->competitorModel->belongsToProduct($id, $productId)) {
                return Response::error('竞品不存在或不属于该产品', 404);
            }

            $competitor = $this->competitorModel->findById($id);
            if (!$competitor) {
                return Response::error('竞品不存在', 404);
            }

            return Response::success('获取竞品详情成功', $competitor);
        } catch (\Exception $e) {
            error_log('Get competitor error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建新竞品
     */
    public function store($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateCompetitorData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查竞品名称是否已存在
            if ($this->competitorModel->isNameExists($input['name'], $productId)) {
                return Response::error('竞品名称已存在', 400);
            }

            // 准备数据
            $competitorData = [
                'product_id' => $productId,
                'name' => trim($input['name']),
                'slogan' => trim($input['slogan'] ?? ''),
                'description' => trim($input['description'] ?? ''),
                'website_url' => trim($input['website_url'] ?? ''),
                'documentation_url' => trim($input['documentation_url'] ?? ''),
                'logo_url' => trim($input['logo_url'] ?? ''),
                'main_customers' => trim($input['main_customers'] ?? '')
            ];

            // 检查create()方法的返回值
            $competitor = $this->competitorModel->create($competitorData);
            if ($competitor === null) {
                throw new \Exception('创建竞品失败');
            }
            if (!$competitor) {
                return Response::error('创建竞品失败');
            }

            return Response::success($competitor, '创建竞品成功', 201);
        } catch (\Exception $e) {
            error_log('Create competitor error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新竞品
     */
    public function update($productId, $id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($id) || $id <= 0) {
                return Response::error('无效的ID参数', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查竞品是否属于该产品
            if (!$this->competitorModel->belongsToProduct($id, $productId)) {
                return Response::error('竞品不存在或不属于该产品', 404);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateCompetitorData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查竞品名称是否已存在（排除当前竞品）
            if ($this->competitorModel->isNameExists($input['name'], $productId, $id)) {
                return Response::error('竞品名称已存在', 400);
            }

            // 准备数据
            $competitorData = [
                'name' => trim($input['name']),
                'slogan' => trim($input['slogan'] ?? ''),
                'description' => trim($input['description'] ?? ''),
                'website_url' => trim($input['website_url'] ?? ''),
                'documentation_url' => trim($input['documentation_url'] ?? ''),
                'logo_url' => trim($input['logo_url'] ?? ''),
                'main_customers' => trim($input['main_customers'] ?? '')
            ];

            $competitor = $this->competitorModel->update($id, $competitorData);
            if (!$competitor) {
                return Response::error('更新竞品失败');
            }

            return Response::success('更新竞品成功', $competitor);
        } catch (\Exception $e) {
            error_log('Update competitor error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除竞品
     */
    public function destroy($productId, $id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($id) || $id <= 0) {
                return Response::error('无效的ID参数', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查竞品是否属于该产品
            if (!$this->competitorModel->belongsToProduct($id, $productId)) {
                return Response::error('竞品不存在或不属于该产品', 404);
            }

            $result = $this->competitorModel->delete($id);
            if (!$result) {
                return Response::error('删除竞品失败');
            }

            return Response::success('删除竞品成功');
        } catch (\Exception $e) {
            error_log('Delete competitor error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 批量删除竞品
     */
    public function batchDestroy($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['ids']) || !is_array($input['ids'])) {
                return Response::error('无效的请求数据', 400);
            }

            $ids = array_filter($input['ids'], function($id) {
                return is_numeric($id) && $id > 0;
            });

            if (empty($ids)) {
                return Response::error('请选择要删除的竞品', 400);
            }

            $result = $this->competitorModel->batchDelete($ids, $productId);
            if (!$result) {
                return Response::error('批量删除竞品失败');
            }

            return Response::success('批量删除竞品成功');
        } catch (\Exception $e) {
            error_log('Batch delete competitors error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取竞品统计信息
     */
    public function stats($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户是否有权限访问该产品
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            $stats = $this->competitorModel->getCompetitorStats($productId);
            if ($stats === false) {
                return Response::error('获取统计信息失败');
            }

            return Response::success('获取统计信息成功', $stats);
        } catch (\Exception $e) {
            error_log('Get competitor stats error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 验证竞品数据
     */
    private function validateCompetitorData($data)
    {
        $errors = [];

        // 竞品名称验证
        if (!isset($data['name']) || empty(trim($data['name']))) {
            $errors['name'] = '竞品名称不能为空';
        } elseif (strlen(trim($data['name'])) > 100) {
            $errors['name'] = '竞品名称不能超过100个字符';
        }

        // 口号验证（可选）
        if (isset($data['slogan']) && strlen($data['slogan']) > 200) {
            $errors['slogan'] = '竞品口号不能超过200个字符';
        }

        // 描述验证（可选）
        if (isset($data['description']) && strlen($data['description']) > 1000) {
            $errors['description'] = '竞品描述不能超过1000个字符';
        }

        // 网站URL验证（可选）
        if (isset($data['website_url']) && !empty(trim($data['website_url']))) {
            if (!filter_var($data['website_url'], FILTER_VALIDATE_URL)) {
                $errors['website_url'] = '请输入有效的网站URL';
            }
        }

        // 文档URL验证（可选）
        if (isset($data['documentation_url']) && !empty(trim($data['documentation_url']))) {
            if (!filter_var($data['documentation_url'], FILTER_VALIDATE_URL)) {
                $errors['documentation_url'] = '请输入有效的文档URL';
            }
        }

        // Logo URL验证（可选）
        if (isset($data['logo_url']) && !empty(trim($data['logo_url']))) {
            if (!filter_var($data['logo_url'], FILTER_VALIDATE_URL)) {
                $errors['logo_url'] = '请输入有效的Logo URL';
            }
        }

        // 主要客户验证（可选）
        if (isset($data['main_customers']) && strlen($data['main_customers']) > 500) {
            $errors['main_customers'] = '主要客户信息不能超过500个字符';
        }

        return empty($errors) ? true : $errors;
    }
}