<?php

namespace App\Controllers;

use App\Models\Competitor;
use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use PDO;
use PDOException;
use App\Config\Database;

class CompetitorFeatureController
{
    private $db;
    private $competitorModel;
    private $productModel;
    private $table = 'competitor_features';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->competitorModel = new Competitor();
        $this->productModel = new Product();
    }

    /**
     * 获取竞品功能列表
     */
    public function index($competitorId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证竞品ID
            if (!is_numeric($competitorId) || $competitorId <= 0) {
                return Response::error('无效的竞品ID', 400);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($competitorId, $userId)) {
                return Response::error('无权限访问此竞品', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;
            $offset = ($page - 1) * $limit;
            $priority = isset($_GET['priority']) ? $_GET['priority'] : null;
            $status = isset($_GET['status']) ? $_GET['status'] : null;
            $search = isset($_GET['search']) ? trim($_GET['search']) : null;

            // 构建查询条件
            $whereConditions = ['competitor_id = :competitor_id', 'deleted_at IS NULL'];
            $params = [':competitor_id' => $competitorId];

            if ($priority && in_array($priority, ['high', 'medium', 'low'])) {
                $whereConditions[] = 'priority = :priority';
                $params[':priority'] = $priority;
            }

            if ($status && in_array($status, ['active', 'inactive', 'deprecated'])) {
                $whereConditions[] = 'status = :status';
                $params[':status'] = $status;
            }

            if ($search) {
                $whereConditions[] = '(name LIKE :search OR description LIKE :search)';
                $params[':search'] = '%' . $search . '%';
            }

            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

            // 获取功能总数
            $countSql = "SELECT COUNT(*) as total FROM {$this->table} {$whereClause}";
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 获取功能列表
            $sql = "SELECT * FROM {$this->table} {$whereClause} 
                    ORDER BY 
                        CASE priority 
                            WHEN 'high' THEN 1 
                            WHEN 'medium' THEN 2 
                            WHEN 'low' THEN 3 
                        END, 
                        created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $features = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return Response::success([
                'features' => $features,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ], '获取竞品功能列表成功');
        } catch (\Exception $e) {
            error_log('Get competitor features error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个竞品功能详情
     */
    public function show($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证功能ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的功能ID', 400);
            }

            // 获取功能信息
            $feature = $this->getFeatureById($id);
            if (!$feature) {
                return Response::error('功能不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($feature['competitor_id'], $userId)) {
                return Response::error('无权限访问此功能', 403);
            }

            return Response::success($feature, '获取功能详情成功');
        } catch (\Exception $e) {
            error_log('Get competitor feature error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建竞品功能
     */
    public function store($competitorId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证竞品ID
            if (!is_numeric($competitorId) || $competitorId <= 0) {
                return Response::error('无效的竞品ID', 400);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($competitorId, $userId)) {
                return Response::error('无权限访问此竞品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateFeatureData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查功能名称是否重复
            if ($this->checkFeatureNameExists($competitorId, trim($input['name']))) {
                return Response::error('功能名称已存在', 400);
            }

            // 准备数据
            $featureData = [
                'competitor_id' => $competitorId,
                'name' => trim($input['name']),
                'description' => isset($input['description']) ? trim($input['description']) : null,
                'priority' => $input['priority'],
                'status' => isset($input['status']) ? $input['status'] : 'active'
            ];

            // 插入功能
            $sql = "INSERT INTO {$this->table} (competitor_id, name, description, priority, status, created_at, updated_at) 
                    VALUES (:competitor_id, :name, :description, :priority, :status, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':competitor_id', $featureData['competitor_id']);
            $stmt->bindParam(':name', $featureData['name']);
            $stmt->bindParam(':description', $featureData['description']);
            $stmt->bindParam(':priority', $featureData['priority']);
            $stmt->bindParam(':status', $featureData['status']);
            
            if ($stmt->execute()) {
                $featureId = $this->db->lastInsertId();
                $feature = $this->getFeatureById($featureId);
                return Response::success($feature, '功能创建成功', 201);
            }
            
            return Response::error('创建功能失败');
        } catch (\Exception $e) {
            error_log('Create competitor feature error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新竞品功能
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证功能ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的功能ID', 400);
            }

            // 获取功能信息
            $feature = $this->getFeatureById($id);
            if (!$feature) {
                return Response::error('功能不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($feature['competitor_id'], $userId)) {
                return Response::error('无权限编辑此功能', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateFeatureData($input, false);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 检查功能名称是否重复（排除当前功能）
            if (isset($input['name']) && $this->checkFeatureNameExists($feature['competitor_id'], trim($input['name']), $id)) {
                return Response::error('功能名称已存在', 400);
            }

            // 准备更新数据
            $updateFields = [];
            $params = [':id' => $id];

            if (isset($input['name'])) {
                $updateFields[] = 'name = :name';
                $params[':name'] = trim($input['name']);
            }

            if (isset($input['description'])) {
                $updateFields[] = 'description = :description';
                $params[':description'] = trim($input['description']);
            }

            if (isset($input['priority'])) {
                $updateFields[] = 'priority = :priority';
                $params[':priority'] = $input['priority'];
            }

            if (isset($input['status'])) {
                $updateFields[] = 'status = :status';
                $params[':status'] = $input['status'];
            }

            if (empty($updateFields)) {
                return Response::error('没有需要更新的数据', 400);
            }

            $updateFields[] = "updated_at = datetime('now')";

            // 更新功能
            $sql = "UPDATE {$this->table} SET " . implode(', ', $updateFields) . " WHERE id = :id AND deleted_at IS NULL";
            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            if ($stmt->execute()) {
                $updatedFeature = $this->getFeatureById($id);
                return Response::success($updatedFeature, '功能更新成功');
            }
            
            return Response::error('更新功能失败');
        } catch (\Exception $e) {
            error_log('Update competitor feature error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除竞品功能
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证功能ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的功能ID', 400);
            }

            // 获取功能信息
            $feature = $this->getFeatureById($id);
            if (!$feature) {
                return Response::error('功能不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($feature['competitor_id'], $userId)) {
                return Response::error('无权限删除此功能', 403);
            }

            // 软删除功能
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                return Response::success(null, '功能删除成功');
            }
            
            return Response::error('删除功能失败');
        } catch (\Exception $e) {
            error_log('Delete competitor feature error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 批量删除竞品功能
     */
    public function batchDestroy($competitorId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证竞品ID
            if (!is_numeric($competitorId) || $competitorId <= 0) {
                return Response::error('无效的竞品ID', 400);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($competitorId, $userId)) {
                return Response::error('无权限访问此竞品', 403);
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
                return Response::error('没有有效的功能ID', 400);
            }

            // 验证所有功能都属于指定竞品
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE id IN ({$placeholders}) AND competitor_id = ? AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge($ids, [$competitorId]));
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] != count($ids)) {
                return Response::error('部分功能不存在或不属于此竞品', 400);
            }

            // 批量软删除
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') 
                    WHERE id IN ({$placeholders}) AND competitor_id = ?";
            
            $stmt = $this->db->prepare($sql);
            if ($stmt->execute(array_merge($ids, [$competitorId]))) {
                return Response::success(null, '批量删除功能成功');
            }
            
            return Response::error('批量删除功能失败');
        } catch (\Exception $e) {
            error_log('Batch delete competitor features error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 根据ID获取功能
     */
    private function getFeatureById($id)
    {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE id = :id AND deleted_at IS NULL";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            error_log('Get feature by id error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查功能名称是否存在
     */
    private function checkFeatureNameExists($competitorId, $name, $excludeId = null)
    {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE competitor_id = :competitor_id AND name = :name AND deleted_at IS NULL";
            
            $params = [':competitor_id' => $competitorId, ':name' => $name];
            
            if ($excludeId) {
                $sql .= " AND id != :exclude_id";
                $params[':exclude_id'] = $excludeId;
            }
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (\Exception $e) {
            error_log('Check feature name exists error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查竞品所有权
     */
    private function checkCompetitorOwnership($competitorId, $userId)
    {
        try {
            $sql = "SELECT c.product_id FROM competitors c 
                    INNER JOIN user_products up ON c.product_id = up.product_id 
                    WHERE c.id = :competitor_id AND up.user_id = :user_id AND c.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':competitor_id', $competitorId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (\Exception $e) {
            error_log('Check competitor ownership error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 验证功能数据
     */
    private function validateFeatureData($data, $requireName = true)
    {
        $errors = [];

        // 功能名称验证
        if ($requireName) {
            if (!isset($data['name']) || empty(trim($data['name']))) {
                $errors['name'] = '功能名称不能为空';
            }
        }
        
        if (isset($data['name']) && strlen(trim($data['name'])) > 100) {
            $errors['name'] = '功能名称不能超过100个字符';
        }

        // 描述验证（可选）
        if (isset($data['description']) && strlen(trim($data['description'])) > 1000) {
            $errors['description'] = '功能描述不能超过1000个字符';
        }

        // 优先级验证
        if (isset($data['priority']) && !in_array($data['priority'], ['high', 'medium', 'low'])) {
            $errors['priority'] = '优先级必须是 high、medium 或 low';
        }

        // 状态验证
        if (isset($data['status']) && !in_array($data['status'], ['active', 'inactive', 'deprecated'])) {
            $errors['status'] = '状态必须是 active、inactive 或 deprecated';
        }

        return empty($errors) ? true : $errors;
    }
}