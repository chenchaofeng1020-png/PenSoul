<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

class Competitor
{
    private $db;
    private $table = 'competitors';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 创建竞品
     */
    public function create($data)
    {
        try {
            $sql = "INSERT INTO {$this->table} (product_id, name, slogan, description, website_url, 
                    documentation_url, logo_url, main_customers, created_at, updated_at) 
                    VALUES (:product_id, :name, :slogan, :description, :website_url, 
                    :documentation_url, :logo_url, :main_customers, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $data['product_id']);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':slogan', $data['slogan']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':website_url', $data['website_url']);
            $stmt->bindParam(':documentation_url', $data['documentation_url']);
            $stmt->bindParam(':logo_url', $data['logo_url']);
            $stmt->bindParam(':main_customers', $data['main_customers']);
            
            if ($stmt->execute()) {
                $competitorId = $this->db->lastInsertId();
                return $this->findById($competitorId);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("Competitor creation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据ID查找竞品
     */
    public function findById($id)
    {
        try {
            $sql = "SELECT c.*, p.name as product_name 
                    FROM {$this->table} c 
                    LEFT JOIN products p ON c.product_id = p.id 
                    WHERE c.id = :id AND c.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $competitor = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($competitor) {
                // 解析JSON字段
                $competitor['mainCustomers'] = $this->parseJsonField($competitor['main_customers']);
                $competitor['recentUpdates'] = $this->parseJsonField($competitor['recent_updates']);
                $competitor['lastUpdated'] = $competitor['updated_at'] ? date('Y-m-d', strtotime($competitor['updated_at'])) : date('Y-m-d');
            }
            
            return $competitor;
        } catch (PDOException $e) {
            error_log("Competitor find error: " . $e->getMessage());
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
        
        // 如果是字符串，尝试按逗号分割
        if (is_string($jsonString)) {
            // 先尝试JSON解析
            $decoded = json_decode($jsonString, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
            
            // 如果不是有效JSON，按逗号分割
            return array_filter(array_map('trim', explode(',', $jsonString)));
        }
        
        return is_array($jsonString) ? $jsonString : [];
    }

    /**
     * 获取产品的竞品列表
     */
    public function getProductCompetitors($productId, $page = 1, $limit = 10, $search = '')
    {
        try {
            $offset = ($page - 1) * $limit;
            
            // 构建搜索条件
            $searchCondition = '';
            $params = [':product_id' => $productId];
            
            if (!empty($search)) {
                $searchCondition = " AND (c.name LIKE :search OR c.slogan LIKE :search OR c.description LIKE :search)";
                $params[':search'] = "%{$search}%";
            }
            
            // 获取总数
            $countSql = "SELECT COUNT(*) as total 
                        FROM {$this->table} c 
                        WHERE c.product_id = :product_id AND c.deleted_at IS NULL {$searchCondition}";
            
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // 获取竞品列表
            $sql = "SELECT c.*, p.name as product_name
                    FROM {$this->table} c 
                    LEFT JOIN products p ON c.product_id = p.id 
                    WHERE c.product_id = :product_id AND c.deleted_at IS NULL {$searchCondition}
                    ORDER BY c.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 解析每个竞品的JSON字段
            foreach ($competitors as &$competitor) {
                $competitor['mainCustomers'] = $this->parseJsonField($competitor['main_customers']);
                $competitor['recentUpdates'] = $this->parseJsonField($competitor['recent_updates']);
                $competitor['lastUpdated'] = $competitor['updated_at'] ? date('Y-m-d', strtotime($competitor['updated_at'])) : date('Y-m-d');
            }
            
            return [
                'competitors' => $competitors,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (PDOException $e) {
            error_log("Get product competitors error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 更新竞品
     */
    public function update($id, $data)
    {
        try {
            $sql = "UPDATE {$this->table} 
                    SET name = :name, slogan = :slogan, description = :description, 
                        website_url = :website_url, documentation_url = :documentation_url, 
                        logo_url = :logo_url, main_customers = :main_customers, updated_at = datetime('now') 
                    WHERE id = :id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':slogan', $data['slogan']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':website_url', $data['website_url']);
            $stmt->bindParam(':documentation_url', $data['documentation_url']);
            $stmt->bindParam(':logo_url', $data['logo_url']);
            $stmt->bindParam(':main_customers', $data['main_customers']);
            
            if ($stmt->execute()) {
                return $this->findById($id);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("Competitor update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 删除竞品（软删除）
     */
    public function delete($id)
    {
        try {
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Competitor delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查竞品是否属于指定产品
     */
    public function belongsToProduct($competitorId, $productId)
    {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM {$this->table} 
                    WHERE id = :competitor_id AND product_id = :product_id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':competitor_id', $competitorId);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (PDOException $e) {
            error_log("Check competitor belongs to product error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查竞品名称是否已存在（同一产品下）
     */
    public function isNameExists($name, $productId, $excludeId = null)
    {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM {$this->table} 
                    WHERE name = :name AND product_id = :product_id AND deleted_at IS NULL";
            
            $params = [':name' => $name, ':product_id' => $productId];
            
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
        } catch (PDOException $e) {
            error_log("Check competitor name exists error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取用户所有产品的竞品列表
     */
    public function getUserCompetitors($userId, $page = 1, $limit = 10, $search = '')
    {
        try {
            $offset = ($page - 1) * $limit;
            
            // 构建搜索条件
            $searchCondition = '';
            $params = [':user_id' => $userId];
            
            if (!empty($search)) {
                $searchCondition = " AND (c.name LIKE :search OR c.slogan LIKE :search OR c.description LIKE :search OR p.name LIKE :search)";
                $params[':search'] = "%{$search}%";
            }
            
            // 获取总数
            $countSql = "SELECT COUNT(*) as total 
                        FROM {$this->table} c 
                        INNER JOIN products p ON c.product_id = p.id 
                        INNER JOIN user_products up ON p.id = up.product_id 
                        WHERE up.user_id = :user_id AND c.deleted_at IS NULL AND p.deleted_at IS NULL {$searchCondition}";
            
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // 获取竞品列表
            $sql = "SELECT c.*, p.name as product_name
                    FROM {$this->table} c 
                    INNER JOIN products p ON c.product_id = p.id 
                    INNER JOIN user_products up ON p.id = up.product_id 
                    WHERE up.user_id = :user_id AND c.deleted_at IS NULL AND p.deleted_at IS NULL {$searchCondition}
                    ORDER BY c.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $competitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'competitors' => $competitors,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (PDOException $e) {
            error_log("Get user competitors error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取竞品统计信息
     */
    public function getCompetitorStats($productId)
    {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_competitors,
                        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as recent_week,
                        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as recent_month,
                        COUNT(CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 1 END) as with_website,
                        COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as with_logo
                    FROM {$this->table} 
                    WHERE product_id = :product_id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Get competitor stats error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 批量删除竞品
     */
    public function batchDelete($ids, $productId)
    {
        try {
            if (empty($ids) || !is_array($ids)) {
                return false;
            }
            
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') 
                    WHERE id IN ({$placeholders}) AND product_id = ? AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $params = array_merge($ids, [$productId]);
            
            return $stmt->execute($params);
        } catch (PDOException $e) {
            error_log("Batch delete competitors error: " . $e->getMessage());
            return false;
        }
    }
}