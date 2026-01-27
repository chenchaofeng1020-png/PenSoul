-- Create system_invitation_codes table
create table if not exists public.system_invitation_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  type text check (type in ('one_time', 'unlimited')) default 'one_time',
  max_uses int default 1,
  used_count int default 0,
  expires_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.system_invitation_codes enable row level security;

-- Policy: Service Role only (our API will use service key)
create policy "Enable access for service role only" on public.system_invitation_codes
  as permissive for all
  to service_role
  using (true)
  with check (true);

-- Insert some initial codes for testing (Optional)
-- insert into public.system_invitation_codes (code, max_uses) values ('WELCOME2024', 100);
