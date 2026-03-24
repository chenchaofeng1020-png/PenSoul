-- 创建产品用户画像表 (product_personas)
-- 用于存储产品的目标用户画像数据，与写作风格 personas 表区分开

CREATE TABLE IF NOT EXISTS product_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_tag TEXT DEFAULT '',
    demographics JSONB DEFAULT '{}',
    pain_points TEXT[] DEFAULT '{}',
    goals TEXT[] DEFAULT '{}',
    behaviors TEXT[] DEFAULT '{}',
    quote TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
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

CREATE TRIGGER update_product_personas_updated_at 
    BEFORE UPDATE ON product_personas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_product_personas_product_id ON product_personas(product_id);
CREATE INDEX IF NOT EXISTS idx_product_personas_is_primary ON product_personas(is_primary);

-- 设置行级安全策略（RLS）
ALTER TABLE product_personas ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "用户只能查看自己的产品用户画像" ON product_personas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_personas.product_id 
            AND products.owner_id = auth.uid()
        )
    );

-- 授予权限
GRANT ALL ON product_personas TO authenticated;
GRANT SELECT ON product_personas TO anon;
