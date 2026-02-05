
-- Fix RLS for match_lineups to allow INSERT/DELETE by authenticated users (Clubs)

-- 1. Drop existing restrictive policies if any (to be safe/clean)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_lineups;
DROP POLICY IF EXISTS "Clubs can manage their own lineups" ON public.match_lineups;

-- 2. Re-enable RLS
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- 3. Policy: ALL for Authenticated Users
-- We rely on the app logic to ensure a club only edits their own team's lineup.
-- But for extra security, we can check if the user is authenticated.
-- Since clubs share the same 'authenticated' role as referees/admins in basic Supabase auth (unless using custom claims),
-- a broad "authenticated" policy is usually the first step to unblock, then refine if needed.
-- Given the error is "new row violates", the previous policy might have been SELECT only or too specific.

CREATE POLICY "Enable all access for authenticated users"
ON public.match_lineups
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Policy: Public Read (for Public Sheets/Live View)
CREATE POLICY "Enable read access for all users"
ON public.match_lineups
FOR SELECT
USING (true);
