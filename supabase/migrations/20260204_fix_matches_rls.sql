-- Enable RLS on matches table just in case
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.matches;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.matches;

-- 1. READ: Allow public access (home page, fixture, etc.)
CREATE POLICY "Enable read access for all users" 
ON public.matches FOR SELECT 
USING (true);

-- 2. WRITE: Allow authenticated users (Admins, Planilleros) to manage matches
-- Applies to INSERT, UPDATE, DELETE
CREATE POLICY "Enable all access for authenticated users" 
ON public.matches FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
