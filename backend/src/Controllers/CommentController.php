<?php

namespace App\Controllers;

use App\Models\Competitor;
use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use PDO;
use PDOException;
use App\Config\Database;

class CommentController
{
    private $db;
    private $competitorModel;
    private $productModel;
    private $table = 'comments';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->competitorModel = new Competitor();
        $this->productModel = new Product();
    }

    /**
     * 获取评论列表
     */
    public function index($targetType, $targetId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证目标类型和ID
            if (!in_array($targetType, ['competitor', 'analysis', 'requirement']) || !is_numeric($targetId) || $targetId <= 0) {
                return Response::error('无效的参数', 400);
            }

            // 验证用户权限（根据目标类型）
            if (!$this->checkUserPermission($targetType, $targetId, $userId)) {
                return Response::error('无权限访问', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;
            $offset = ($page - 1) * $limit;

            // 获取评论总数
            $countSql = "SELECT COUNT(*) as total FROM {$this->table} 
                        WHERE target_type = :target_type AND target_id = :target_id AND deleted_at IS NULL";
            $countStmt = $this->db->prepare($countSql);
            $countStmt->bindParam(':target_type', $targetType);
            $countStmt->bindParam(':target_id', $targetId);
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 获取评论列表（包含用户信息）
            $sql = "SELECT c.*, u.username, u.full_name, u.avatar 
                    FROM {$this->table} c 
                    LEFT JOIN users u ON c.author_id = u.id 
                    WHERE c.target_type = :target_type AND c.target_id = :target_id AND c.deleted_at IS NULL 
                    ORDER BY c.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':target_type', $targetType);
            $stmt->bindParam(':target_id', $targetId);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 处理评论数据，解析附件JSON
            foreach ($comments as &$comment) {
                $comment['attachments'] = $this->parseJsonField($comment['attachments']);
                
                // 获取回复
                if ($comment['parent_id'] === null) {
                    $comment['replies'] = $this->getReplies($comment['id']);
                }
            }

            // 过滤掉回复，只返回顶级评论
            $topLevelComments = array_filter($comments, function($comment) {
                return $comment['parent_id'] === null;
            });

            return Response::success([
                'comments' => array_values($topLevelComments),
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ], '获取评论列表成功');
        } catch (\Exception $e) {
            error_log('Get comments error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 创建评论
     */
    public function store($targetType, $targetId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证目标类型和ID
            if (!in_array($targetType, ['competitor', 'analysis', 'requirement']) || !is_numeric($targetId) || $targetId <= 0) {
                return Response::error('无效的参数', 400);
            }

            // 验证用户权限
            if (!$this->checkUserPermission($targetType, $targetId, $userId)) {
                return Response::error('无权限访问', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateCommentData($input);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 如果是回复，验证父评论
            $parentId = null;
            if (isset($input['parent_id']) && $input['parent_id']) {
                $parentId = intval($input['parent_id']);
                if (!$this->validateParentComment($parentId, $targetType, $targetId)) {
                    return Response::error('无效的父评论', 400);
                }
            }

            // 准备数据
            $commentData = [
                'target_type' => $targetType,
                'target_id' => $targetId,
                'parent_id' => $parentId,
                'content' => trim($input['content']),
                'attachments' => isset($input['attachments']) ? json_encode($input['attachments']) : null,
                'author_id' => $userId
            ];

            // 插入评论
            $sql = "INSERT INTO {$this->table} (target_type, target_id, parent_id, content, attachments, author_id, created_at, updated_at) 
                    VALUES (:target_type, :target_id, :parent_id, :content, :attachments, :author_id, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':target_type', $commentData['target_type']);
            $stmt->bindParam(':target_id', $commentData['target_id']);
            $stmt->bindParam(':parent_id', $commentData['parent_id']);
            $stmt->bindParam(':content', $commentData['content']);
            $stmt->bindParam(':attachments', $commentData['attachments']);
            $stmt->bindParam(':author_id', $commentData['author_id']);
            
            if ($stmt->execute()) {
                $commentId = $this->db->lastInsertId();
                $comment = $this->getCommentById($commentId);
                return Response::success($comment, '评论创建成功', 201);
            }
            
            return Response::error('创建评论失败');
        } catch (\Exception $e) {
            error_log('Create comment error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新评论
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证评论ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的评论ID', 400);
            }

            // 获取评论信息
            $comment = $this->getCommentById($id);
            if (!$comment) {
                return Response::error('评论不存在', 404);
            }

            // 检查权限（只能编辑自己的评论）
            if ($comment['author_id'] != $userId) {
                return Response::error('无权限编辑此评论', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateCommentData($input, false);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 更新评论
            $sql = "UPDATE {$this->table} SET content = :content, attachments = :attachments, updated_at = datetime('now') 
                    WHERE id = :id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':content', trim($input['content']));
            $attachments = isset($input['attachments']) ? json_encode($input['attachments']) : null;
            $stmt->bindParam(':attachments', $attachments);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                $updatedComment = $this->getCommentById($id);
                return Response::success($updatedComment, '评论更新成功');
            }
            
            return Response::error('更新评论失败');
        } catch (\Exception $e) {
            error_log('Update comment error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除评论
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证评论ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的评论ID', 400);
            }

            // 获取评论信息
            $comment = $this->getCommentById($id);
            if (!$comment) {
                return Response::error('评论不存在', 404);
            }

            // 检查权限（只能删除自己的评论）
            if ($comment['author_id'] != $userId) {
                return Response::error('无权限删除此评论', 403);
            }

            // 软删除评论
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                return Response::success(null, '评论删除成功');
            }
            
            return Response::error('删除评论失败');
        } catch (\Exception $e) {
            error_log('Delete comment error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取评论回复
     */
    private function getReplies($parentId)
    {
        try {
            $sql = "SELECT c.*, u.username, u.full_name, u.avatar 
                    FROM {$this->table} c 
                    LEFT JOIN users u ON c.author_id = u.id 
                    WHERE c.parent_id = :parent_id AND c.deleted_at IS NULL 
                    ORDER BY c.created_at ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':parent_id', $parentId);
            $stmt->execute();
            
            $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 处理回复数据
            foreach ($replies as &$reply) {
                $reply['attachments'] = $this->parseJsonField($reply['attachments']);
            }
            
            return $replies;
        } catch (\Exception $e) {
            error_log('Get replies error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * 根据ID获取评论
     */
    private function getCommentById($id)
    {
        try {
            $sql = "SELECT c.*, u.username, u.full_name, u.avatar 
                    FROM {$this->table} c 
                    LEFT JOIN users u ON c.author_id = u.id 
                    WHERE c.id = :id AND c.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($comment) {
                $comment['attachments'] = $this->parseJsonField($comment['attachments']);
            }
            
            return $comment;
        } catch (\Exception $e) {
            error_log('Get comment by id error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 验证父评论
     */
    private function validateParentComment($parentId, $targetType, $targetId)
    {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE id = :parent_id AND target_type = :target_type AND target_id = :target_id 
                    AND parent_id IS NULL AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':parent_id', $parentId);
            $stmt->bindParam(':target_type', $targetType);
            $stmt->bindParam(':target_id', $targetId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (\Exception $e) {
            error_log('Validate parent comment error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查用户权限
     */
    private function checkUserPermission($targetType, $targetId, $userId)
    {
        try {
            switch ($targetType) {
                case 'competitor':
                    // 检查竞品是否属于用户有权限的产品
                    $sql = "SELECT c.product_id FROM competitors c 
                            INNER JOIN user_products up ON c.product_id = up.product_id 
                            WHERE c.id = :target_id AND up.user_id = :user_id";
                    break;
                case 'analysis':
                    // 检查分析是否属于用户有权限的产品
                    $sql = "SELECT ca.competitor_id FROM competitor_analyses ca 
                            INNER JOIN competitors c ON ca.competitor_id = c.id 
                            INNER JOIN user_products up ON c.product_id = up.product_id 
                            WHERE ca.id = :target_id AND up.user_id = :user_id";
                    break;
                case 'requirement':
                    // 检查需求是否属于用户有权限的产品
                    $sql = "SELECT pr.product_id FROM product_requirements pr 
                            INNER JOIN user_products up ON pr.product_id = up.product_id 
                            WHERE pr.id = :target_id AND up.user_id = :user_id";
                    break;
                default:
                    return false;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':target_id', $targetId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (\Exception $e) {
            error_log('Check user permission error: ' . $e->getMessage());
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
     * 验证评论数据
     */
    private function validateCommentData($data, $requireContent = true)
    {
        $errors = [];

        // 内容验证
        if ($requireContent) {
            if (!isset($data['content']) || empty(trim($data['content']))) {
                $errors['content'] = '评论内容不能为空';
            }
        }
        
        if (isset($data['content']) && strlen(trim($data['content'])) > 2000) {
            $errors['content'] = '评论内容不能超过2000个字符';
        }

        // 附件验证（可选）
        if (isset($data['attachments']) && !is_array($data['attachments'])) {
            $errors['attachments'] = '附件格式无效';
        }

        return empty($errors) ? true : $errors;
    }
}