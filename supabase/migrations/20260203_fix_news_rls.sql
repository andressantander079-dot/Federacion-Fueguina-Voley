-- Enable RLS on news table (if not already)
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read News" ON news;
DROP POLICY IF EXISTS "Admin Manage News" ON news;

-- Allow Public to Read ONLY Published News
CREATE POLICY "Public Read News"
ON news
FOR SELECT
TO public
USING (status = 'published');

-- Allow Admins (Authenticated) to Valid Everything
CREATE POLICY "Admin Manage News"
ON news
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
