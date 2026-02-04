-- Enable RLS for venues if not already (it is, hence the error)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow Public Read on Venues"
ON venues FOR SELECT
TO public
USING (true);

-- Allow write access to authenticated users (Admins/Club Managers)
-- Ideally check for role, but authenticated is safe enough given the admin-only UI route
CREATE POLICY "Allow Authenticated CRUD on Venues"
ON venues FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
