<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

class Product
{
    private $db;
    private $table = 'products';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 创建产品
     */
    public function create($data)
    {
        try {
            $sql = "INSERT INTO {$this->table} (name, description, website_url, logo_url, user_id, created_at, updated_at) 
                    VALUES (:name, :description, :website_url, :logo_url, :user_id, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':website_url', $data['website_url']);
            $stmt->bindParam(':logo_url', $data['logo_url']);
            $stmt->bindParam(':user_id', $data['user_id']);
            
            if ($stmt->execute()) {
                $productId = $this->db->lastInsertId();
                
                // 创建用户产品关联
                $this->createUserProductRelation($data['user_id'], $productId);
                
                return $this->findById($productId);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("Product creation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据ID查找产品
     */
    public function findById($id)
    {
        try {
            $sql = "SELECT p.*, u.username as creator_username 
                    FROM {$this->table} p 
                    LEFT JOIN users u ON p.user_id = u.id 
                    WHERE p.id = :id AND p.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Product find error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取用户的产品列表
     */
    public function getUserProducts($userId, $page = 1, $limit = 10, $search = '')
    {
        try {
            $offset = ($page - 1) * $limit;
            
            // 构建搜索条件
            $searchCondition = '';
            $params = [':user_id' => $userId];
            
            if (!empty($search)) {
                $searchCondition = " AND (p.name LIKE :search OR p.description LIKE :search)";
                $params[':search'] = "%{$search}%";
            }
            
            // 获取总数
            $countSql = "SELECT COUNT(*) as total 
                        FROM {$this->table} p 
                        INNER JOIN user_products up ON p.id = up.product_id 
                        WHERE up.user_id = :user_id AND p.deleted_at IS NULL {$searchCondition}";
            
            $countStmt = $this->db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // 获取产品列表
            $sql = "SELECT p.*, u.username as creator_username,
                           (SELECT COUNT(*) FROM competitors c WHERE c.product_id = p.id AND c.deleted_at IS NULL) as competitor_count
                    FROM {$this->table} p 
                    INNER JOIN user_products up ON p.id = up.product_id 
                    LEFT JOIN users u ON p.user_id = u.id 
                    WHERE up.user_id = :user_id AND p.deleted_at IS NULL {$searchCondition}
                    ORDER BY p.created_at DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'products' => $products,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (PDOException $e) {
            error_log("Get user products error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 更新产品
     */
    public function update($id, $data, $userId)
    {
        try {
            // 检查产品是否属于当前用户
            if (!$this->checkUserAccess($id, $userId)) {
                return false;
            }
            
            $sql = "UPDATE {$this->table} 
                    SET name = :name, description = :description, website_url = :website_url, 
                        logo_url = :logo_url, updated_at = datetime('now') 
                    WHERE id = :id AND deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':website_url', $data['website_url']);
            $stmt->bindParam(':logo_url', $data['logo_url']);
            
            if ($stmt->execute()) {
                return $this->findById($id);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("Product update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 删除产品（软删除）
     */
    public function delete($id, $userId)
    {
        try {
            // 检查产品是否属于当前用户
            if (!$this->checkUserAccess($id, $userId)) {
                return false;
            }
            
            $this->db->beginTransaction();
            
            // 软删除产品
            $sql = "UPDATE {$this->table} SET deleted_at = datetime('now') WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            // 软删除相关竞品
            $competitorSql = "UPDATE competitors SET deleted_at = datetime('now') WHERE product_id = :product_id";
            $competitorStmt = $this->db->prepare($competitorSql);
            $competitorStmt->bindParam(':product_id', $id);
            $competitorStmt->execute();
            
            $this->db->commit();
            return true;
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Product delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查用户是否有权限访问产品
     */
    public function checkUserAccess($productId, $userId)
    {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM user_products up 
                    INNER JOIN {$this->table} p ON up.product_id = p.id 
                    WHERE up.product_id = :product_id AND up.user_id = :user_id AND p.deleted_at IS NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;
        } catch (PDOException $e) {
            error_log("Check user access error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 创建用户产品关联
     */
    private function createUserProductRelation($userId, $productId)
    {
        try {
            $sql = "INSERT INTO user_products (user_id, product_id, role, created_at) 
                    VALUES (:user_id, :product_id, 'owner', datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':product_id', $productId);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Create user product relation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查产品名称是否已存在（同一用户下）
     */
    public function isNameExists($name, $userId, $excludeId = null)
    {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM {$this->table} p 
                    INNER JOIN user_products up ON p.id = up.product_id 
                    WHERE p.name = :name AND up.user_id = :user_id AND p.deleted_at IS NULL";
            
            $params = [':name' => $name, ':user_id' => $userId];
            
            if ($excludeId) {
                $sql .= " AND p.id != :exclude_id";
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
            error_log("Check name exists error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取产品统计信息
     */
    public function getProductStats($productId, $userId)
    {
        try {
            // 检查权限
            if (!$this->checkUserAccess($productId, $userId)) {
                return false;
            }
            
            $sql = "SELECT 
                        p.id,
                        p.name,
                        p.created_at,
                        COUNT(c.id) as competitor_count,
                        COUNT(CASE WHEN c.created_at >= datetime('now', '-30 days') THEN 1 END) as recent_competitors
                    FROM {$this->table} p 
                    LEFT JOIN competitors c ON p.id = c.product_id AND c.deleted_at IS NULL
                    WHERE p.id = :product_id AND p.deleted_at IS NULL
                    GROUP BY p.id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Get product stats error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 为新用户创建默认产品
     */
    public function createDefaultProduct($userId)
    {
        try {
            $defaultProductData = [
                'name' => '产品鸭',
                'description' => '默认产品，您可以在此管理竞品信息',
                'website_url' => '',
                'logo_url' => '',
                'user_id' => $userId
            ];
            
            return $this->create($defaultProductData);
        } catch (PDOException $e) {
            error_log("Create default product error: " . $e->getMessage());
            return false;
        }
    }
}