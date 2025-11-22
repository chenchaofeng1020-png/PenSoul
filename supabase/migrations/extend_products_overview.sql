-- products 概览字段扩展（Postgres / Supabase）
ALTER TABLE products ADD COLUMN IF NOT EXISTS overview_short text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS positioning text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS docs_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS demo_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS download_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS release_date date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lifecycle_stage text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_points jsonb DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS use_cases jsonb DEFAULT '[]'::jsonb;

-- 文档与 FAQ 表（若尚未创建）
CREATE TABLE IF NOT EXISTS product_docs (
  id bigserial PRIMARY KEY,
  product_id bigint NOT NULL,
  title text NOT NULL,
  doc_type text NOT NULL,
  url text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  "order" int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_docs_product_id ON product_docs(product_id);

CREATE TABLE IF NOT EXISTS product_faqs (
  id bigserial PRIMARY KEY,
  product_id bigint NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  "order" int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON product_faqs(product_id);

-- 如产品ID为 uuid，可改 product_id 类型为 uuid 并使用相应索引