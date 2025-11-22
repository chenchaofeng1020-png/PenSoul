<?php

namespace App\Controllers;

use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Models\Product;
use App\Models\RoadmapItem;

class RoadmapExportController
{
    private $productModel;
    private $roadmapItemModel;

    public function __construct()
    {
        $this->productModel = new Product();
        $this->roadmapItemModel = new RoadmapItem();
    }

    /**
     * 导出路线图为PDF
     */
    public function exportPDF($productId)
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

            // 获取产品信息
            $product = $this->productModel->findById($productId);
            if (!$product) {
                return Response::error('产品不存在', 404);
            }

            // 获取路线图项目
            $items = $this->roadmapItemModel->findByProductId($productId);

            // 生成PDF内容
            $pdfContent = $this->generatePDFContent($product, $items);
            
            // 生成文件名
            $filename = $product['name'] . '_roadmap_' . date('Y-m-d') . '.pdf';
            $filepath = 'uploads/exports/' . $filename;
            
            // 确保目录存在
            $uploadDir = dirname($filepath);
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // 保存PDF文件
            file_put_contents($filepath, $pdfContent);

            return Response::success([
                'download_url' => 'http://localhost:8000/' . $filepath,
                'filename' => $filename
            ], '导出PDF成功');

        } catch (\Exception $e) {
            error_log('PDF导出失败: ' . $e->getMessage());
            return Response::error('导出失败', 500);
        }
    }

    /**
     * 生成PDF内容（简化版本，实际应使用PDF库）
     */
    private function generatePDFContent($product, $items)
    {
        // 这里应该使用专业的PDF生成库如TCPDF或FPDF
        // 为了演示，我们生成一个简单的HTML内容
        $html = $this->generateHTMLContent($product, $items);
        
        // 简化版本：返回HTML内容作为"PDF"
        // 实际项目中应该使用PDF库将HTML转换为真正的PDF
        return $html;
    }

    /**
     * 生成HTML内容
     */
    private function generateHTMLContent($product, $items)
    {
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>' . htmlspecialchars($product['name']) . ' - 产品路线图</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .product-name { font-size: 24px; font-weight: bold; color: #333; }
        .export-date { color: #666; margin-top: 10px; }
        .roadmap-item { 
            border: 1px solid #ddd; 
            margin: 15px 0; 
            padding: 15px; 
            border-radius: 5px; 
        }
        .item-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .item-meta { display: flex; gap: 20px; margin-bottom: 10px; }
        .meta-item { font-size: 14px; color: #666; }
        .item-description { margin-top: 10px; line-height: 1.5; }
        .status-planned { background-color: #e3f2fd; }
        .status-in_progress { background-color: #fff3e0; }
        .status-completed { background-color: #e8f5e8; }
        .status-cancelled { background-color: #ffebee; }
    </style>
</head>
<body>
    <div class="header">
        <div class="product-name">' . htmlspecialchars($product['name']) . ' - 产品路线图</div>
        <div class="export-date">导出时间: ' . date('Y-m-d H:i:s') . '</div>
    </div>';

        if (empty($items)) {
            $html .= '<p>暂无路线图项目</p>';
        } else {
            foreach ($items as $item) {
                $statusClass = 'status-' . str_replace(' ', '_', $item['status']);
                $html .= '
    <div class="roadmap-item ' . $statusClass . '">
        <div class="item-title">' . htmlspecialchars($item['title']) . '</div>
        <div class="item-meta">
            <div class="meta-item"><strong>类型:</strong> ' . htmlspecialchars($item['type']) . '</div>
            <div class="meta-item"><strong>状态:</strong> ' . htmlspecialchars($item['status']) . '</div>
            <div class="meta-item"><strong>优先级:</strong> ' . htmlspecialchars($item['priority']) . '</div>
            <div class="meta-item"><strong>进度:</strong> ' . $item['progress'] . '%</div>
        </div>
        <div class="item-meta">
            <div class="meta-item"><strong>开始时间:</strong> ' . ($item['start_date'] ?: '未设置') . '</div>
            <div class="meta-item"><strong>结束时间:</strong> ' . ($item['end_date'] ?: '未设置') . '</div>
            <div class="meta-item"><strong>负责人:</strong> ' . htmlspecialchars($item['owner_name'] ?: '未分配') . '</div>
        </div>';
                
                if (!empty($item['description'])) {
                    $html .= '<div class="item-description"><strong>描述:</strong> ' . nl2br(htmlspecialchars($item['description'])) . '</div>';
                }
                
                $html .= '</div>';
            }
        }

        $html .= '
</body>
</html>';

        return $html;
    }
}