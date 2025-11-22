-- 扩展现有products表，添加产品资料相关字段
ALTER TABLE products ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS value_proposition TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_features JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_points JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_info JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'development', 'deprecated'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 为产品卖点创建单独的表，支持更复杂的结构
CREATE TABLE IF NOT EXISTS product_selling_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为产品特性创建单独的表，支持层级结构
CREATE TABLE IF NOT EXISTS product_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    feature_type TEXT DEFAULT 'core' CHECK (feature_type IN ('core', 'secondary', 'experimental')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'planned', 'deprecated')),
    parent_id UUID REFERENCES product_features(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建产品版本历史表
CREATE TABLE IF NOT EXISTS product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    release_notes TEXT DEFAULT '',
    release_date DATE,
    status TEXT DEFAULT 'stable' CHECK (status IN ('stable', 'beta', 'alpha', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 添加触发器更新时间戳
CREATE TRIGGER update_product_selling_points_updated_at 
    BEFORE UPDATE ON product_selling_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_features_updated_at 
    BEFORE UPDATE ON product_features 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_product_selling_points_product_id ON product_selling_points(product_id);
CREATE INDEX IF NOT EXISTS idx_product_selling_points_priority ON product_selling_points(priority);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);
CREATE INDEX IF NOT EXISTS idx_product_features_parent_id ON product_features(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_versions_product_id ON product_versions(product_id);

-- 设置行级安全策略（RLS）
ALTER TABLE product_selling_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "用户只能查看自己的产品卖点" ON product_selling_points
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_selling_points.product_id 
            AND products.owner_id = auth.uid()
        )
    );

CREATE POLICY "用户只能查看自己的产品特性" ON product_features
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_features.product_id 
            AND products.owner_id = auth.uid()
        )
    );

CREATE POLICY "用户只能查看自己的产品版本" ON product_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_versions.product_id 
            AND products.owner_id = auth.uid()
        )
    );

-- 授予权限
GRANT ALL ON product_selling_points TO authenticated;
GRANT ALL ON product_features TO authenticated;
GRANT ALL ON product_versions TO authenticated;
GRANT SELECT ON product_selling_points TO anon;
GRANT SELECT ON product_features TO anon;
GRANT SELECT ON product_versions TO anon;