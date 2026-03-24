-- Create smart_sources table
create table if not exists public.smart_sources (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  content text,
  storage_path text,
  status text default 'pending', -- pending, processed, error
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create smart_chats table
create table if not exists public.smart_chats (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  title text,
  messages jsonb default '[]'::jsonb, -- Array of {role, content, timestamp}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create smart_notes table
create table if not exists public.smart_notes (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  title text not null,
  content text,
  type text not null, -- xiaohongshu, architecture, prd, etc.
  is_pinned boolean default false,
  source_refs jsonb default '[]'::jsonb, -- Array of source IDs used
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.smart_sources enable row level security;
alter table public.smart_chats enable row level security;
alter table public.smart_notes enable row level security;

-- Policies for smart_sources
create policy "Users can view sources for their products"
  on public.smart_sources for select
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_sources.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_sources.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can insert sources for their products"
  on public.smart_sources for insert
  with check (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_sources.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_sources.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can update sources for their products"
  on public.smart_sources for update
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_sources.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_sources.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can delete sources for their products"
  on public.smart_sources for delete
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_sources.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_sources.product_id
      and products.owner_id = auth.uid()
    )
  );

-- Policies for smart_chats (similar logic)
create policy "Users can view chats for their products"
  on public.smart_chats for select
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_chats.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_chats.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can insert chats for their products"
  on public.smart_chats for insert
  with check (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_chats.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_chats.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can update chats for their products"
  on public.smart_chats for update
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_chats.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_chats.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can delete chats for their products"
  on public.smart_chats for delete
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_chats.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_chats.product_id
      and products.owner_id = auth.uid()
    )
  );


-- Policies for smart_notes (similar logic)
create policy "Users can view notes for their products"
  on public.smart_notes for select
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_notes.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_notes.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can insert notes for their products"
  on public.smart_notes for insert
  with check (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_notes.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_notes.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can update notes for their products"
  on public.smart_notes for update
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_notes.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_notes.product_id
      and products.owner_id = auth.uid()
    )
  );

create policy "Users can delete notes for their products"
  on public.smart_notes for delete
  using (
    exists (
      select 1 from public.product_members
      where product_members.product_id = smart_notes.product_id
      and product_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.products
      where products.id = smart_notes.product_id
      and products.owner_id = auth.uid()
    )
  );
