-- Add is_public column to ideas table
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS ideas_is_public_idx ON ideas(is_public);
