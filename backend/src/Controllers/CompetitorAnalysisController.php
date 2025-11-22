<?php

namespace App\Controllers;

use App\Models\Competitor;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use PDO;
use PDOException;
use App\Config\Database;

class CompetitorAnalysisController
{
    private $db;
    private $competitorModel;
    private $table = 'competitor_analyses';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->competitorModel = new Competitor();
    }

    /**
     * 获取竞品分析列表
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
            $analysisType = isset($_GET['analysis_type']) ? $_GET['analysis_type'] : null;
            $search = isset($_GET['search']) ? trim($_GET['search']) : null;

            // 构建查询条件
            $whereConditions = ['competitor_id = :competitor_id', 'deleted_at IS NULL'];
            $params = [':competitor_id' => $competitorId];

            if ($analysisType && in_array($analysisType, ['feature', 'ui_ux', 'pricing', 'marketing', 'technology', 'other'])) {
                $whereConditions[] = 'analysis_type = :analysis_type';
                $params[':analysis_type'] = $analysisType;
            }

            if ($search) {
                $whereConditions[] = '(title LIKE :search OR content LIKE :search)';
                $params[':search'] = '%' . $search . '%';
            }

            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

            // 获取分析总数
            $countSql = "SELECT COUNT(*) as total FROM {$this->table} {$whereClause}";
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 获取分析列表
            $sql = "SELECT ca.* 
                    FROM {$this->table} ca 
                    {$whereClause} 
                    ORDER BY ca.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $analyses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 处理分析数据，解析JSON字段
            foreach ($analyses as &$analysis) {
                // 安全解析 tags 字段
                $tagsStr = (is_array($analysis) && array_key_exists('tags', $analysis)) ? $analysis['tags'] : null;
                $analysis['tags'] = $this->parseJsonField($tagsStr);
                    
                    // 安全解析 attachments 字段（兼容旧数据无此字段的情况）
                    $attachmentsStr = (is_array($analysis) && array_key_exists('attachments', $analysis)) ? $analysis['attachments'] : null;
                    $analysis['attachments'] = $this->parseJsonField($attachmentsStr);
                    
                    // 兼容 visibility：将 is_public 映射为 visibility
                    if (isset($analysis['is_public'])) {
                        $analysis['visibility'] = $analysis['is_public'] ? 'public' : 'private';
                    }
            }

            return Response::success([
                'analyses' => $analyses,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ], '获取竞品分析列表成功');
        } catch (\Exception $e) {
            error_log('Get competitor analyses error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个竞品分析详情
     */
    public function show($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证分析ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的分析ID', 400);
            }

            // 获取分析信息
            $analysis = $this->getAnalysisById($id);
            if (!$analysis) {
                return Response::error('分析不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($analysis['competitor_id'], $userId)) {
                return Response::error('无权限访问此分析', 403);
            }

            return Response::success($analysis, '获取分析详情成功');
        } catch (\Exception $e) {
            error_log('Get competitor analysis error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建竞品分析
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
            $validation = $this->validateAnalysisData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 准备数据
            $analysisData = [
                'competitor_id' => $competitorId,
                'title' => trim($input['title']),
                'content' => trim($input['content']),
                'analysis_type' => $input['analysis_type'],
                'tags' => isset($input['tags']) ? json_encode($input['tags']) : null,
                // 新增：附件、评分、可见性
                'attachments' => isset($input['attachments']) ? json_encode($input['attachments']) : null,
                'rating' => isset($input['rating']) && is_numeric($input['rating']) ? intval($input['rating']) : null,
                'is_public' => (isset($input['visibility']) ? ($input['visibility'] === 'public' ? 1 : 0) : (isset($input['is_public']) ? (intval($input['is_public']) ? 1 : 0) : 0)),
                'author_id' => $userId
            ];

            // 插入分析（补充新列）
            $sql = "INSERT INTO {$this->table} (competitor_id, title, content, analysis_type, tags, attachments, rating, is_public, author_id, created_at, updated_at) 
                    VALUES (:competitor_id, :title, :content, :analysis_type, :tags, :attachments, :rating, :is_public, :author_id, datetime('now'), datetime('now'))";
            $stmt = $this->db->prepare($sql);
            foreach ($analysisData as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            if ($stmt->execute()) {
                $analysisId = $this->db->lastInsertId();
                $analysis = $this->getAnalysisById($analysisId);
                return Response::success($analysis, '分析创建成功', 201);
            }
            
            return Response::error('创建分析失败');
        } catch (\Exception $e) {
            error_log('Create competitor analysis error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新竞品分析
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证分析ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的分析ID', 400);
            }

            // 获取分析信息
            $analysis = $this->getAnalysisById($id);
            if (!$analysis) {
                return Response::error('分析不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($analysis['competitor_id'], $userId)) {
                return Response::error('无权限编辑此分析', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateAnalysisData($input, false);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 验证数据
            $validation = $this->validateAnalysisData($input, false);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 准备更新数据
            $updateFields = [];
            $params = [':id' => $id];

            if (isset($input['title'])) {
                $updateFields[] = 'title = :title';
                $params[':title'] = trim($input['title']);
            }

            if (isset($input['content'])) {
                $updateFields[] = 'content = :content';
                $params[':content'] = trim($input['content']);
            }

            if (isset($input['analysis_type'])) {
                $updateFields[] = 'analysis_type = :analysis_type';
                $params[':analysis_type'] = $input['analysis_type'];
            }

            if (isset($input['tags'])) {
                $updateFields[] = 'tags = :tags';
                $params[':tags'] = json_encode($input['tags']);
            }

            // 新增：支持更新附件
            if (isset($input['attachments'])) {
                $updateFields[] = 'attachments = :attachments';
                $params[':attachments'] = json_encode($input['attachments']);
            }
            // 新增：支持更新评分
            if (isset($input['rating']) && is_numeric($input['rating'])) {
                $updateFields[] = 'rating = :rating';
                $params[':rating'] = intval($input['rating']);
            }
            // 新增：支持更新可见性（visibility 或 is_public）
            if (isset($input['visibility'])) {
                $updateFields[] = 'is_public = :is_public';
                $params[':is_public'] = $input['visibility'] === 'public' ? 1 : 0;
            } elseif (isset($input['is_public'])) {
                $updateFields[] = 'is_public = :is_public';
                $params[':is_public'] = intval($input['is_public']) ? 1 : 0;
            }

            if (empty($updateFields)) {
                return Response::error('没有需要更新的数据', 400);
            }

            $updateFields[] = "updated_at = datetime('now')";

            // 更新分析
            $sql = "UPDATE {$this->table} SET " . implode(', ', $updateFields) . " WHERE id = :id AND deleted_at IS NULL";
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            if ($stmt->execute()) {
                $updatedAnalysis = $this->getAnalysisById($id);
                return Response::success($updatedAnalysis, '分析更新成功');
            }
            
            return Response::error('更新分析失败');
        } catch (\Exception $e) {
            error_log('Update competitor analysis error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除竞品分析
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证分析ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的分析ID', 400);
            }

            // 获取分析信息
            $analysis = $this->getAnalysisById($id);
            if (!$analysis) {
                return Response::error('分析不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($analysis['competitor_id'], $userId)) {
                return Response::error('无权限删除此分析', 403);
            }

            // 软删除分析
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                return Response::success(null, '分析删除成功');
            }
            
            return Response::error('删除分析失败');
        } catch (\Exception $e) {
            error_log('Delete competitor analysis error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 批量删除竞品分析
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
                return Response::error('没有有效的分析ID', 400);
            }

            // 验证所有分析都属于指定竞品
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE id IN ({$placeholders}) AND competitor_id = ? AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge($ids, [$competitorId]));
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] != count($ids)) {
                return Response::error('部分分析不存在或不属于此竞品', 400);
            }

            // 批量软删除
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') 
                    WHERE id IN ({$placeholders}) AND competitor_id = ?";
            
            $stmt = $this->db->prepare($sql);
            if ($stmt->execute(array_merge($ids, [$competitorId]))) {
                return Response::success(null, '批量删除分析成功');
            }
            
            return Response::error('批量删除分析失败');
        } catch (\Exception $e) {
            error_log('Batch delete competitor analyses error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 根据ID获取分析
     */
    private function getAnalysisById($id)
    {
        try {
            $sql = "SELECT ca.*, u.username, u.full_name 
                    FROM {$this->table} ca 
                    LEFT JOIN users u ON ca.author_id = u.id 
                    WHERE ca.id = :id AND ca.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $analysis = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($analysis) {
                // 安全解析 tags 字段
                $tagsStr = (is_array($analysis) && array_key_exists('tags', $analysis)) ? $analysis['tags'] : null;
                $analysis['tags'] = $this->parseJsonField($tagsStr);
                
                // 新增：安全解析附件字段
                $attachmentsStr = (is_array($analysis) && array_key_exists('attachments', $analysis)) ? $analysis['attachments'] : null;
                $analysis['attachments'] = $this->parseJsonField($attachmentsStr);
                
                // 兼容 visibility 映射
                if (isset($analysis['is_public'])) {
                    $analysis['visibility'] = $analysis['is_public'] ? 'public' : 'private';
                }
            }
            
            return $analysis;
        } catch (\Exception $e) {
            error_log('Get analysis by id error: ' . $e->getMessage());
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
     * 验证功能
     */
    private function validateFeature($featureId, $competitorId)
    {
        try {
            $sql = "SELECT COUNT(*) as count FROM competitor_features 
                    WHERE id = :feature_id AND competitor_id = :competitor_id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':feature_id', $featureId);
            $stmt->bindParam(':competitor_id', $competitorId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (\Exception $e) {
            error_log('Validate feature error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 解析JSON字段
     */
    private function parseJsonField($jsonString)
    {
        if (empty($jsonString)) {
            return [];
        }
        
        $decoded = json_decode($jsonString, true);
        return json_last_error() === JSON_ERROR_NONE && is_array($decoded) ? $decoded : [];
    }

    /**
     * 验证分析数据
     */
    private function validateAnalysisData($data, $requireTitle = true)
    {
        $errors = [];

        // 标题验证
        if ($requireTitle) {
            if (!isset($data['title']) || empty(trim($data['title']))) {
                $errors['title'] = '分析标题不能为空';
            }
        }
        
        if (isset($data['title']) && strlen(trim($data['title'])) > 200) {
            $errors['title'] = '分析标题不能超过200个字符';
        }

        // 内容验证
        if (isset($data['content'])) {
            if (empty(trim($data['content']))) {
                $errors['content'] = '分析内容不能为空';
            } elseif (strlen(trim($data['content'])) > 10000) {
                $errors['content'] = '分析内容不能超过10000个字符';
            }
        }

        // 分析类型验证
        if (isset($data['analysis_type']) && !in_array($data['analysis_type'], ['feature', 'ui_ux', 'pricing', 'marketing', 'technology', 'other'])) {
            $errors['analysis_type'] = '分析类型必须是 feature、ui_ux、pricing、marketing、technology 或 other';
        }

        // 标签验证（可选）
        if (isset($data['tags']) && !is_array($data['tags'])) {
            $errors['tags'] = '标签格式无效';
        }

        return empty($errors) ? true : $errors;
    }
}