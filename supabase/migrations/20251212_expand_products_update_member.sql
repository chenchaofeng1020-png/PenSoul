-- Allow members (not just admins) to update products
alter table products enable row level security;

create or replace function public.is_product_member_or_admin(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from product_members
    where product_id = _product_id
      and user_id = auth.uid()
      and role in ('owner','admin','member')
  );
$$;

drop policy if exists "Admins can update products" on products;
drop policy if exists "Members can update products" on products;
create policy "Members can update products"
  on products for update
  using (
    owner_id = auth.uid()
    or public.is_product_member_or_admin(id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_product_member_or_admin(id)
  );

