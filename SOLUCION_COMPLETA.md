# 🚨 SOLUCIÓN DEFINITIVA (LOGIN + PLANILLAS + BORRADO)

Copia TODO este bloque y ejecútalo una sola vez en Supabase SQL Editor para arreglar todos los problemas de permisos.

```sql
-- 1. ARREGLAR LOGIN (PERFILES)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. ARREGLAR PLANILLAS (SQUADS)
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_lineups;

CREATE POLICY "Enable all access for authenticated users"
ON public.match_lineups FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users"
ON public.match_lineups FOR SELECT
USING (true);

-- 3. ARREGLAR BORRADO DE PARTIDOS (ADMIN)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.matches;

CREATE POLICY "Enable delete for authenticated users"
ON public.matches FOR DELETE
USING (auth.role() = 'authenticated');
```
