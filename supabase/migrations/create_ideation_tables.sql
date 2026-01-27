-- Create ideation_sessions table
CREATE TABLE IF NOT EXISTS ideation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  persona_id TEXT, -- e.g., 'p_tech_01'
  title TEXT DEFAULT '新策划',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ideation_messages table
CREATE TABLE IF NOT EXISTS ideation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ideation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ideation_topics table
CREATE TABLE IF NOT EXISTS ideation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ideation_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  angle TEXT, -- e.g., '情绪', '商业'
  hook TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'published')),
  schedule_date DATE,
  detail_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE ideation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideation_topics ENABLE ROW LEVEL SECURITY;

-- Policies for ideation_sessions
CREATE POLICY "Users can view their own sessions"
  ON ideation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON ideation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON ideation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON ideation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for ideation_messages
CREATE POLICY "Users can view messages of their sessions"
  ON ideation_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ideation_sessions
    WHERE ideation_sessions.id = ideation_messages.session_id
    AND ideation_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their sessions"
  ON ideation_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ideation_sessions
    WHERE ideation_sessions.id = ideation_messages.session_id
    AND ideation_sessions.user_id = auth.uid()
  ));

-- Policies for ideation_topics
CREATE POLICY "Users can view topics of their sessions"
  ON ideation_topics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ideation_sessions
    WHERE ideation_sessions.id = ideation_topics.session_id
    AND ideation_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert topics to their sessions"
  ON ideation_topics FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ideation_sessions
    WHERE ideation_sessions.id = ideation_topics.session_id
    AND ideation_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can update topics of their sessions"
  ON ideation_topics FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ideation_sessions
    WHERE ideation_sessions.id = ideation_topics.session_id
    AND ideation_sessions.user_id = auth.uid()
  ));
