create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  product_id uuid not null references products(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  invited_by uuid,
  invited_by_email text,
  product_name text,
  product_logo text,
  expires_at timestamptz not null,
  status text default 'pending',
  created_at timestamptz default now(),
  used_at timestamptz
);

alter table invitations enable row level security;
drop policy if exists "View Invitations By Owner" on invitations;
create policy "View Invitations By Owner"
  on invitations for select
  using (
    product_id in (
      select id from products where owner_id = auth.uid()
    )
  );

