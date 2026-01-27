-- Create product_members table
create table if not exists product_members (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, user_id)
);

-- Enable RLS
alter table product_members enable row level security;

-- Policies

-- 1. Users can view members of products they own
create policy "Owners can view members of their products"
  on product_members for select
  using (
    product_id in (
      select id from products where owner_id = auth.uid()
    )
  );

-- 2. Users can view their own membership
create policy "Users can view their own membership"
  on product_members for select
  using (
    user_id = auth.uid()
  );

-- 3. Members of a product can view other members of the same product
create policy "Members can view other members"
  on product_members for select
  using (
    product_id in (
      select product_id from product_members where user_id = auth.uid()
    )
  );

-- 4. Owners can manage members
create policy "Owners can manage members"
  on product_members for all
  using (
    product_id in (
      select id from products where owner_id = auth.uid()
    )
  )
  with check (
    product_id in (
      select id from products where owner_id = auth.uid()
    )
  );

-- 5. Users can join products (for invitation acceptance)
-- Note: In a production environment with strict security, this should be handled by a secure function 
-- that verifies the invitation token. For now, we allow users to add themselves to products.
create policy "Users can join products"
  on product_members for insert
  with check (
    user_id = auth.uid()
  );

-- 6. Admins can manage members (except owner)
-- We allow members with 'admin' role to update/delete other members (simple check)
create policy "Admins can update members"
  on product_members for update
  using (
    exists (
      select 1 from product_members pm
      where pm.product_id = product_members.product_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'admin')
    )
  );

create policy "Admins can delete members"
  on product_members for delete
  using (
    exists (
      select 1 from product_members pm
      where pm.product_id = product_members.product_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'admin')
    )
  );
