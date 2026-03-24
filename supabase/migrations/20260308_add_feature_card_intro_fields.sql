-- 为 product_feature_cards 表添加功能介绍相关字段

ALTER TABLE product_feature_cards
ADD COLUMN IF NOT EXISTS intro_source TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS intro_scenario TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS intro_problem TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS intro_solution TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS intro_effect TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS launch_date DATE DEFAULT NULL;

-- 更新现有数据，将 description 字段复制到 intro_solution 和 intro_effect（作为默认值）
UPDATE product_feature_cards 
SET intro_solution = COALESCE(intro_solution, description),
    intro_effect = COALESCE(intro_effect, description)
WHERE intro_solution = '' OR intro_effect = '';
