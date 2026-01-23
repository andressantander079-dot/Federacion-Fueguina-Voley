-- SCRIPT COMPLETO DE REPARACIÓN
-- Ejecuta todo esto junto para asegurar que la tabla 'squads' existe y funciona.

-- 1. Crear la tabla 'squads' (Si no existe)
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    coach_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar que la tabla 'players' tenga la columna 'squad_id'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='squad_id') THEN 
        ALTER TABLE public.players ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL; 
    END IF;
END $$;

-- 3. Habilitar Seguridad (RLS)
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- 4. Borrar políticas viejas (para evitar duplicados)
DROP POLICY IF EXISTS "Public Read Squads" ON public.squads;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.squads;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.squads;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.squads;

-- 5. Crear Políticas Correctas
-- Lectura pública
CREATE POLICY "Public Read Squads" ON public.squads FOR SELECT USING (true);

-- Escritura (Crear/Editar) para admin/clubes autenticados
CREATE POLICY "Enable all for authenticated" ON public.squads
FOR ALL -- Abarca INSERT, UPDATE, DELETE
TO authenticated
USING (true) WITH CHECK (true);

-- 6. Recargar la caché de la API (Por si acaso lo "del caché" es el problema real)
NOTIFY pgrst, 'reload config';
