-- 创建产品营销文案表 (product_messaging)
-- 用于存储产品的营销文案和价值传递信息

CREATE TABLE IF NOT EXISTS product_messaging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    msg_type TEXT DEFAULT 'general',
    persona TEXT DEFAULT '',
    channel TEXT DEFAULT '',
    pain TEXT DEFAULT '',
    anchor_message TEXT DEFAULT '',
    benefit TEXT DEFAULT '',
    evidence TEXT DEFAULT '',
    content TEXT DEFAULT '',
    target_audience TEXT DEFAULT '',
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

CREATE TRIGGER update_product_messaging_updated_at 
    BEFORE UPDATE ON product_messaging 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_product_messaging_product_id ON product_messaging(product_id);
CREATE INDEX IF NOT EXISTS idx_product_messaging_msg_type ON product_messaging(msg_type);

-- 设置行级安全策略（RLS）
ALTER TABLE product_messaging ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "用户只能查看自己的产品营销文案" ON product_messaging
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = product_messaging.product_id 
            AND products.owner_id = auth.uid()
        )
    );

-- 授予权限
GRANT ALL ON product_messaging TO authenticated;
GRANT SELECT ON product_messaging TO anon;
