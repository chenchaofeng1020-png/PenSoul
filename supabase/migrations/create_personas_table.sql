-- Create personas table
create table if not exists personas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  avatar_style text,
  role_definition text,
  
  -- Core: Style DNA (Extracted by Old K, read by A Qiang)
  style_dna jsonb default '{}'::jsonb,
  
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table personas enable row level security;

create policy "Users can view their own personas"
  on personas for select
  using (auth.uid() = user_id);

create policy "Users can insert their own personas"
  on personas for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own personas"
  on personas for update
  using (auth.uid() = user_id);

create policy "Users can delete their own personas"
  on personas for delete
  using (auth.uid() = user_id);
