-- 创建产品用户故事表 (product_stories)
-- 用于存储产品的用户故事数据

CREATE TABLE IF NOT EXISTS product_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    who TEXT NOT NULL,
    role_tag TEXT DEFAULT '',
    user_goal TEXT DEFAULT '',
    max_pain TEXT DEFAULT '',
    existing_solution TEXT DEFAULT '',
    our_solution TEXT DEFAULT '',
    outcome TEXT DEFAULT '',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_stories_updated_at 
    BEFORE UPDATE ON product_stories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_product_stories_product_id ON product_stories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stories_is_primary ON product_stories(is_primary);

-- 设置行级安全策略（RLS）
ALTER TABLE product_stories ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "用户只能查看自己的产品用户故事" ON product_stories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_stories.product_id 
            AND products.owner_id = auth.uid()
        )
    );

-- 授予权限
GRANT ALL ON product_stories TO authenticated;
GRANT SELECT ON product_stories TO anon;
