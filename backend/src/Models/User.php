<?php

namespace App\Models;

use App\Config\Database;
use PDO;
use Exception;

class User
{
    private $conn;
    private $table = 'users';

    public $id;
    public $username;
    public $email;
    public $password_hash;
    public $full_name;
    public $avatar;
    public $status;
    public $created_at;
    public $updated_at;
    public $last_login_at;

    public function __construct()
    {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    /**
     * 创建用户
     */
    public function create()
    {
        // 如果没有设置full_name，使用username作为默认值
        if (empty($this->full_name)) {
            $this->full_name = $this->username;
        }
        
        $query = "INSERT INTO {$this->table} 
                  (username, email, password_hash, full_name, avatar, status) 
                  VALUES (:username, :email, :password_hash, :full_name, :avatar, :status)";
        
        $stmt = $this->conn->prepare($query);
        
        // 绑定参数
        $stmt->bindParam(':username', $this->username);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':password_hash', $this->password_hash);
        $stmt->bindParam(':full_name', $this->full_name);
        $stmt->bindParam(':avatar', $this->avatar);
        $stmt->bindParam(':status', $this->status);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        
        return false;
    }

    /**
     * 根据ID获取用户
     */
    public function findById($id)
    {
        $query = "SELECT * FROM {$this->table} WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $this->mapFromArray($row);
            return $this;
        }
        
        return null;
    }

    /**
     * 根据邮箱获取用户
     */
    public function findByEmail($email)
    {
        $query = "SELECT * FROM {$this->table} WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $this->mapFromArray($row);
            return $this;
        }
        
        return null;
    }

    /**
     * 根据用户名获取用户
     */
    public function findByUsername($username)
    {
        $query = "SELECT * FROM {$this->table} WHERE username = :username LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $this->mapFromArray($row);
            return $this;
        }
        
        return null;
    }

    /**
     * 更新用户信息
     */
    public function update()
    {
        $query = "UPDATE {$this->table} 
                  SET username = :username, email = :email, full_name = :full_name, 
                      avatar = :avatar, status = :status, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':id', $this->id);
        $stmt->bindParam(':username', $this->username);
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':full_name', $this->full_name);
        $stmt->bindParam(':avatar', $this->avatar);
        $stmt->bindParam(':status', $this->status);
        
        return $stmt->execute();
    }

    /**
     * 更新最后登录时间
     */
    public function updateLastLogin()
    {
        $query = "UPDATE {$this->table} SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    /**
     * 验证密码
     */
    public function verifyPassword($password)
    {
        return password_verify($password, $this->password_hash);
    }

    /**
     * 哈希密码
     */
    public static function hashPassword($password)
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * 检查邮箱是否已存在
     */
    public function emailExists($email, $excludeId = null)
    {
        $query = "SELECT id FROM {$this->table} WHERE email = :email";
        if ($excludeId) {
            $query .= " AND id != :exclude_id";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        if ($excludeId) {
            $stmt->bindParam(':exclude_id', $excludeId);
        }
        
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * 检查用户名是否已存在
     */
    public function usernameExists($username, $excludeId = null)
    {
        $query = "SELECT id FROM {$this->table} WHERE username = :username";
        if ($excludeId) {
            $query .= " AND id != :exclude_id";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':username', $username);
        if ($excludeId) {
            $stmt->bindParam(':exclude_id', $excludeId);
        }
        
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * 从数组映射属性
     */
    private function mapFromArray($data)
    {
        $this->id = $data['id'];
        $this->username = $data['username'];
        $this->email = $data['email'];
        $this->password_hash = $data['password_hash'];
        $this->full_name = $data['full_name'];
        $this->avatar = $data['avatar'];
        $this->status = $data['status'];
        $this->created_at = $data['created_at'];
        $this->updated_at = $data['updated_at'];
        $this->last_login_at = $data['last_login_at'];
    }

    /**
     * 转换为数组（不包含敏感信息）
     */
    public function toArray($includeSensitive = false)
    {
        $data = [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'full_name' => $this->full_name,
            'avatar' => $this->avatar,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_login_at' => $this->last_login_at
        ];
        
        if ($includeSensitive) {
            $data['password_hash'] = $this->password_hash;
        }
        
        return $data;
    }
}