-- Create ideas table
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'incubating' check (status in ('incubating', 'converted')),
  messages jsonb default '[]'::jsonb,
  structured_data jsonb default '{}'::jsonb,
  converted_product_id uuid references products(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table ideas enable row level security;

-- Policies

-- 1. Users can view their own ideas
create policy "Users can view own ideas"
  on ideas for select
  using (auth.uid() = owner_id);

-- 2. Users can insert their own ideas
create policy "Users can insert own ideas"
  on ideas for insert
  with check (auth.uid() = owner_id);

-- 3. Users can update their own ideas
create policy "Users can update own ideas"
  on ideas for update
  using (auth.uid() = owner_id);

-- 4. Users can delete their own ideas
create policy "Users can delete own ideas"
  on ideas for delete
  using (auth.uid() = owner_id);

-- Create index on owner_id for performance
create index if not exists idx_ideas_owner on ideas(owner_id);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_ideas_updated_at
  before update on ideas
  for each row
  execute function update_updated_at_column();
