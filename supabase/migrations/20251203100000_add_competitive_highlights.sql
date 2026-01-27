-- 添加 competitive_highlights 字段到 products 表
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitive_highlights TEXT DEFAULT '';

-- 补全 competitors 表的缺失字段
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS competitive_highlights TEXT DEFAULT '';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS positioning TEXT DEFAULT '';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS features TEXT DEFAULT '';
