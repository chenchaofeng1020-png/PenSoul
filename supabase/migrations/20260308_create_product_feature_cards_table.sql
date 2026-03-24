-- 创建产品功能卡片表 (product_feature_cards)
-- 用于存储产品的功能卡片数据

CREATE TABLE IF NOT EXISTS product_feature_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    "order" INTEGER DEFAULT 0,
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

CREATE TRIGGER update_product_feature_cards_updated_at 
    BEFORE UPDATE ON product_feature_cards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_product_feature_cards_product_id ON product_feature_cards(product_id);
CREATE INDEX IF NOT EXISTS idx_product_feature_cards_order ON product_feature_cards("order");

-- 设置行级安全策略（RLS）
ALTER TABLE product_feature_cards ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "用户只能查看自己的产品功能卡片" ON product_feature_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_feature_cards.product_id 
            AND products.owner_id = auth.uid()
        )
    );

-- 授予权限
GRANT ALL ON product_feature_cards TO authenticated;
GRANT SELECT ON product_feature_cards TO anon;
