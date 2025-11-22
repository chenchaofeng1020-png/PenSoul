-- 竞品详情页面系统新增表结构
-- 基于用户需求添加评论系统、功能管理、需求管理和文档管理功能

-- 竞品功能表
CREATE TABLE competitor_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'planned')),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_competitor_features_competitor_id ON competitor_features(competitor_id);
CREATE INDEX idx_competitor_features_category ON competitor_features(category);
CREATE INDEX idx_competitor_features_status ON competitor_features(status);

-- 产品需求表
CREATE TABLE product_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled')),
    source_type VARCHAR(20) DEFAULT 'internal' CHECK (source_type IN ('analysis', 'user_feedback', 'market_research', 'internal')),
    source_id INTEGER,
    assignee_id INTEGER,
    estimated_effort INTEGER,
    due_date DATE,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_requirements_product_id ON product_requirements(product_id);
CREATE INDEX idx_product_requirements_status ON product_requirements(status);
CREATE INDEX idx_product_requirements_priority ON product_requirements(priority);
CREATE INDEX idx_product_requirements_source ON product_requirements(source_type, source_id);

-- 竞品分析表
CREATE TABLE competitor_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER NOT NULL,
    feature_id INTEGER,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    analysis_type VARCHAR(20) DEFAULT 'feature' CHECK (analysis_type IN ('feature', 'ui_ux', 'performance', 'market', 'other')),
    tags TEXT,
    attachments TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES competitor_features(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_competitor_analyses_competitor_id ON competitor_analyses(competitor_id);
CREATE INDEX idx_competitor_analyses_feature_id ON competitor_analyses(feature_id);
CREATE INDEX idx_competitor_analyses_type ON competitor_analyses(analysis_type);

-- 评论表
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('competitor', 'analysis', 'requirement')),
    target_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    attachments TEXT,
    author_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- 文档表
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(20) DEFAULT 'document' CHECK (category IN ('screenshot', 'document', 'video', 'other')),
    is_public BOOLEAN DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    uploaded_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_competitor_id ON documents(competitor_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- 插入一些示例数据

-- 示例竞品功能数据
INSERT INTO competitor_features (competitor_id, name, description, category, priority, created_by) VALUES 
(1, '拖拽式原型设计', 'Axure支持拖拽组件快速构建原型', '设计工具', 'high', 1),
(1, '交互动效设计', '支持复杂的交互动效和状态切换', '交互设计', 'high', 1),
(1, '团队协作功能', '支持多人协作编辑和版本管理', '协作功能', 'medium', 1),
(2, '实时协作编辑', 'Figma支持多人实时在线协作编辑', '协作功能', 'high', 1),
(2, 'AI设计助手', '集成AI功能辅助设计工作', 'AI功能', 'high', 1),
(2, '组件库管理', '强大的设计系统和组件库功能', '设计系统', 'medium', 1);

-- 示例产品需求数据
INSERT INTO product_requirements (product_id, title, description, priority, status, source_type, created_by) VALUES 
(1, '增加实时协作功能', '基于Figma的实时协作分析，我们需要添加类似的协作功能', 'high', 'pending', 'analysis', 1),
(1, '优化拖拽交互体验', '参考Axure的拖拽体验，优化我们的界面交互', 'medium', 'draft', 'analysis', 1),
(1, '集成AI辅助分析', '借鉴竞品的AI功能，为竞品分析添加智能化辅助', 'high', 'draft', 'market_research', 1);

-- 示例竞品分析数据
INSERT INTO competitor_analyses (competitor_id, feature_id, title, content, analysis_type, created_by) VALUES 
(1, 1, 'Axure拖拽功能深度分析', '<h2>功能概述</h2><p>Axure的拖拽功能是其核心竞争力之一...</p><h2>优势分析</h2><p>1. 操作直观简单</p><p>2. 组件丰富</p>', 'feature', 1),
(2, 4, 'Figma实时协作机制研究', '<h2>协作模式</h2><p>Figma采用基于云端的实时协作模式...</p><h2>技术实现</h2><p>使用WebSocket实现实时同步</p>', 'feature', 1);

-- 示例评论数据
INSERT INTO comments (target_type, target_id, content, author_id) VALUES 
('competitor', 1, '这个竞品的设计理念很值得学习，特别是交互方面', 1),
('competitor', 2, 'Figma的协作功能确实很强大，我们可以参考一下', 1),
('analysis', 1, '分析很详细，建议我们也可以考虑类似的拖拽实现', 1);

-- 一级回复示例
INSERT INTO comments (target_type, target_id, parent_id, content, author_id) VALUES 
('competitor', 1, 1, '同意，我们下个版本可以重点优化这块', 1);

-- 示例文档数据
INSERT INTO documents (competitor_id, name, original_name, file_path, file_size, file_type, mime_type, description, category, uploaded_by) VALUES 
(1, 'Axure界面截图', 'axure_screenshot_1.png', '/uploads/screenshots/axure_screenshot_1.png', 1024000, 'png', 'image/png', 'Axure主界面截图', 'screenshot', 1),
(1, 'Axure功能说明文档', 'axure_features.pdf', '/uploads/documents/axure_features.pdf', 2048000, 'pdf', 'application/pdf', 'Axure详细功能说明文档', 'document', 1),
(2, 'Figma协作演示视频', 'figma_collaboration.mp4', '/uploads/videos/figma_collaboration.mp4', 10240000, 'mp4', 'video/mp4', 'Figma实时协作功能演示', 'video', 1);