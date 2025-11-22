<?php

namespace App\Controllers;

use App\Models\RoadmapItem;
use App\Models\RoadmapTag;
use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use Respect\Validation\Validator as v;

class RoadmapController
{
    private $roadmapItemModel;
    private $roadmapTagModel;
    private $productModel;

    public function __construct()
    {
        $this->roadmapItemModel = new RoadmapItem();
        $this->roadmapTagModel = new RoadmapTag();
        $this->productModel = new Product();
    }

    /**
     * 获取产品的路线图项目列表
     */
    public function getItems($productId)
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

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取筛选参数
            $filters = [
                'search' => $_GET['search'] ?? '',
                'status' => $_GET['status'] ?? '',
                'type' => $_GET['type'] ?? '',
                'priority' => $_GET['priority'] ?? '',
                'owner_id' => $_GET['owner_id'] ?? '',
                'order_by' => $_GET['order_by'] ?? 'created_at',
                'order_dir' => $_GET['order_dir'] ?? 'DESC'
            ];

            $items = $this->roadmapItemModel->findByProductId($productId, $filters);
            $stats = $this->roadmapItemModel->getStatsByProductId($productId);

            return Response::success([
                'items' => $items,
                'stats' => $stats
            ], '获取路线图项目列表成功');

        } catch (\Exception $e) {
            error_log('Get roadmap items error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建路线图项目
     */
    public function createItem($productId)
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

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }
            
            // 调试：记录接收到的数据
            error_log('RoadmapController createItem received data: ' . print_r($input, true));

            // 验证必填字段
            $validator = v::key('title', v::stringType()->notEmpty()->length(1, 200))
                          ->key('type', v::in(['Epic', 'Milestone', 'Task', 'Feature']))
                          ->key('status', v::in(['planned', 'in_progress', 'completed', 'cancelled', 'on_hold']))
                          ->key('priority', v::in(['low', 'medium', 'high', 'urgent']))
                          ->key('owner_id', v::intType()->positive())
                          ->key('progress', v::intType()->between(0, 100));

            if (!$validator->validate($input)) {
                return Response::error('请求数据验证失败', 400);
            }

            // 验证日期
            if (!empty($input['start_date']) && !empty($input['end_date'])) {
                if (strtotime($input['start_date']) > strtotime($input['end_date'])) {
                    return Response::error('开始日期不能晚于结束日期', 400);
                }
            }

            // 准备数据
            $data = [
                'product_id' => $productId,
                'title' => $input['title'],
                'description' => $input['description'] ?? '',
                'type' => $input['type'],
                'status' => $input['status'],
                'priority' => $input['priority'],
                'owner_id' => $input['owner_id'],
                'start_date' => $input['start_date'] ?? null,
                'end_date' => $input['end_date'] ?? null,
                'progress' => $input['progress'] ?? 0,
                'created_by' => $userId,
                'tags' => $input['tags'] ?? []
            ];

            $item = $this->roadmapItemModel->create($data);
            if (!$item) {
                return Response::error('创建路线图项目失败');
            }

            return Response::success($item, '创建路线图项目成功', 201);

        } catch (\Exception $e) {
            error_log('Create roadmap item error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新路线图项目
     */
    public function updateItem($productId, $itemId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($itemId) || $itemId <= 0) {
                return Response::error('无效的ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查项目是否存在
            $existingItem = $this->roadmapItemModel->findById($itemId);
            if (!$existingItem || $existingItem['product_id'] != $productId) {
                return Response::error('路线图项目不存在', 404);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 验证必填字段
            $validator = v::key('title', v::stringType()->notEmpty()->length(1, 200))
                          ->key('type', v::in(['Epic', 'Milestone', 'Task', 'Feature']))
                          ->key('status', v::in(['planned', 'in_progress', 'completed', 'cancelled', 'on_hold']))
                          ->key('priority', v::in(['low', 'medium', 'high', 'urgent']))
                          ->key('owner_id', v::intType()->positive())
                          ->key('progress', v::intType()->between(0, 100));

            if (!$validator->validate($input)) {
                return Response::error('请求数据验证失败', 400);
            }

            // 验证日期
            if (!empty($input['start_date']) && !empty($input['end_date'])) {
                if (strtotime($input['start_date']) > strtotime($input['end_date'])) {
                    return Response::error('开始日期不能晚于结束日期', 400);
                }
            }

            // 准备数据
            $data = [
                'title' => $input['title'],
                'description' => $input['description'] ?? '',
                'type' => $input['type'],
                'status' => $input['status'],
                'priority' => $input['priority'],
                'owner_id' => $input['owner_id'],
                'start_date' => $input['start_date'] ?? null,
                'end_date' => $input['end_date'] ?? null,
                'progress' => $input['progress'] ?? 0,
                'tags' => $input['tags'] ?? []
            ];

            $item = $this->roadmapItemModel->update($itemId, $data);
            if (!$item) {
                return Response::error('更新路线图项目失败');
            }

            return Response::success($item, '更新路线图项目成功');

        } catch (\Exception $e) {
            error_log('Update roadmap item error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除路线图项目
     */
    public function deleteItem($productId, $itemId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($itemId) || $itemId <= 0) {
                return Response::error('无效的ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查项目是否存在
            $existingItem = $this->roadmapItemModel->findById($itemId);
            if (!$existingItem || $existingItem['product_id'] != $productId) {
                return Response::error('路线图项目不存在', 404);
            }

            $result = $this->roadmapItemModel->delete($itemId);
            if (!$result) {
                return Response::error('删除路线图项目失败');
            }

            return Response::success(null, '删除路线图项目成功');

        } catch (\Exception $e) {
            error_log('Delete roadmap item error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取产品的标签列表
     */
    public function getTags($productId)
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

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            $tags = $this->roadmapTagModel->findByProductId($productId);

            return Response::success($tags, '获取标签列表成功');

        } catch (\Exception $e) {
            error_log('Get roadmap tags error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建标签
     */
    public function createTag($productId)
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

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 验证必填字段
            $validator = v::key('name', v::stringType()->notEmpty()->length(1, 50));

            if (!$validator->validate($input)) {
                return Response::error('请求数据验证失败', 400);
            }

            // 检查标签名称是否已存在
            if ($this->roadmapTagModel->existsByNameAndProduct($input['name'], $productId)) {
                return Response::error('标签名称已存在', 400);
            }

            // 准备数据
            $data = [
                'name' => $input['name'],
                'color' => $input['color'] ?? '#3B82F6',
                'product_id' => $productId
            ];

            $tag = $this->roadmapTagModel->create($data);
            if (!$tag) {
                return Response::error('创建标签失败');
            }

            return Response::success($tag, '创建标签成功', 201);

        } catch (\Exception $e) {
            error_log('Create roadmap tag error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新标签
     */
    public function updateTag($productId, $tagId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($tagId) || $tagId <= 0) {
                return Response::error('无效的ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查标签是否存在
            $existingTag = $this->roadmapTagModel->findById($tagId);
            if (!$existingTag || $existingTag['product_id'] != $productId) {
                return Response::error('标签不存在', 404);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 验证必填字段
            $validator = v::key('name', v::stringType()->notEmpty()->length(1, 50));

            if (!$validator->validate($input)) {
                return Response::error('请求数据验证失败', 400);
            }

            // 检查标签名称是否已存在（排除当前标签）
            if ($this->roadmapTagModel->existsByNameAndProduct($input['name'], $productId, $tagId)) {
                return Response::error('标签名称已存在', 400);
            }

            // 准备数据
            $data = [
                'name' => $input['name'],
                'color' => $input['color'] ?? '#3B82F6'
            ];

            $tag = $this->roadmapTagModel->update($tagId, $data);
            if (!$tag) {
                return Response::error('更新标签失败');
            }

            return Response::success($tag, '更新标签成功');

        } catch (\Exception $e) {
            error_log('Update roadmap tag error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除标签
     */
    public function deleteTag($productId, $tagId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($tagId) || $tagId <= 0) {
                return Response::error('无效的ID', 400);
            }

            // 检查用户权限
            if (!$this->productModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 检查标签是否存在
            $existingTag = $this->roadmapTagModel->findById($tagId);
            if (!$existingTag || $existingTag['product_id'] != $productId) {
                return Response::error('标签不存在', 404);
            }

            $result = $this->roadmapTagModel->delete($tagId);
            if (!$result) {
                return Response::error('删除标签失败');
            }

            return Response::success(null, '删除标签成功');

        } catch (\Exception $e) {
            error_log('Delete roadmap tag error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }
}