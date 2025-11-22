<?php

namespace App\Controllers;

use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use PDO;
use PDOException;
use App\Config\Database;

class ProductRequirementController
{
    private $db;
    private $productModel;
    private $table = 'product_requirements';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->productModel = new Product();
    }

    /**
     * 获取产品需求列表
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

            // 验证用户权限
            if (!$this->checkProductOwnership($productId, $userId)) {
                return Response::error('无权限访问此产品', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;
            $offset = ($page - 1) * $limit;
            $priority = isset($_GET['priority']) ? $_GET['priority'] : null;
            $status = isset($_GET['status']) ? $_GET['status'] : null;
            $sourceType = isset($_GET['source_type']) ? $_GET['source_type'] : null;
            $search = isset($_GET['search']) ? trim($_GET['search']) : null;

            // 构建查询条件
            $whereConditions = ['product_id = :product_id', 'deleted_at IS NULL'];
            $params = [':product_id' => $productId];

            if ($priority && in_array($priority, ['high', 'medium', 'low'])) {
                $whereConditions[] = 'priority = :priority';
                $params[':priority'] = $priority;
            }

            if ($status && in_array($status, ['pending', 'in_progress', 'completed', 'cancelled'])) {
                $whereConditions[] = 'status = :status';
                $params[':status'] = $status;
            }

            if ($sourceType && in_array($sourceType, ['manual', 'analysis', 'feedback', 'research'])) {
                $whereConditions[] = 'source_type = :source_type';
                $params[':source_type'] = $sourceType;
            }

            if ($search) {
                $whereConditions[] = '(title LIKE :search OR description LIKE :search)';
                $params[':search'] = '%' . $search . '%';
            }

            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

            // 获取需求总数
            $countSql = "SELECT COUNT(*) as total FROM {$this->table} {$whereClause}";
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 获取需求列表（包含来源分析信息）
            $sql = "SELECT pr.*, ca.title as analysis_title 
                    FROM {$this->table} pr 
                    LEFT JOIN competitor_analyses ca ON pr.source_analysis_id = ca.id 
                    {$whereClause} 
                    ORDER BY 
                        CASE pr.priority 
                            WHEN 'high' THEN 1 
                            WHEN 'medium' THEN 2 
                            WHEN 'low' THEN 3 
                        END, 
                        pr.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return Response::success([
                'requirements' => $requirements,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ], '获取产品需求列表成功');
        } catch (\Exception $e) {
            error_log('Get product requirements error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个产品需求详情
     */
    public function show($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证需求ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的需求ID', 400);
            }

            // 获取需求信息
            $requirement = $this->getRequirementById($id);
            if (!$requirement) {
                return Response::error('需求不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkProductOwnership($requirement['product_id'], $userId)) {
                return Response::error('无权限访问此需求', 403);
            }

            return Response::success($requirement, '获取需求详情成功');
        } catch (\Exception $e) {
            error_log('Get product requirement error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建产品需求
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

            // 验证用户权限
            if (!$this->checkProductOwnership($productId, $userId)) {
                return Response::error('无权限访问此产品', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateRequirementData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 验证来源分析ID（如果提供）
            if (isset($input['source_analysis_id']) && $input['source_analysis_id']) {
                if (!$this->validateSourceAnalysis($input['source_analysis_id'], $productId)) {
                    return Response::error('无效的来源分析', 400);
                }
            }

            // 准备数据
            $requirementData = [
                'product_id' => $productId,
                'title' => trim($input['title']),
                'description' => isset($input['description']) ? trim($input['description']) : null,
                'priority' => $input['priority'],
                'status' => isset($input['status']) ? $input['status'] : 'pending',
                'source_type' => isset($input['source_type']) ? $input['source_type'] : 'manual',
                'source_analysis_id' => isset($input['source_analysis_id']) ? $input['source_analysis_id'] : null,
                'estimated_effort' => isset($input['estimated_effort']) ? $input['estimated_effort'] : null,
                'business_value' => isset($input['business_value']) ? trim($input['business_value']) : null,
                'acceptance_criteria' => isset($input['acceptance_criteria']) ? trim($input['acceptance_criteria']) : null
            ];

            // 插入需求
            $sql = "INSERT INTO {$this->table} (product_id, title, description, priority, status, source_type, source_analysis_id, estimated_effort, business_value, acceptance_criteria, created_at, updated_at) 
                    VALUES (:product_id, :title, :description, :priority, :status, :source_type, :source_analysis_id, :estimated_effort, :business_value, :acceptance_criteria, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            foreach ($requirementData as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            if ($stmt->execute()) {
                $requirementId = $this->db->lastInsertId();
                $requirement = $this->getRequirementById($requirementId);
                return Response::success($requirement, '需求创建成功', 201);
            }
            
            return Response::error('创建需求失败');
        } catch (\Exception $e) {
            error_log('Create product requirement error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新产品需求
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证需求ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的需求ID', 400);
            }

            // 获取需求信息
            $requirement = $this->getRequirementById($id);
            if (!$requirement) {
                return Response::error('需求不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkProductOwnership($requirement['product_id'], $userId)) {
                return Response::error('无权限编辑此需求', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateRequirementData($input, false);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 验证来源分析ID（如果提供）
            if (isset($input['source_analysis_id']) && $input['source_analysis_id']) {
                if (!$this->validateSourceAnalysis($input['source_analysis_id'], $requirement['product_id'])) {
                    return Response::error('无效的来源分析', 400);
                }
            }

            // 准备更新数据
            $updateFields = [];
            $params = [':id' => $id];

            $allowedFields = ['title', 'description', 'priority', 'status', 'source_type', 'source_analysis_id', 'estimated_effort', 'business_value', 'acceptance_criteria'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "{$field} = :{$field}";
                    $params[":$field"] = is_string($input[$field]) ? trim($input[$field]) : $input[$field];
                }
            }

            if (empty($updateFields)) {
                return Response::error('没有需要更新的数据', 400);
            }

            $updateFields[] = "updated_at = datetime('now')";

            // 更新需求
            $sql = "UPDATE {$this->table} SET " . implode(', ', $updateFields) . " WHERE id = :id AND deleted_at IS NULL";
            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            if ($stmt->execute()) {
                $updatedRequirement = $this->getRequirementById($id);
                return Response::success($updatedRequirement, '需求更新成功');
            }
            
            return Response::error('更新需求失败');
        } catch (\Exception $e) {
            error_log('Update product requirement error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除产品需求
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证需求ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的需求ID', 400);
            }

            // 获取需求信息
            $requirement = $this->getRequirementById($id);
            if (!$requirement) {
                return Response::error('需求不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkProductOwnership($requirement['product_id'], $userId)) {
                return Response::error('无权限删除此需求', 403);
            }

            // 软删除需求
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                return Response::success(null, '需求删除成功');
            }
            
            return Response::error('删除需求失败');
        } catch (\Exception $e) {
            error_log('Delete product requirement error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 批量删除产品需求
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

            // 验证用户权限
            if (!$this->checkProductOwnership($productId, $userId)) {
                return Response::error('无权限访问此产品', 403);
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
                return Response::error('没有有效的需求ID', 400);
            }

            // 验证所有需求都属于指定产品
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE id IN ({$placeholders}) AND product_id = ? AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge($ids, [$productId]));
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] != count($ids)) {
                return Response::error('部分需求不存在或不属于此产品', 400);
            }

            // 批量软删除
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') 
                    WHERE id IN ({$placeholders}) AND product_id = ?";
            
            $stmt = $this->db->prepare($sql);
            if ($stmt->execute(array_merge($ids, [$productId]))) {
                return Response::success(null, '批量删除需求成功');
            }
            
            return Response::error('批量删除需求失败');
        } catch (\Exception $e) {
            error_log('Batch delete product requirements error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 根据分析生成需求
     */
    public function generateFromAnalysis($analysisId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证分析ID
            if (!is_numeric($analysisId) || $analysisId <= 0) {
                return Response::error('无效的分析ID', 400);
            }

            // 获取分析信息
            $analysis = $this->getAnalysisById($analysisId);
            if (!$analysis) {
                return Response::error('分析不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkAnalysisOwnership($analysisId, $userId)) {
                return Response::error('无权限访问此分析', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateRequirementData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 准备需求数据
            $requirementData = [
                'product_id' => $analysis['product_id'],
                'title' => trim($input['title']),
                'description' => isset($input['description']) ? trim($input['description']) : null,
                'priority' => $input['priority'],
                'status' => 'pending',
                'source_type' => 'analysis',
                'source_analysis_id' => $analysisId,
                'estimated_effort' => isset($input['estimated_effort']) ? $input['estimated_effort'] : null,
                'business_value' => isset($input['business_value']) ? trim($input['business_value']) : null,
                'acceptance_criteria' => isset($input['acceptance_criteria']) ? trim($input['acceptance_criteria']) : null
            ];

            // 插入需求
            $sql = "INSERT INTO {$this->table} (product_id, title, description, priority, status, source_type, source_analysis_id, estimated_effort, business_value, acceptance_criteria, created_at, updated_at) 
                    VALUES (:product_id, :title, :description, :priority, :status, :source_type, :source_analysis_id, :estimated_effort, :business_value, :acceptance_criteria, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            foreach ($requirementData as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            if ($stmt->execute()) {
                $requirementId = $this->db->lastInsertId();
                $requirement = $this->getRequirementById($requirementId);
                return Response::success($requirement, '从分析生成需求成功', 201);
            }
            
            return Response::error('生成需求失败');
        } catch (\Exception $e) {
            error_log('Generate requirement from analysis error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 根据ID获取需求
     */
    private function getRequirementById($id)
    {
        try {
            $sql = "SELECT pr.*, ca.title as analysis_title 
                    FROM {$this->table} pr 
                    LEFT JOIN competitor_analyses ca ON pr.source_analysis_id = ca.id 
                    WHERE pr.id = :id AND pr.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            error_log('Get requirement by id error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据ID获取分析
     */
    private function getAnalysisById($id)
    {
        try {
            $sql = "SELECT ca.*, c.product_id 
                    FROM competitor_analyses ca 
                    INNER JOIN competitors c ON ca.competitor_id = c.id 
                    WHERE ca.id = :id AND ca.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            error_log('Get analysis by id error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查产品所有权
     */
    private function checkProductOwnership($productId, $userId)
    {
        try {
            $sql = "SELECT COUNT(*) as count FROM user_products 
                    WHERE product_id = :product_id AND user_id = :user_id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (\Exception $e) {
            error_log('Check product ownership error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查分析所有权
     */
    private function checkAnalysisOwnership($analysisId, $userId)
    {
        try {
            $sql = "SELECT ca.id FROM competitor_analyses ca 
                    INNER JOIN competitors c ON ca.competitor_id = c.id 
                    INNER JOIN user_products up ON c.product_id = up.product_id 
                    WHERE ca.id = :analysis_id AND up.user_id = :user_id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':analysis_id', $analysisId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (\Exception $e) {
            error_log('Check analysis ownership error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 验证来源分析
     */
    private function validateSourceAnalysis($analysisId, $productId)
    {
        try {
            $sql = "SELECT ca.id FROM competitor_analyses ca 
                    INNER JOIN competitors c ON ca.competitor_id = c.id 
                    WHERE ca.id = :analysis_id AND c.product_id = :product_id AND ca.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':analysis_id', $analysisId);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (\Exception $e) {
            error_log('Validate source analysis error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 验证需求数据
     */
    private function validateRequirementData($data, $requireTitle = true)
    {
        $errors = [];

        // 标题验证
        if ($requireTitle) {
            if (!isset($data['title']) || empty(trim($data['title']))) {
                $errors['title'] = '需求标题不能为空';
            }
        }
        
        if (isset($data['title']) && strlen(trim($data['title'])) > 200) {
            $errors['title'] = '需求标题不能超过200个字符';
        }

        // 描述验证（可选）
        if (isset($data['description']) && strlen(trim($data['description'])) > 2000) {
            $errors['description'] = '需求描述不能超过2000个字符';
        }

        // 优先级验证
        if (isset($data['priority']) && !in_array($data['priority'], ['high', 'medium', 'low'])) {
            $errors['priority'] = '优先级必须是 high、medium 或 low';
        }

        // 状态验证
        if (isset($data['status']) && !in_array($data['status'], ['pending', 'in_progress', 'completed', 'cancelled'])) {
            $errors['status'] = '状态必须是 pending、in_progress、completed 或 cancelled';
        }

        // 来源类型验证
        if (isset($data['source_type']) && !in_array($data['source_type'], ['manual', 'analysis', 'feedback', 'research'])) {
            $errors['source_type'] = '来源类型必须是 manual、analysis、feedback 或 research';
        }

        // 预估工作量验证
        if (isset($data['estimated_effort']) && (!is_numeric($data['estimated_effort']) || $data['estimated_effort'] < 0)) {
            $errors['estimated_effort'] = '预估工作量必须是非负数';
        }

        // 商业价值验证（可选）
        if (isset($data['business_value']) && strlen(trim($data['business_value'])) > 1000) {
            $errors['business_value'] = '商业价值描述不能超过1000个字符';
        }

        // 验收标准验证（可选）
        if (isset($data['acceptance_criteria']) && strlen(trim($data['acceptance_criteria'])) > 2000) {
            $errors['acceptance_criteria'] = '验收标准不能超过2000个字符';
        }

        return empty($errors) ? true : $errors;
    }
}