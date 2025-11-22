<?php

namespace App\Controllers;

use App\Models\Competitor;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use PDO;
use PDOException;
use App\Config\Database;

class DocumentController
{
    private $db;
    private $competitorModel;
    private $table = 'documents';
    private $uploadPath = 'uploads/documents/';
    private $maxFileSize = 104857600; // 100MB

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->competitorModel = new Competitor();
        
        // 确保上传目录存在
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    /**
     * 获取文档列表
     */
    public function index($competitorId = null)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;
            $offset = ($page - 1) * $limit;
            $category = isset($_GET['category']) ? $_GET['category'] : null;
            $search = isset($_GET['search']) ? trim($_GET['search']) : null;
            $isPublic = isset($_GET['is_public']) ? $_GET['is_public'] : null;

            // 构建查询条件
            $whereConditions = ['d.deleted_at IS NULL'];
            $params = [];

            // 如果指定了竞品ID，验证权限并添加条件
            if ($competitorId) {
                if (!is_numeric($competitorId) || $competitorId <= 0) {
                    return Response::error('无效的竞品ID', 400);
                }

                if (!$this->checkCompetitorOwnership($competitorId, $userId)) {
                    return Response::error('无权限访问此竞品', 403);
                }

                $whereConditions[] = 'd.competitor_id = :competitor_id';
                $params[':competitor_id'] = $competitorId;
            } else {
                // 如果没有指定竞品ID，只显示用户有权限的文档
                $whereConditions[] = 'EXISTS (SELECT 1 FROM competitors c INNER JOIN user_products up ON c.product_id = up.product_id WHERE c.id = d.competitor_id AND up.user_id = :user_id AND c.deleted_at IS NULL)';
                $params[':user_id'] = $userId;
            }

            if ($category && in_array($category, ['requirement', 'design', 'analysis', 'other'])) {
                $whereConditions[] = 'd.category = :category';
                $params[':category'] = $category;
            }

            if ($search) {
                $whereConditions[] = '(d.title LIKE :search OR d.description LIKE :search)';
                $params[':search'] = '%' . $search . '%';
            }

            if ($isPublic !== null) {
                $whereConditions[] = 'd.is_public = :is_public';
                $params[':is_public'] = $isPublic ? 1 : 0;
            }

            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

            // 获取文档总数
            $countSql = "SELECT COUNT(*) as total FROM {$this->table} d {$whereClause}";
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 获取文档列表
            $sql = "SELECT d.*, c.name as competitor_name, u.username, u.full_name 
                    FROM {$this->table} d 
                    LEFT JOIN competitors c ON d.competitor_id = c.id 
                    LEFT JOIN users u ON d.uploaded_by = u.id 
                    {$whereClause} 
                    ORDER BY d.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 处理文档数据
            foreach ($documents as &$document) {
                $document['file_size_formatted'] = $this->formatFileSize($document['file_size']);
                $document['download_url'] = '/api/documents/' . $document['id'] . '/download';
            }

