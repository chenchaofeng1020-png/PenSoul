-- Content Domain Migration: Inspiration Inbox & Content Topics

-- 1. Inspiration Inbox Table
-- Stores raw materials collected from trends, user input, or external links.
create table if not exists inspiration_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('trend', 'pain_point', 'article')), -- 'trend': from hot trends, 'pain_point': user input, 'article': external link
  content text not null, -- The actual text content or URL
  source text, -- Source platform or origin (e.g., 'weibo', 'manual', '36kr')
  meta_data jsonb default '{}'::jsonb, -- AI analyzed structured data (core_view, highlights, etc.)
  tags text[] default '{}', -- User defined tags for filtering
  is_archived boolean default false,
  created_at timestamptz default now()
);

-- Index for fast retrieval by user
create index if not exists idx_inspiration_user on inspiration_inbox(user_id);

-- 2. Content Topics Table
-- Stores generated topic ideas and their subsequent outlines.
-- This is distinct from 'product ideas' and focuses on content creation.
create table if not exists content_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, -- The generated topic title
  status text default 'draft' check (status in ('draft', 'planned', 'writing', 'published')),
  generation_mode text, -- The angle mode used (e.g., 'counter_intuitive', 'niche', 'listicle')
  source_inspiration_ids uuid[], -- Array of inspiration_inbox IDs used to generate this topic
  candidates jsonb default '[]'::jsonb, -- Store the 3 initial AI generated options (for draft state)
  selected_candidate_index int, -- Which candidate was selected (if any)
  outline jsonb, -- The detailed framework/outline generated for the selected topic
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast retrieval by user
create index if not exists idx_content_topics_user on content_topics(user_id);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_content_topics_updated_at
before update on content_topics
for each row
execute function update_updated_at_column();
