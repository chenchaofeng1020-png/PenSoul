-- 批量生成 100 个一次性邀请码
-- 邀请码格式：8位字符，包含大写字母和数字
-- 已去除易混淆字符：I, O, 0, 1
-- 字符集：ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (共32个)

INSERT INTO public.system_invitation_codes (code, type, max_uses)
SELECT
  (
    SELECT array_to_string(array_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1)
    ), '')
    FROM generate_series(1, 8) -- 生成8位长度
  ) as code,
  'one_time', -- 类型：一次性
  1           -- 最大使用次数：1
FROM generate_series(1, 100)  -- 生成100个
ON CONFLICT (code) DO NOTHING; -- 如果运气极差生成了重复的，则跳过

-- 查询生成的邀请码
-- SELECT * FROM public.system_invitation_codes ORDER BY created_at DESC LIMIT 100;
