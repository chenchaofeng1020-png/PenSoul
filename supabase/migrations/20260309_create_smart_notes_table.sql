-- 创建智能资料助手笔记表
CREATE TABLE IF NOT EXISTS smart_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '未命名笔记',
    content TEXT,
    type TEXT, -- 笔记类型：xiaohongshu, summary, roadmap, architecture, prototype
    is_pinned BOOLEAN DEFAULT false,
    source_refs JSONB DEFAULT '[]', -- 引用的资料ID数组
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_smart_notes_product_id ON smart_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_smart_notes_type ON smart_notes(type);
CREATE INDEX IF NOT EXISTS idx_smart_notes_created_at ON smart_notes(created_at DESC);

-- 启用 RLS
ALTER TABLE smart_notes ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "允许所有操作" ON smart_notes
    FOR ALL USING (true) WITH CHECK (true);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_smart_notes_updated_at ON smart_notes;
CREATE TRIGGER update_smart_notes_updated_at
    BEFORE UPDATE ON smart_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
