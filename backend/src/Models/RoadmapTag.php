<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use PDOException;

class RoadmapTag
{
    private $db;
    private $table = 'roadmap_tags';

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 创建标签
     */
    public function create($data)
    {
        try {
            $sql = "INSERT INTO {$this->table} (name, color, product_id, created_at, updated_at) 
                    VALUES (:name, :color, :product_id, datetime('now'), datetime('now'))";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':color', $data['color']);
            $stmt->bindParam(':product_id', $data['product_id']);
            
            if ($stmt->execute()) {
                return $this->findById($this->db->lastInsertId());
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("RoadmapTag creation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据ID查找标签
     */
    public function findById($id)
    {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("RoadmapTag findById error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据产品ID获取所有标签
     */
    public function findByProductId($productId)
    {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE product_id = :product_id ORDER BY name ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':product_id', $productId);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("RoadmapTag findByProductId error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * 更新标签
     */
    public function update($id, $data)
    {
        try {
            $sql = "UPDATE {$this->table} SET name = :name, color = :color, updated_at = datetime('now') WHERE id = :id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':color', $data['color']);
            
            if ($stmt->execute()) {
                return $this->findById($id);
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("RoadmapTag update error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 删除标签
     */
    public function delete($id)
    {
        try {
            $sql = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':id', $id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("RoadmapTag delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查标签名称是否在产品中已存在
     */
    public function existsByNameAndProduct($name, $productId, $excludeId = null)
    {
        try {
            $sql = "SELECT COUNT(*) FROM {$this->table} WHERE name = :name AND product_id = :product_id";
            
            if ($excludeId) {
                $sql .= " AND id != :exclude_id";
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':product_id', $productId);
            
            if ($excludeId) {
                $stmt->bindParam(':exclude_id', $excludeId);
            }
            
            $stmt->execute();
            
            return $stmt->fetchColumn() > 0;
        } catch (PDOException $e) {
            error_log("RoadmapTag existsByNameAndProduct error: " . $e->getMessage());
            return false;
        }
    }
}