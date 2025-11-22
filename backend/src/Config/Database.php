<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $conn;

    public function __construct()
    {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->port = $_ENV['DB_PORT'] ?? '3306';
        $this->db_name = $_ENV['DB_NAME'] ?? 'product_duck';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
    }

    /**
     * 获取数据库连接
     */
    public function getConnection()
    {
        $this->conn = null;

        try {
            // 如果没有配置MySQL或连接失败，使用SQLite作为备用
            if (empty($this->password) && $this->host === 'localhost') {
                // 使用SQLite
                $dbPath = __DIR__ . '/../../database/product_duck.sqlite';
                $dsn = "sqlite:" . $dbPath;
                $this->conn = new PDO($dsn);
                $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                
                // 创建基本表结构（如果不存在）
                $this->createSQLiteTables();
            } else {
                // 使用MySQL
                $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
                $this->conn = new PDO($dsn, $this->username, $this->password);
                $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            }
        } catch (PDOException $exception) {
            throw new \Exception("数据库连接失败: " . $exception->getMessage());
        }

        return $this->conn;
    }

    /**
     * 关闭数据库连接
     */
    public function closeConnection()
    {
        $this->conn = null;
    }

    /**
     * 开始事务
     */
    public function beginTransaction()
    {
        return $this->conn->beginTransaction();
    }

    /**
     * 提交事务
     */
    public function commit()
    {
        return $this->conn->commit();
    }

    /**
     * 回滚事务
     */
    public function rollback()
    {
        return $this->conn->rollback();
    }

    /**
     * 创建SQLite表结构
     */
    private function createSQLiteTables()
    {
        // 创建用户表
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                avatar VARCHAR(255) DEFAULT NULL,
                status INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at DATETIME DEFAULT NULL
            )
        ");

        // 创建产品表
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                slogan VARCHAR(200) DEFAULT NULL,
                description TEXT,
                website_url VARCHAR(255) DEFAULT NULL,
                documentation_url VARCHAR(255) DEFAULT NULL,
                logo_url VARCHAR(255) DEFAULT NULL,
                main_customers VARCHAR(500) DEFAULT NULL,
                user_id INTEGER NOT NULL,
                status INTEGER DEFAULT 1,
                is_deleted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");

        // 创建用户产品关联表
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS user_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                role VARCHAR(20) DEFAULT 'member',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ");

        // 创建竞品表
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS competitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                slogan VARCHAR(200) DEFAULT NULL,
                description TEXT,
                website_url VARCHAR(255) DEFAULT NULL,
                documentation_url VARCHAR(255) DEFAULT NULL,
                logo_url VARCHAR(255) DEFAULT NULL,
                main_customers TEXT DEFAULT NULL,
                recent_updates TEXT DEFAULT NULL,
                last_updated DATE DEFAULT NULL,
                status INTEGER DEFAULT 1,
                is_deleted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ");
        
        // 新增：创建竞品功能与分析表（若不存在）
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS competitor_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competitor_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                priority VARCHAR(10) DEFAULT 'medium',
                status VARCHAR(20) DEFAULT 'active',
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (competitor_id) REFERENCES competitors(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        ");
        
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS competitor_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competitor_id INTEGER NOT NULL,
                feature_id INTEGER,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                analysis_type VARCHAR(20) DEFAULT 'feature',
                tags TEXT,
                attachments TEXT,
                author_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                FOREIGN KEY (feature_id) REFERENCES competitor_features(id),
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        ");
        
        // 迁移已有表结构，补齐缺失列
        $this->migrateSQLiteTables();
        
        // 插入示例数据
        $this->insertSampleData();
    }
    
    /**
     * 插入示例数据
     */
    private function insertSampleData()
    {
        // 检查是否已有数据
        $stmt = $this->conn->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        
        if ($result['count'] > 0) {
            return; // 已有数据，不重复插入
        }
        
        // 插入示例用户
        $this->conn->exec("
            INSERT INTO users (username, email, password_hash, full_name, status) VALUES
            ('admin', 'admin@productduck.com', '$2y$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 1),
            ('demo', 'demo@productduck.com', '$2y$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', 1)
        ");
        
        // 插入示例产品
        $this->conn->exec("
            INSERT INTO products (name, slogan, description, website_url, user_id, status) VALUES
            ('示例产品', '这是一个示例产品', '用于演示系统功能的示例产品。', 'https://example.com', 1, 1)
        ");
        
        // 插入用户产品关联
        $this->conn->exec("
            INSERT INTO user_products (user_id, product_id, role) VALUES
            (1, 1, 'owner'),
            (2, 1, 'member')
        ");
        
        // 插入示例竞品
        $this->conn->exec("
            INSERT INTO competitors (product_id, name, slogan, description, website_url, main_customers, recent_updates, last_updated, status) VALUES
            (1, 'Notion', 'One workspace. Every team.', 'Notion是一个集笔记、知识库、数据库、看板、日历等功能于一体的协作平台。', 'https://notion.so', '[\"Microsoft\", \"Spotify\", \"Nike\"]', '[\"新增AI助手功能\", \"优化移动端体验\", \"增加团队协作工具\"]', '2024-01-15', 1),
            (1, 'Airtable', 'Part spreadsheet, part database', 'Airtable是一个云端协作服务，结合了电子表格和数据库的功能。', 'https://airtable.com', '[\"Airbnb\", \"Netflix\", \"WeWork\"]', '[\"推出新的自动化功能\", \"增强数据可视化\", \"改进API接口\"]', '2024-01-10', 1)
        ");
    }
    
    /**
     * 迁移SQLite表结构，补齐缺失列
     */
    private function migrateSQLiteTables()
    {
        try {
            // 定义需要校验的表与列
            $tables = [
                'competitor_features' => [
                    ['name' => 'deleted_at', 'type' => 'DATETIME DEFAULT NULL']
                ],
                'competitor_analyses' => [
                    ['name' => 'deleted_at', 'type' => 'DATETIME DEFAULT NULL'],
                    ['name' => 'author_id', 'type' => 'INTEGER'],
                    // 新增：缺失列补齐
                    ['name' => 'rating', 'type' => 'INTEGER'],
                    ['name' => 'is_public', 'type' => 'INTEGER DEFAULT 0'],
                    ['name' => 'attachments', 'type' => 'TEXT'],
                    ['name' => 'feature_id', 'type' => 'INTEGER']
                ]
            ];

            foreach ($tables as $table => $columns) {
                // 读取现有列
                $stmt = $this->conn->query("PRAGMA table_info($table)");
                $existing = [];
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
                    $existing[] = $col['name'];
                }
                // 逐列补齐
                foreach ($columns as $col) {
                    if (!in_array($col['name'], $existing)) {
                        $this->conn->exec("ALTER TABLE $table ADD COLUMN {$col['name']} {$col['type']}");
                    }
                }
            }
        } catch (PDOException $e) {
            // 迁移失败不阻塞应用运行，记录错误
            error_log('SQLite migrate error: ' . $e->getMessage());
        }
    }
}