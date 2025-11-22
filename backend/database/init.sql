-- 产品鸭子 (Product Duck) 数据库初始化脚本
-- 创建时间: 2024-01-20
-- 版本: 1.0

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `product_duck` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `product_duck`;

-- ----------------------------
-- 用户表 (users)
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `password` varchar(255) NOT NULL COMMENT '密码哈希',
  `avatar_url` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=正常，0=禁用',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- 产品表 (products)
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '产品ID',
  `name` varchar(100) NOT NULL COMMENT '产品名称',
  `slogan` varchar(200) DEFAULT NULL COMMENT '产品口号',
  `description` text COMMENT '产品描述',
  `website_url` varchar(255) DEFAULT NULL COMMENT '官网URL',
  `documentation_url` varchar(255) DEFAULT NULL COMMENT '文档URL',
  `logo_url` varchar(255) DEFAULT NULL COMMENT 'Logo URL',
  `main_customers` varchar(500) DEFAULT NULL COMMENT '主要客户',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=正常，0=禁用',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除：1=已删除，0=正常',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- ----------------------------
-- 用户产品关联表 (user_products)
-- ----------------------------
DROP TABLE IF EXISTS `user_products`;
CREATE TABLE `user_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `role` varchar(20) NOT NULL DEFAULT 'owner' COMMENT '角色：owner=拥有者，editor=编辑者，viewer=查看者',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `fk_user_products_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_products_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户产品关联表';

-- ----------------------------
-- 竞品表 (competitors)
-- ----------------------------
DROP TABLE IF EXISTS `competitors`;
CREATE TABLE `competitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '竞品ID',
  `product_id` int(11) NOT NULL COMMENT '所属产品ID',
  `name` varchar(100) NOT NULL COMMENT '竞品名称',
  `slogan` varchar(200) DEFAULT NULL COMMENT '竞品口号',
  `description` text COMMENT '竞品描述',
  `website_url` varchar(255) DEFAULT NULL COMMENT '官网URL',
  `documentation_url` varchar(255) DEFAULT NULL COMMENT '文档URL',
  `logo_url` varchar(255) DEFAULT NULL COMMENT 'Logo URL',
  `main_customers` varchar(500) DEFAULT NULL COMMENT '主要客户',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=正常，0=禁用',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除：1=已删除，0=正常',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_competitors_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞品表';

-- ----------------------------
-- 插入示例数据
-- ----------------------------

-- 插入测试用户
INSERT INTO `users` (`username`, `email`, `password`, `status`) VALUES
('admin', 'admin@productduck.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('demo', 'demo@productduck.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- 插入示例产品
INSERT INTO `products` (`name`, `slogan`, `description`, `website_url`, `status`) VALUES
('产品鸭子', '让产品管理更简单', '一个专业的产品管理和竞品分析平台，帮助产品经理更好地管理产品和分析竞品。', 'https://productduck.com', 1),
('示例产品', '这是一个示例产品', '用于演示系统功能的示例产品。', 'https://example.com', 1);

-- 插入用户产品关联
INSERT INTO `user_products` (`user_id`, `product_id`, `role`) VALUES
(1, 1, 'owner'),
(1, 2, 'owner'),
(2, 2, 'editor');

-- 插入示例竞品
INSERT INTO `competitors` (`product_id`, `name`, `slogan`, `description`, `website_url`, `status`) VALUES
(1, 'Notion', 'One workspace. Every team.', 'Notion是一个集笔记、知识库、数据库、看板、日历等功能于一体的协作平台。', 'https://notion.so', 1),
(1, 'Airtable', 'Part spreadsheet, part database', 'Airtable是一个云端协作服务，结合了电子表格和数据库的功能。', 'https://airtable.com', 1),
(2, '竞品A', '竞品A的口号', '这是竞品A的描述信息。', 'https://competitor-a.com', 1),
(2, '竞品B', '竞品B的口号', '这是竞品B的描述信息。', 'https://competitor-b.com', 1);

-- ----------------------------
-- 创建索引优化
-- ----------------------------

-- 为经常查询的字段创建复合索引
ALTER TABLE `products` ADD INDEX `idx_status_deleted` (`status`, `is_deleted`);
ALTER TABLE `competitors` ADD INDEX `idx_product_status_deleted` (`product_id`, `status`, `is_deleted`);
ALTER TABLE `user_products` ADD INDEX `idx_user_role` (`user_id`, `role`);

-- ----------------------------
-- 设置外键检查
-- ----------------------------
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- 完成提示
-- ----------------------------
SELECT 'Database initialization completed successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as competitor_count FROM competitors;
SELECT COUNT(*) as user_product_count FROM user_products;