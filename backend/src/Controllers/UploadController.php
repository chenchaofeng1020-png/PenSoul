<?php

namespace App\Controllers;

use App\Utils\Response;
use App\Middleware\AuthMiddleware;

class UploadController
{
    private $uploadDir;
    private $allowedTypes;
    private $maxFileSize;

    public function __construct()
    {
        // 上传目录
        $this->uploadDir = dirname(__DIR__, 2) . '/public/uploads/';
        
        // 允许的文件类型
        $this->allowedTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ];
        
        // 最大文件大小 (5MB)
        $this->maxFileSize = 5 * 1024 * 1024;
        
        // 确保上传目录存在
        $this->ensureUploadDir();
    }

    /**
     * 上传Logo文件
     */
    public function uploadLogo()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 检查是否有文件上传
            if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
                return Response::error('请选择要上传的Logo文件', 400);
            }

            $file = $_FILES['logo'];
            
            // 验证文件
            $validation = $this->validateFile($file);
            if ($validation !== true) {
                return Response::error('文件验证失败', 400, $validation);
            }

            // 生成唯一文件名
            $fileName = $this->generateFileName($file['name']);
            $filePath = $this->uploadDir . $fileName;
            
            // 移动文件到上传目录
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                return Response::error('文件上传失败');
            }

            // 生成访问URL
            $fileUrl = $this->generateFileUrl($fileName);
            
            // 返回文件信息
            $fileInfo = [
                'filename' => $fileName,
                'original_name' => $file['name'],
                'url' => $fileUrl,
                'size' => $file['size'],
                'type' => $file['type'],
                'uploaded_at' => date('Y-m-d H:i:s')
            ];

            return Response::success('Logo上传成功', $fileInfo, 201);
        } catch (\Exception $e) {
            error_log('Upload logo error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 上传通用图片文件
     */
    public function uploadImage()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 检查是否有文件上传
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                return Response::error('请选择要上传的图片文件', 400);
            }

            $file = $_FILES['image'];
            
            // 验证文件
            $validation = $this->validateFile($file);
            if ($validation !== true) {
                return Response::error('文件验证失败', 400, $validation);
            }

            // 生成唯一文件名
            $fileName = $this->generateFileName($file['name']);
            $filePath = $this->uploadDir . $fileName;
            
            // 移动文件到上传目录
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                return Response::error('文件上传失败');
            }

            // 生成访问URL
            $fileUrl = $this->generateFileUrl($fileName);
            
            // 返回文件信息
            $fileInfo = [
                'filename' => $fileName,
                'original_name' => $file['name'],
                'url' => $fileUrl,
                'size' => $file['size'],
                'type' => $file['type'],
                'uploaded_at' => date('Y-m-d H:i:s')
            ];

            return Response::success('图片上传成功', $fileInfo, 201);
        } catch (\Exception $e) {
            error_log('Upload image error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 删除上传的文件
     */
    public function deleteFile()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['filename'])) {
                return Response::error('请提供文件名', 400);
            }

            $filename = basename($input['filename']); // 防止路径遍历攻击
            $filePath = $this->uploadDir . $filename;
            
            // 检查文件是否存在
            if (!file_exists($filePath)) {
                return Response::error('文件不存在', 404);
            }

            // 删除文件
            if (!unlink($filePath)) {
                return Response::error('删除文件失败');
            }

            return Response::success('文件删除成功');
        } catch (\Exception $e) {
            error_log('Delete file error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取上传配置信息
     */
    public function getUploadConfig()
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            $config = [
                'max_file_size' => $this->maxFileSize,
                'max_file_size_mb' => round($this->maxFileSize / (1024 * 1024), 2),
                'allowed_types' => $this->allowedTypes,
                'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
                'upload_url' => '/api/upload/logo'
            ];

            return Response::success('获取上传配置成功', $config);
        } catch (\Exception $e) {
            error_log('Get upload config error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 验证上传文件
     */
    private function validateFile($file)
    {
        $errors = [];

        // 检查文件大小
        if ($file['size'] > $this->maxFileSize) {
            $maxSizeMB = round($this->maxFileSize / (1024 * 1024), 2);
            $errors['size'] = "文件大小不能超过 {$maxSizeMB}MB";
        }

        // 检查文件类型
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $this->allowedTypes)) {
            $errors['type'] = '不支持的文件类型，请上传 JPG、PNG、GIF、WebP 或 SVG 格式的图片';
        }

        // 检查文件扩展名
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        
        if (!in_array($extension, $allowedExtensions)) {
            $errors['extension'] = '不支持的文件扩展名';
        }

        // 对于图片文件，进行额外验证
        if (in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
            $imageInfo = getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                $errors['image'] = '无效的图片文件';
            } else {
                // 检查图片尺寸（可选）
                $maxWidth = 2000;
                $maxHeight = 2000;
                
                if ($imageInfo[0] > $maxWidth || $imageInfo[1] > $maxHeight) {
                    $errors['dimensions'] = "图片尺寸不能超过 {$maxWidth}x{$maxHeight} 像素";
                }
            }
        }

        return empty($errors) ? true : $errors;
    }

    /**
     * 生成唯一文件名
     */
    private function generateFileName($originalName)
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $timestamp = time();
        $random = bin2hex(random_bytes(8));
        
        return "logo_{$timestamp}_{$random}.{$extension}";
    }

    /**
     * 生成文件访问URL
     */
    private function generateFileUrl($filename)
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        
        return "{$protocol}://{$host}/uploads/{$filename}";
    }

    /**
     * 确保上传目录存在
     */
    private function ensureUploadDir()
    {
        if (!is_dir($this->uploadDir)) {
            if (!mkdir($this->uploadDir, 0755, true)) {
                throw new \Exception('无法创建上传目录');
            }
        }

        // 创建 .htaccess 文件保护上传目录
        $htaccessPath = $this->uploadDir . '.htaccess';
        if (!file_exists($htaccessPath)) {
            $htaccessContent = "# 允许图片文件访问\n";
            $htaccessContent .= "<FilesMatch \"\\.(jpg|jpeg|png|gif|webp|svg)$\">\n";
            $htaccessContent .= "    Order allow,deny\n";
            $htaccessContent .= "    Allow from all\n";
            $htaccessContent .= "</FilesMatch>\n\n";
            $htaccessContent .= "# 禁止执行PHP文件\n";
            $htaccessContent .= "<FilesMatch \"\\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$\">\n";
            $htaccessContent .= "    Order deny,allow\n";
            $htaccessContent .= "    Deny from all\n";
            $htaccessContent .= "</FilesMatch>";
            
            file_put_contents($htaccessPath, $htaccessContent);
        }
    }
}