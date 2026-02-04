-- Add new columns for News Upgrade
ALTER TABLE news
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- Migrate existing 'archived' boolean to status
UPDATE news SET status = 'archived' WHERE archived = true;
UPDATE news SET status = 'published' WHERE archived = false;

-- Drop old column if desired, or keep as backup. User said "remove obsolete".
-- ALTER TABLE news DROP COLUMN archived; 
-- I will keep it for safety for now, but update logic to use 'status'.
