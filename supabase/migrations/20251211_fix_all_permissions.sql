-- Consolidated RLS Fix for Product Duck
-- Run this script to fix all permission issues for team members

-- 1. Helper Functions (Security Definer to bypass RLS recursion)
create or replace function public.check_product_access(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  -- Check if user is owner or member
  select exists (
    select 1 from products where id = _product_id and owner_id = auth.uid()
  ) or exists (
    select 1 from product_members where product_id = _product_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_product_member(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from product_members where product_id = _product_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_product_admin(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from product_members where product_id = _product_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- 2. Update Products Table Policies
alter table products enable row level security;
drop policy if exists products_select_own on products;
drop policy if exists "Users can view products they own or are members of" on products;
drop policy if exists "Users can view products they have access to" on products;

create policy "Users can view products they have access to"
  on products for select
  using (
    owner_id = auth.uid()
    or
    exists (
      select 1 from product_members
      where product_id = products.id
      and user_id = auth.uid()
    )
  );

-- 3. Update Product Members Table Policies
alter table product_members enable row level security;
drop policy if exists "Members can view other members" on product_members;
drop policy if exists "Admins can update members" on product_members;
drop policy if exists "Admins can delete members" on product_members;
drop policy if exists "Admins can insert members" on product_members;
drop policy if exists "Owners can view members of their products" on product_members;
drop policy if exists "Users can view their own membership" on product_members;
drop policy if exists "Owners can manage members" on product_members;
drop policy if exists "Users can join products" on product_members;

-- Allow users to see members of products they belong to
create policy "View Members"
  on product_members for select
  using (
    public.check_product_access(product_id)
  );

-- Allow admins/owners to manage members
create policy "Manage Members"
  on product_members for all
  using (
    public.is_product_admin(product_id)
  );

-- Allow users to join (for accepting invitations)
create policy "Join Product"
  on product_members for insert
  with check (
    user_id = auth.uid()
  );

-- 4. Update Related Tables (Competitors, etc.)
-- Competitors
drop policy if exists competitors_select_own on competitors;
drop policy if exists "Users can view competitors" on competitors;
drop policy if exists "Users can view competitors of products they have access to" on competitors;
create policy "View Competitors"
  on competitors for select
  using (
    public.check_product_access(product_id)
  );

-- Screenshots
drop policy if exists screenshots_select_own on screenshots;
drop policy if exists "Users can view screenshots" on screenshots;
create policy "View Screenshots"
  on screenshots for select
  using (
    public.check_product_access(product_id)
  );

-- Content Plans
drop policy if exists content_plans_select_own on content_plans;
drop policy if exists "Users can view content plans" on content_plans;
create policy "View Content Plans"
  on content_plans for select
  using (
    public.check_product_access(product_id)
  );

-- Content Items
drop policy if exists content_items_select_own on content_items;
drop policy if exists "Users can view content items" on content_items;
create policy "View Content Items"
  on content_items for select
  using (
    public.check_product_access(product_id)
  );

-- Product Selling Points
drop policy if exists "用户只能查看自己的产品卖点" on product_selling_points;
create policy "View Selling Points"
  on product_selling_points for select
  using (
    public.check_product_access(product_id)
  );

-- Product Features
drop policy if exists "用户只能查看自己的产品特性" on product_features;
create policy "View Features"
  on product_features for select
  using (
    public.check_product_access(product_id)
  );
