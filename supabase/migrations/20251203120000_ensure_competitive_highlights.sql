-- 确保 products 表有 competitive_highlights 字段
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitive_highlights TEXT DEFAULT '';

-- 确保 competitors 表有相关字段
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS competitive_highlights TEXT DEFAULT '';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS positioning TEXT DEFAULT '';
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS features TEXT DEFAULT '';
