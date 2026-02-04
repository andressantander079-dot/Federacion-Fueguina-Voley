-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Documents Public Read" ON documents;
DROP POLICY IF EXISTS "Documents Admin All" ON documents;

-- Allow Public to Read
CREATE POLICY "Documents Public Read"
ON documents
FOR SELECT
TO public
USING (true); -- Or visible = true if that column exists

-- Allow Admins to Management
CREATE POLICY "Documents Admin All"
ON documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
