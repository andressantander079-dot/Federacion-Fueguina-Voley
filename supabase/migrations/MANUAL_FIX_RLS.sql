-- EJECUTAR EN SUPABASE SQL EDITOR

-- 1. Permitir a los Clubes gestionar sus planillas
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;

CREATE POLICY "Enable all access for authenticated users"
ON public.match_lineups FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 2. Permitir a los Admins borrar partidos
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.matches;

CREATE POLICY "Enable delete for authenticated users"
ON public.matches FOR DELETE
USING (auth.role() = 'authenticated');
