<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

class RoadmapItem
{
    private $db;
    private $table = 'roadmap_items';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 创建路线图项目
     */
    public function create($data)
    {
        try {
            // 调试：记录要插入的数据
            error_log('RoadmapItem create data: ' . print_r($data, true));
            
            $sql = "INSERT INTO {$this->table} (product_id, title, description, type, status, priority, owner_id, start_date, end_date, progress, created_by, created_at, updated_at) 
                    VALUES (:product_id, :title, :description, :type, :status, :priority, :owner_id, :start_date, :end_date, :progress, :created_by, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $data['product_id']);
            $stmt->bindParam(':title', $data['title']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':type', $data['type']);
            $stmt->bindParam(':status', $data['status']);
            $stmt->bindParam(':priority', $data['priority']);
            $stmt->bindParam(':owner_id', $data['owner_id']);
            $stmt->bindParam(':start_date', $data['start_date']);
            $stmt->bindParam(':end_date', $data['end_date']);
            $stmt->bindParam(':progress', $data['progress']);
            $stmt->bindParam(':created_by', $data['created_by']);
            
            if ($stmt->execute()) {
                $itemId = $this->db->lastInsertId();
                
                // 如果有标签，创建关联
                if (!empty($data['tags'])) {
                    $this->attachTags($itemId, $data['tags']);
                }
                
                return $this->findById($itemId);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("RoadmapItem creation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据ID查找路线图项目
     */
    public function findById($id)
    {
        try {
            $sql = "SELECT ri.*, u.username as owner_name, u.full_name as owner_full_name 
                    FROM {$this->table} ri 
                    LEFT JOIN users u ON ri.owner_id = u.id 
                    WHERE ri.id = :id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($item) {
                // 获取标签
                $item['tags'] = $this->getItemTags($id);
            }
            
            return $item;
        } catch (PDOException $e) {
            error_log("RoadmapItem findById error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据产品ID获取路线图项目列表
     */
    public function findByProductId($productId, $filters = [])
    {
        try {
            $sql = "SELECT ri.*, u.username as owner_name, u.full_name as owner_full_name 
                    FROM {$this->table} ri 
                    LEFT JOIN users u ON ri.owner_id = u.id 
                    WHERE ri.product_id = :product_id";
            
            $params = [':product_id' => $productId];
            
            // 添加筛选条件
            if (!empty($filters['status'])) {
                $sql .= " AND ri.status = :status";
                $params[':status'] = $filters['status'];
            }
            
            if (!empty($filters['type'])) {
                $sql .= " AND ri.type = :type";
                $params[':type'] = $filters['type'];
            }
            
            if (!empty($filters['priority'])) {
                $sql .= " AND ri.priority = :priority";
                $params[':priority'] = $filters['priority'];
            }
            
            if (!empty($filters['owner_id'])) {
                $sql .= " AND ri.owner_id = :owner_id";
                $params[':owner_id'] = $filters['owner_id'];
            }
            
            // 搜索条件
            if (!empty($filters['search'])) {
                $sql .= " AND (ri.title LIKE :search OR ri.description LIKE :search)";
                $params[':search'] = '%' . $filters['search'] . '%';
            }
            
            // 排序
            $orderBy = $filters['order_by'] ?? 'created_at';
            $orderDir = $filters['order_dir'] ?? 'DESC';
            $sql .= " ORDER BY ri.{$orderBy} {$orderDir}";
            
            $stmt = $this->db->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 为每个项目获取标签
            foreach ($items as &$item) {
                $item['tags'] = $this->getItemTags($item['id']);
            }
            
            return $items;
        } catch (PDOException $e) {
            error_log("RoadmapItem findByProductId error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * 更新路线图项目
     */
    public function update($id, $data)
    {
        try {
            $sql = "UPDATE {$this->table} SET 
                    title = :title, 
                    description = :description, 
                    type = :type, 
                    status = :status, 
                    priority = :priority, 
                    owner_id = :owner_id, 
                    start_date = :start_date, 
                    end_date = :end_date, 
                    progress = :progress, 
                    updated_at = datetime('now') 
                    WHERE id = :id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':title', $data['title']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':type', $data['type']);
            $stmt->bindParam(':status', $data['status']);
            $stmt->bindParam(':priority', $data['priority']);
            $stmt->bindParam(':owner_id', $data['owner_id']);
            $stmt->bindParam(':start_date', $data['start_date']);
            $stmt->bindParam(':end_date', $data['end_date']);
            $stmt->bindParam(':progress', $data['progress']);
            
            if ($stmt->execute()) {
                // 更新标签关联
                if (isset($data['tags'])) {
                    $this->detachAllTags($id);
                    if (!empty($data['tags'])) {
                        $this->attachTags($id, $data['tags']);
                    }
                }
                
                return $this->findById($id);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("RoadmapItem update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 删除路线图项目
     */
    public function delete($id)
    {
        try {
            // 先删除标签关联
            $this->detachAllTags($id);
            
            $sql = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("RoadmapItem delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取项目的标签
     */
    private function getItemTags($itemId)
    {
        try {
            $sql = "SELECT rt.* FROM roadmap_tags rt 
                    INNER JOIN roadmap_item_tags rit ON rt.id = rit.tag_id 
                    WHERE rit.roadmap_item_id = :item_id 
                    ORDER BY rt.name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':item_id', $itemId);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("RoadmapItem getItemTags error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * 为项目添加标签
     */
    private function attachTags($itemId, $tagIds)
    {
        try {
            foreach ($tagIds as $tagId) {
                $sql = "INSERT OR IGNORE INTO roadmap_item_tags (roadmap_item_id, tag_id, created_at) 
                        VALUES (:item_id, :tag_id, datetime('now'))";
                
                $stmt = $this->db->prepare($sql);
                $stmt->bindParam(':item_id', $itemId);
                $stmt->bindParam(':tag_id', $tagId);
                $stmt->execute();
            }
            
            return true;
        } catch (PDOException $e) {
            error_log("RoadmapItem attachTags error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 移除项目的所有标签
     */
    private function detachAllTags($itemId)
    {
        try {
            $sql = "DELETE FROM roadmap_item_tags WHERE roadmap_item_id = :item_id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':item_id', $itemId);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("RoadmapItem detachAllTags error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取项目统计信息
     */
    public function getStatsByProductId($productId)
    {
        try {
            $sql = "SELECT 
                        status,
                        COUNT(*) as count
                    FROM {$this->table} 
                    WHERE product_id = :product_id 
                    GROUP BY status";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            $stats = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $stats[$row['status']] = (int)$row['count'];
            }
            
            return $stats;
        } catch (PDOException $e) {
            error_log("RoadmapItem getStatsByProductId error: " . $e->getMessage());
            return [];
        }
    }
}