            return Response::success([
                'documents' => $documents,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ], '获取文档列表成功');
        } catch (\Exception $e) {
            error_log('Get documents error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取单个文档详情
     */
    public function show($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证文档ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的文档ID', 400);
            }

            // 获取文档信息
            $document = $this->getDocumentById($id);
            if (!$document) {
                return Response::error('文档不存在', 404);
            }

            // 验证用户权限（公开文档或用户有权限的文档）
            if (!$document['is_public'] && !$this->checkCompetitorOwnership($document['competitor_id'], $userId)) {
                return Response::error('无权限访问此文档', 403);
            }

            return Response::success($document, '获取文档详情成功');
        } catch (\Exception $e) {
            error_log('Get document error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 上传文档
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

            // 检查文件上传
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                return Response::error('文件上传失败', 400);
            }

            $file = $_FILES['file'];

            // 验证文件大小
            if ($file['size'] > $this->maxFileSize) {
                return Response::error('文件大小不能超过100MB', 400);
            }

            // 验证文件类型
            $allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/zip',
                'application/x-rar-compressed'
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $allowedTypes)) {
                return Response::error('不支持的文件类型', 400);
            }

            // 获取其他表单数据
            $title = isset($_POST['title']) ? trim($_POST['title']) : '';
            $description = isset($_POST['description']) ? trim($_POST['description']) : '';
            $category = isset($_POST['category']) ? $_POST['category'] : 'other';
            $isPublic = isset($_POST['is_public']) ? (bool)$_POST['is_public'] : false;

            // 数据验证
            $validation = $this->validateDocumentData([
                'title' => $title,
                'description' => $description,
                'category' => $category
            ]);
            if ($validation !== true) {
                return Response::error('数据验证失败', 400, $validation);
            }

            // 生成唯一文件名
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = uniqid() . '_' . time() . '.' . $extension;
            $filePath = $this->uploadPath . $fileName;

            // 移动上传文件
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                return Response::error('文件保存失败', 500);
            }

            // 准备数据
            $documentData = [
                'competitor_id' => $competitorId,
                'title' => $title ?: $file['name'],
                'description' => $description,
                'category' => $category,
                'file_name' => $file['name'],
                'file_path' => $fileName,
                'file_size' => $file['size'],
                'mime_type' => $mimeType,
                'is_public' => $isPublic ? 1 : 0,
                'uploaded_by' => $userId
            ];

            // 插入文档记录
            $sql = "INSERT INTO {$this->table} (competitor_id, title, description, category, file_name, file_path, file_size, mime_type, is_public, uploaded_by, created_at, updated_at) 
                    VALUES (:competitor_id, :title, :description, :category, :file_name, :file_path, :file_size, :mime_type, :is_public, :uploaded_by, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            foreach ($documentData as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            if ($stmt->execute()) {
                $documentId = $this->db->lastInsertId();
                $document = $this->getDocumentById($documentId);
                return Response::success($document, '文档上传成功', 201);
            }
            
            // 如果数据库插入失败，删除已上传的文件
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            return Response::error('文档上传失败');
        } catch (\Exception $e) {
            error_log('Upload document error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新文档信息
     */
    public function update($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证文档ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的文档ID', 400);
            }

            // 获取文档信息
            $document = $this->getDocumentById($id);
            if (!$document) {
                return Response::error('文档不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($document['competitor_id'], $userId)) {
                return Response::error('无权限编辑此文档', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 数据验证
            $validation = $this->validateDocumentData($input, false);
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

            if (isset($input['description'])) {
                $updateFields[] = 'description = :description';
                $params[':description'] = trim($input['description']);
            }

            if (isset($input['category'])) {
                $updateFields[] = 'category = :category';
                $params[':category'] = $input['category'];
            }

            if (isset($input['is_public'])) {
                $updateFields[] = 'is_public = :is_public';
                $params[':is_public'] = $input['is_public'] ? 1 : 0;
            }

            if (empty($updateFields)) {
                return Response::error('没有需要更新的数据', 400);
            }

            $updateFields[] = "updated_at = datetime('now')";

            // 更新文档
            $sql = "UPDATE {$this->table} SET " . implode(', ', $updateFields) . " WHERE id = :id AND deleted_at IS NULL";
            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            if ($stmt->execute()) {
                $updatedDocument = $this->getDocumentById($id);
                return Response::success($updatedDocument, '文档更新成功');
            }
            
            return Response::error('更新文档失败');
        } catch (\Exception $e) {
            error_log('Update document error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除文档
     */
    public function destroy($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证文档ID
            if (!is_numeric($id) || $id <= 0) {
                return Response::error('无效的文档ID', 400);
            }

            // 获取文档信息
            $document = $this->getDocumentById($id);
            if (!$document) {
                return Response::error('文档不存在', 404);
            }

            // 验证用户权限
            if (!$this->checkCompetitorOwnership($document['competitor_id'], $userId)) {
                return Response::error('无权限删除此文档', 403);
            }

            // 软删除文档
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                // 可选：删除物理文件（这里选择保留文件，只做软删除）
                // $filePath = $this->uploadPath . $document['file_path'];
                // if (file_exists($filePath)) {
                //     unlink($filePath);
                // }
                
                return Response::success(null, '文档删除成功');
            }
            
            return Response::error('删除文档失败');
        } catch (\Exception $e) {
            error_log('Delete document error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 下载文档
     */
    public function download($id)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                http_response_code(401);
                echo json_encode(['error' => '未授权访问']);
                return;
            }

            // 验证文档ID
            if (!is_numeric($id) || $id <= 0) {
                http_response_code(400);
                echo json_encode(['error' => '无效的文档ID']);
                return;
            }

            // 获取文档信息
            $document = $this->getDocumentById($id);
            if (!$document) {
                http_response_code(404);
                echo json_encode(['error' => '文档不存在']);
                return;
            }

            // 验证用户权限（公开文档或用户有权限的文档）
            if (!$document['is_public'] && !$this->checkCompetitorOwnership($document['competitor_id'], $userId)) {
                http_response_code(403);
                echo json_encode(['error' => '无权限下载此文档']);
                return;
            }

            $filePath = $this->uploadPath . $document['file_path'];
            if (!file_exists($filePath)) {
                http_response_code(404);
                echo json_encode(['error' => '文件不存在']);
                return;
            }

            // 设置下载头
            header('Content-Type: ' . $document['mime_type']);
            header('Content-Disposition: attachment; filename="' . $document['file_name'] . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');

            // 输出文件内容
            readfile($filePath);
            exit;
        } catch (\Exception $e) {
            error_log('Download document error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => '服务器内部错误']);
        }
    }

    /**
     * 根据ID获取文档
     */
    private function getDocumentById($id)
    {
        try {
            $sql = "SELECT d.*, c.name as competitor_name, u.username, u.full_name 
                    FROM {$this->table} d 
                    LEFT JOIN competitors c ON d.competitor_id = c.id 
                    LEFT JOIN users u ON d.uploaded_by = u.id 
                    WHERE d.id = :id AND d.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $document = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($document) {
                $document['file_size_formatted'] = $this->formatFileSize($document['file_size']);
                $document['download_url'] = '/api/documents/' . $document['id'] . '/download';
            }
            
            return $document;
        } catch (\Exception $e) {
            error_log('Get document by id error: ' . $e->getMessage());
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
     * 格式化文件大小
     */
    private function formatFileSize($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    /**
     * 验证文档数据
     */
    private function validateDocumentData($data, $requireTitle = true)
    {
        $errors = [];

        // 标题验证
        if ($requireTitle) {
            if (!isset($data['title']) || empty(trim($data['title']))) {
                $errors['title'] = '文档标题不能为空';
            }
        }
        
        if (isset($data['title']) && strlen(trim($data['title'])) > 200) {
            $errors['title'] = '文档标题不能超过200个字符';
        }

        // 描述验证（可选）
        if (isset($data['description']) && strlen(trim($data['description'])) > 1000) {
            $errors['description'] = '文档描述不能超过1000个字符';
        }

        // 分类验证
        if (isset($data['category']) && !in_array($data['category'], ['requirement', 'design', 'analysis', 'other'])) {
            $errors['category'] = '文档分类必须是 requirement、design、analysis 或 other';
        }

        return empty($errors) ? true : $errors;
    }
}