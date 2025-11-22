-- 团队成员管理功能数据库表
-- 基于分享链接的邀请机制和产品级别团队隔离

-- 成员邀请表
CREATE TABLE member_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '产品ID',
    token VARCHAR(64) NOT NULL UNIQUE COMMENT '邀请令牌',
    role ENUM('admin', 'member', 'viewer') NOT NULL DEFAULT 'member' COMMENT '邀请角色',
    invited_by INT NOT NULL COMMENT '邀请人ID',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    used_at TIMESTAMP NULL COMMENT '使用时间',
    used_by INT NULL COMMENT '使用者ID',
    status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending' COMMENT '邀请状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_token (token),
    INDEX idx_product_id (product_id),
    INDEX idx_invited_by (invited_by),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB COMMENT='成员邀请表';

-- 更新user_products表，添加团队隔离相关索引
-- 为了支持产品级别的团队隔离，添加复合索引
ALTER TABLE user_products 
ADD INDEX idx_product_user (product_id, user_id),
ADD INDEX idx_user_product (user_id, product_id);

-- 团队成员活动日志表（可选，用于审计）
CREATE TABLE team_member_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '产品ID',
    user_id INT NOT NULL COMMENT '用户ID',
    action ENUM('invited', 'joined', 'role_changed', 'removed', 'left') NOT NULL COMMENT '操作类型',
    old_role ENUM('owner', 'admin', 'member', 'viewer') NULL COMMENT '原角色',
    new_role ENUM('owner', 'admin', 'member', 'viewer') NULL COMMENT '新角色',
    operated_by INT NOT NULL COMMENT '操作人ID',
    details JSON NULL COMMENT '操作详情',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (operated_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='团队成员活动日志表';

-- 插入测试数据（可选）
-- 为默认产品创建一个测试邀请链接
INSERT INTO member_invitations (product_id, token, role, invited_by, expires_at) VALUES 
(1, SHA2(CONCAT('test_invitation_', UNIX_TIMESTAMP(), RAND()), 256), 'member', 1, DATE_ADD(NOW(), INTERVAL 7 DAY));