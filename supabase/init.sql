create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  website_url text default '',
  logo_url text default '',
  created_at timestamptz default now()
);

-- 兼容前端“产品定义”模块所需字段
alter table products add column if not exists tagline text;
alter table products add column if not exists positioning text;
alter table products add column if not exists value_proposition text;
alter table products add column if not exists target_audience text;
alter table products add column if not exists category text;
alter table products add column if not exists status text default 'active';
alter table products add column if not exists version text;
alter table products add column if not exists release_date date;
alter table products add column if not exists industry text;
alter table products add column if not exists docs_url text;
alter table products add column if not exists demo_url text;
alter table products add column if not exists download_url text;
alter table products add column if not exists lifecycle_stage text;
alter table products add column if not exists key_points jsonb default '[]'::jsonb;
alter table products add column if not exists use_cases jsonb default '[]'::jsonb;
alter table products add column if not exists tags jsonb default '[]'::jsonb;
alter table products add column if not exists overview_short text;
alter table products add column if not exists pain_point text;
alter table products add column if not exists product_category text;
alter table products add column if not exists key_benefit text;
alter table products add column if not exists core_competitor text;
alter table products add column if not exists differentiation text;
alter table products add column if not exists competitive_highlights text default '';

create index if not exists idx_products_owner on products(owner_id);

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  slogan text default '',
  description text default '',
  website_url text default '',
  documentation_url text default '',
  logo_url text default '',
  main_customers text default '',
  competitive_highlights text default '',
  positioning text default '',
  features text default '',
  created_at timestamptz default now()
);

-- 确保 competitors 表字段存在（用于兼容旧表）
alter table competitors add column if not exists competitive_highlights text default '';
alter table competitors add column if not exists positioning text default '';
alter table competitors add column if not exists features text default '';

create index if not exists idx_competitors_product on competitors(product_id);

create table if not exists screenshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  competitor_id uuid references competitors(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists idx_screenshots_prod_comp on screenshots(product_id, competitor_id);

alter table products enable row level security;
alter table competitors enable row level security;
alter table screenshots enable row level security;

drop policy if exists products_select_own on products;
drop policy if exists products_insert_own on products;
drop policy if exists products_update_own on products;
drop policy if exists products_delete_own on products;

create policy products_select_own on products for select using (owner_id = auth.uid());
create policy products_insert_own on products for insert with check (owner_id = auth.uid());
create policy products_update_own on products for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy products_delete_own on products for delete using (owner_id = auth.uid());

drop policy if exists competitors_select_own on competitors;
drop policy if exists competitors_cud_own on competitors;

create policy competitors_select_own on competitors for select using (
  product_id in (select id from products where owner_id = auth.uid())
);
create policy competitors_cud_own on competitors for all using (
  product_id in (select id from products where owner_id = auth.uid())
) with check (
  product_id in (select id from products where owner_id = auth.uid())
);

drop policy if exists screenshots_select_own on screenshots;
drop policy if exists screenshots_cud_own on screenshots;

create policy screenshots_select_own on screenshots for select using (
  product_id in (select id from products where owner_id = auth.uid())
);
create policy screenshots_cud_own on screenshots for all using (
  product_id in (select id from products where owner_id = auth.uid())
) with check (
  product_id in (select id from products where owner_id = auth.uid())
);

-- 内容规划表
create table if not exists content_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  name text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references content_plans(id) on delete set null,
  product_id uuid not null references products(id) on delete cascade,
  platform text not null,
  title text not null,
  body text,
  assets jsonb default '[]'::jsonb,
  schedule_at timestamptz not null,
  repeat_rule jsonb,
  status text default 'draft',
  assignee_id uuid,
  actual_url text,
  metrics jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_content_items_product_schedule on content_items(product_id, schedule_at);

alter table content_plans enable row level security;
alter table content_items enable row level security;

drop policy if exists content_plans_select_own on content_plans;
drop policy if exists content_plans_cud_own on content_plans;
create policy content_plans_select_own on content_plans for select using (owner_id = auth.uid());
create policy content_plans_cud_own on content_plans for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists content_items_select_own on content_items;
drop policy if exists content_items_cud_own on content_items;
create policy content_items_select_own on content_items for select using (
  product_id in (select id from products where owner_id = auth.uid())
);
create policy content_items_cud_own on content_items for all using (
  product_id in (select id from products where owner_id = auth.uid())
) with check (
  product_id in (select id from products where owner_id = auth.uid())
);

drop policy if exists storage_select_own on storage.objects;
drop policy if exists storage_insert_own on storage.objects;
drop policy if exists storage_delete_own on storage.objects;

create policy storage_select_own on storage.objects for select using (
  bucket_id = 'screenshots'
);
create policy storage_insert_own on storage.objects for insert with check (
  bucket_id = 'screenshots'
);
create policy storage_delete_own on storage.objects for delete using (
  bucket_id = 'screenshots'
);

-- 创建并公开 logos 存储桶
insert into storage.buckets (id, name, public) 
values ('logos', 'logos', true)
on conflict (id) do nothing;


drop policy if exists logos_select_public on storage.objects;
drop policy if exists logos_insert_public on storage.objects;
drop policy if exists logos_delete_public on storage.objects;

create policy logos_select_public on storage.objects for select using (
  bucket_id = 'logos'
);
create policy logos_insert_public on storage.objects for insert with check (
  bucket_id = 'logos'
);
create policy logos_delete_public on storage.objects for delete using (
  bucket_id = 'logos'
);
