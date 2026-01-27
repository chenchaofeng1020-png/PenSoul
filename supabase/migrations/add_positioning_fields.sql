ALTER TABLE products 
ADD COLUMN IF NOT EXISTS pain_point text,
ADD COLUMN IF NOT EXISTS product_category text,
ADD COLUMN IF NOT EXISTS key_benefit text,
ADD COLUMN IF NOT EXISTS core_competitor text,
ADD COLUMN IF NOT EXISTS differentiation text;
