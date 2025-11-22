-- 路线图相关数据库表设计

-- 标签表
CREATE TABLE roadmap_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_product_tag_name ON roadmap_tags(product_id, name);
CREATE INDEX idx_roadmap_tags_product_id ON roadmap_tags(product_id);

-- 路线图项目表
CREATE TABLE roadmap_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'Task' CHECK (type IN ('Epic', 'Milestone', 'Task', 'Feature')),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    owner_id INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX idx_roadmap_items_product_id ON roadmap_items(product_id);
CREATE INDEX idx_roadmap_items_owner_id ON roadmap_items(owner_id);
CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_items_type ON roadmap_items(type);
CREATE INDEX idx_roadmap_items_priority ON roadmap_items(priority);
CREATE INDEX idx_roadmap_items_start_date ON roadmap_items(start_date);
CREATE INDEX idx_roadmap_items_end_date ON roadmap_items(end_date);

-- 路线图项目标签关联表
CREATE TABLE roadmap_item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roadmap_item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roadmap_item_id) REFERENCES roadmap_items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES roadmap_tags(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_item_tag ON roadmap_item_tags(roadmap_item_id, tag_id);
CREATE INDEX idx_roadmap_item_tags_roadmap_item_id ON roadmap_item_tags(roadmap_item_id);
CREATE INDEX idx_roadmap_item_tags_tag_id ON roadmap_item_tags(tag_id);

-- 插入默认标签数据
INSERT INTO roadmap_tags (name, color, product_id) VALUES 
('前端', '#3B82F6', 1),
('后端', '#10B981', 1),
('设计', '#F59E0B', 1),
('测试', '#EF4444', 1),
('优化', '#8B5CF6', 1),
('新功能', '#06B6D4', 1);

-- 插入默认路线图项目数据
INSERT INTO roadmap_items (product_id, title, description, type, status, priority, owner_id, start_date, end_date, progress, created_by) VALUES 
(1, '用户认证系统优化', '优化现有的用户登录注册流程，提升用户体验', 'Epic', 'completed', 'high', 1, '2024-01-01', '2024-01-15', 100, 1),
(1, '竞品分析功能增强', '增加更多竞品分析维度和可视化图表', 'Feature', 'in_progress', 'high', 1, '2024-01-16', '2024-02-15', 60, 1),
(1, '移动端适配', '开发移动端响应式界面', 'Epic', 'planned', 'medium', 1, '2024-02-16', '2024-03-31', 0, 1),
(1, 'API文档完善', '完善所有API接口的文档说明', 'Task', 'planned', 'low', 1, '2024-02-01', '2024-02-28', 0, 1),
(1, '性能优化', '优化系统整体性能，提升响应速度', 'Milestone', 'on_hold', 'medium', 1, '2024-03-01', '2024-03-15', 0, 1);

-- 插入默认项目标签关联数据
INSERT INTO roadmap_item_tags (roadmap_item_id, tag_id) VALUES 
(1, 1), (1, 2), -- 用户认证系统优化：前端+后端
(2, 1), (2, 3), -- 竞品分析功能增强：前端+设计
(3, 1), (3, 3), -- 移动端适配：前端+设计
(4, 2), -- API文档完善：后端
(5, 2), (5, 5); -- 性能优化：后端+优化