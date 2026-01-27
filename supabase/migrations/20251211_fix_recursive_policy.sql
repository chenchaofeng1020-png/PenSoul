-- Fix infinite recursion in RLS policies for product_members

-- 1. Drop problematic policies that cause recursion
drop policy if exists "Members can view other members" on product_members;
drop policy if exists "Admins can update members" on product_members;
drop policy if exists "Admins can delete members" on product_members;
drop policy if exists "Admins can insert members" on product_members;

-- 2. Create Security Definer functions to break recursion
-- These functions run with the privileges of the creator (postgres), bypassing RLS on the table
create or replace function public.is_product_member(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from product_members
    where product_id = _product_id
    and user_id = auth.uid()
  );
$$;

create or replace function public.is_product_admin(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from product_members
    where product_id = _product_id
    and user_id = auth.uid()
    and role in ('owner', 'admin')
  );
$$;

-- 3. Re-create policies using the safe functions

-- Members of a product can view other members of the same product
create policy "Members can view other members"
  on product_members for select
  using (
    public.is_product_member(product_id)
  );

-- Admins can update members
create policy "Admins can update members"
  on product_members for update
  using (
    public.is_product_admin(product_id)
  );

-- Admins can delete members
create policy "Admins can delete members"
  on product_members for delete
  using (
    public.is_product_admin(product_id)
  );
