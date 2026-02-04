-- Fix RLS policies for settings table to ensure updates work
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.settings;

-- Re-create policies with explicit permissions
CREATE POLICY "Enable read access for all users" 
ON public.settings FOR SELECT 
USING (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.settings FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" 
ON public.settings FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
