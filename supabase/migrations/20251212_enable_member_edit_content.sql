-- Enable members to edit content planning (content_plans, content_items)

-- Helper: can_edit_product (owner/admin/member)
create or replace function public.can_edit_product(_product_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from products
    where id = _product_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1 from product_members
    where product_id = _product_id
      and user_id = auth.uid()
      and role in ('owner','admin','member')
  );
$$;

-- Content Plans: allow insert/update/delete for owners, admins, members
alter table content_plans enable row level security;
drop policy if exists content_plans_cud_own on content_plans;
drop policy if exists "Edit Content Plans" on content_plans;
create policy "Edit Content Plans"
  on content_plans for all
  using (
    public.can_edit_product(product_id)
  )
  with check (
    public.can_edit_product(product_id)
  );

-- Content Items: allow insert/update/delete for owners, admins, members
alter table content_items enable row level security;
drop policy if exists content_items_cud_own on content_items;
drop policy if exists "Edit Content Items" on content_items;
create policy "Edit Content Items"
  on content_items for all
  using (
    public.can_edit_product(product_id)
  )
  with check (
    public.can_edit_product(product_id)
  );

