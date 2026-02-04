-- 1. UPGRADE NEWS TABLE
ALTER TABLE news
ADD COLUMN IF NOT EXISTS body TEXT, -- Ensure body exists
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- Migrate existing status
UPDATE news SET status = 'archived' WHERE archived = true;
UPDATE news SET status = 'published' WHERE archived = false AND status = 'draft'; 

-- 2. FIX STORAGE (News Images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all old policies to be clean
DROP POLICY IF EXISTS "Allow Authenticated Uploads News" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read News" ON storage.objects;
DROP POLICY IF EXISTS "News Images Access" ON storage.objects;
DROP POLICY IF EXISTS "News Images Admin Access" ON storage.objects;
DROP POLICY IF EXISTS "News Images Public Read" ON storage.objects;

-- Admin/Authenticated Access
CREATE POLICY "News Images Admin Access"
ON storage.objects
FOR ALL
TO authenticated
USING ( bucket_id = 'news-images' )
WITH CHECK ( bucket_id = 'news-images' );

-- Public Read Access
CREATE POLICY "News Images Public Read"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'news-images' );

-- 3. RELOAD SCHEMA CACHE (Implicitly happens with DDL)
COMMENT ON TABLE news IS 'News articles with upgraded features';
