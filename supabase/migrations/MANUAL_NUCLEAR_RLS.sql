-- EJECUTAR EN SUPABASE SQL EDITOR
-- SCRIPT DE "LIMPIEZA Y HABILITACION" DE PERMISOS (NUCLEAR)

-- 1. LIMPIAR TODAS LAS POLÍTICAS DE MATCH_LINEUPS (Para evitar conflictos)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_lineups;
DROP POLICY IF EXISTS "Clubs can manage their own lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Users can insert their own lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Users can update their own lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Users can delete their own lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "FIX_ALL_ACCESS" ON public.match_lineups;
DROP POLICY IF EXISTS "FIX_PUBLIC_READ" ON public.match_lineups;

-- 2. RESETEAR RLS (Apagar y Prender)
ALTER TABLE public.match_lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- 3. CREAR NUEVA POLÍTICA PERMISIVA (Para Clubes Logueados)
CREATE POLICY "PERMITIR_TODO_CLUBES"
ON public.match_lineups
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. CREAR NUEVA POLÍTICA DE LECTURA PÚBLICA (Para ver la planilla en vivo)
CREATE POLICY "PERMITIR_LECTURA_PUBLICA"
ON public.match_lineups
FOR SELECT
USING (true);


-- 5. CORREGIR PERMISOS DE BORRADO DE PARTIDOS (MATCHES)
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.matches;
DROP POLICY IF EXISTS "FIX_ADMIN_DELETE" ON public.matches;

CREATE POLICY "PERMITIR_BORRAR_ADMIN"
ON public.matches
FOR DELETE
USING (auth.role() = 'authenticated');

-- FIN DEL SCRIPT
