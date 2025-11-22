-- 产品鸭竞品管理系统数据库设计
-- 创建数据库
CREATE DATABASE IF NOT EXISTS product_duck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE product_duck;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    full_name VARCHAR(100) NOT NULL COMMENT '真实姓名',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '用户状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='用户表';

-- 产品表
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '产品名称',
    description TEXT COMMENT '产品描述',
    logo VARCHAR(255) DEFAULT NULL COMMENT '产品Logo URL',
    owner_id INT NOT NULL COMMENT '产品负责人ID',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner_id (owner_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB COMMENT='产品表';

-- 竞品表
CREATE TABLE competitors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '所属产品ID',
    name VARCHAR(100) NOT NULL COMMENT '竞品名称',
    slogan VARCHAR(255) DEFAULT NULL COMMENT '竞品标语',
    description TEXT COMMENT '竞品描述',
    logo VARCHAR(255) DEFAULT NULL COMMENT '竞品Logo URL',
    website VARCHAR(255) DEFAULT NULL COMMENT '官方网站',
    help_doc_url VARCHAR(255) DEFAULT NULL COMMENT '帮助文档URL',
    api_doc_url VARCHAR(255) DEFAULT NULL COMMENT 'API文档URL',
    main_customers JSON DEFAULT NULL COMMENT '主要客户列表',
    recent_updates JSON DEFAULT NULL COMMENT '最近更新列表',
    last_updated DATE DEFAULT NULL COMMENT '最后更新日期',
    created_by INT NOT NULL COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_created_by (created_by),
    INDEX idx_name (name)
) ENGINE=InnoDB COMMENT='竞品表';

-- 用户产品关联表（支持多用户协作）
CREATE TABLE user_products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    product_id INT NOT NULL COMMENT '产品ID',
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member' COMMENT '角色',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB COMMENT='用户产品关联表';

-- 插入默认数据
-- 默认用户
INSERT INTO users (username, email, password_hash, full_name) VALUES 
('admin', 'admin@productduck.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员');

-- 默认产品
INSERT INTO products (name, description, owner_id) VALUES 
('产品鸭', '专业的竞品分析管理平台', 1);

-- 默认竞品数据
INSERT INTO competitors (product_id, name, slogan, description, website, help_doc_url, api_doc_url, main_customers, recent_updates, last_updated, created_by) VALUES 
(1, 'Axure RP', '专业的原型设计工具', 'Axure RP是一款专业的快速原型设计工具，让负责定义需求和规格、设计功能和界面的专家能够快速创建应用软件或Web网站的线框图、流程图、原型和规格说明文档。', 'https://www.axure.com', 'https://docs.axure.com', 'https://developer.axure.com/api', '["微软", "苹果", "谷歌", "亚马逊"]', '["新增组件库功能", "优化交互设计", "支持团队协作"]', '2024-01-15', 1),
(1, 'Figma', '协作式界面设计工具', 'Figma是一个基于浏览器的协作式UI设计工具，支持实时协作，让设计团队能够更高效地工作。', 'https://www.figma.com', 'https://help.figma.com', 'https://www.figma.com/developers/api', '["Airbnb", "Uber", "Netflix", "Spotify"]', '["AI设计助手", "高级原型功能", "开发者交接优化"]', '2024-01-20', 1),
(1, 'Sketch', 'Mac上的专业设计工具', 'Sketch是一款轻量、易用的矢量设计工具，专为UI/UX设计师打造，提供强大的符号和样式系统。', 'https://www.sketch.com', 'https://www.sketch.com/docs', 'https://developer.sketch.com/reference/api', '["Facebook", "Twitter", "Dropbox", "Medium"]', '["云端同步优化", "插件生态升级", "性能提升"]', '2024-01-10', 1);

-- 默认用户产品关联
INSERT INTO user_products (user_id, product_id, role) VALUES 
(1, 1, 'owner');