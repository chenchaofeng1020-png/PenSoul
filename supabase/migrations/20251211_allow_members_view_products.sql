-- Allow members to view products
drop policy if exists products_select_own on products;

create policy "Users can view products they own or are members of"
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

-- Also update competitors and other related tables to allow members to view
drop policy if exists competitors_select_own on competitors;
create policy "Users can view competitors of products they have access to"
  on competitors for select
  using (
    exists (
      select 1 from products
      where id = competitors.product_id
      -- The products policy will handle the check, or we can duplicate logic for performance
      -- Relying on products RLS is safer but might be slightly slower.
      -- Let's duplicate logic for clarity and robustness against recursion risks if any.
      and (
        owner_id = auth.uid()
        or
        exists (
          select 1 from product_members
          where product_id = products.id
          and user_id = auth.uid()
        )
      )
    )
  );

-- For simplicity, let's create a helper function for "can view product" to reuse
create or replace function public.can_view_product(_product_id uuid)
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
  or
  exists (
    select 1 from product_members
    where product_id = _product_id
    and user_id = auth.uid()
  );
$$;

-- Now apply this function to policies
drop policy if exists "Users can view products they own or are members of" on products;
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

-- Re-do competitors with simple check (using the fact that we can now query products safely? 
-- actually better to just use the direct logic to avoid dependency chains)

drop policy if exists "Users can view competitors of products they have access to" on competitors;
create policy "Users can view competitors"
  on competitors for select
  using (
    public.can_view_product(product_id)
  );

-- Screenshots
drop policy if exists screenshots_select_own on screenshots;
create policy "Users can view screenshots"
  on screenshots for select
  using (
    public.can_view_product(product_id)
  );

-- Content Plans
drop policy if exists content_plans_select_own on content_plans;
create policy "Users can view content plans"
  on content_plans for select
  using (
    public.can_view_product(product_id)
  );

-- Content Items
drop policy if exists content_items_select_own on content_items;
create policy "Users can view content items"
  on content_items for select
  using (
    public.can_view_product(product_id)
  );
