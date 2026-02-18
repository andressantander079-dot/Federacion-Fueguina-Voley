
-- 1. Disable RLS temporarily to clean up policies
ALTER TABLE public.match_lineups DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_lineups;
DROP POLICY IF EXISTS "Clubs can manage their own lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Users can manage lineups" ON public.match_lineups;

-- 3. Re-enable RLS
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- 4. Create PERMISSIVE policy for Authenticated Users (Clubs, Referees, Admins)
-- This allows anyone logged in to Insert/Update/Delete lineups.
-- Since line-ups are tied to match_id/team_id, the UI handles the filtering.
CREATE POLICY "Enable all access for authenticated users"
ON public.match_lineups
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 5. Create READ-ONLY policy for Anonymous Users (Public View)
CREATE POLICY "Enable read access for all users"
ON public.match_lineups
FOR SELECT
USING (true);
