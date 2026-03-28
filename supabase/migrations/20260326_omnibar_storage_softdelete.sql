-- Módulo 3: Storage, Soft Delete y Búsqueda Global (Omnibar)
-- Script de Migración para SP Softpower

-- ==========================================
-- 1. SOFT DELETE EN TRÁMITES
-- ==========================================
-- Agregamos la columna deleted_at para mantener auditoría sin destruir registros
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Creamos un índice para descartar rápidamente los trámites borrados de las vistas por defecto
CREATE INDEX IF NOT EXISTS idx_procedures_active ON public.procedures(deleted_at) WHERE deleted_at IS NULL;

-- Actualizamos las políticas RLS actuales de Procedures para no mostrar los borrados en listados regulares
DROP POLICY IF EXISTS "Admin All Procedures" ON public.procedures;
CREATE POLICY "Admin All Procedures" ON public.procedures FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Club Own Procedures" ON public.procedures;
CREATE POLICY "Club Own Procedures" ON public.procedures FOR ALL USING (
    team_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
);
-- Nota: Preferimos filtrar "deleted_at IS NULL" en el Frontend/Query para permitir que roles de Admin puedan ver el "Historial de Papelera" bajo demanda. La tabla queda en Soft Delete.


-- ==========================================
-- 2. POLÍTICAS DE STORAGE PARA BUCKET 'documents'
-- ==========================================
-- Activando RLS en la tabla de storage de Supabase (esquema storage, tabla objects)
-- (Suele estar habilitado, pero forzamos por seguridad)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2.1 Permitir Lectura (Select) a cualquier autenticado
DROP POLICY IF EXISTS "Documents_Select_Auth" ON storage.objects;
CREATE POLICY "Documents_Select_Auth" ON storage.objects 
FOR SELECT USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
);

-- 2.2 Permitir Inserción a cualquier autenticado
DROP POLICY IF EXISTS "Documents_Insert_Auth" ON storage.objects;
CREATE POLICY "Documents_Insert_Auth" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
);

-- 2.3 Permitir Update/Delete solo a dueños o roles de servicio
DROP POLICY IF EXISTS "Documents_Update_Owner" ON storage.objects;
CREATE POLICY "Documents_Update_Owner" ON storage.objects 
FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.uid() = owner
);

DROP POLICY IF EXISTS "Documents_Delete_Owner" ON storage.objects;
CREATE POLICY "Documents_Delete_Owner" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.uid() = owner
);


-- ==========================================
-- 3. RPC PARA OMNIBAR (Búsqueda Global Unificada)
-- ==========================================
CREATE OR REPLACE FUNCTION public.search_omnibar(search_query TEXT)
RETURNS TABLE (
    id UUID,
    entity_type TEXT,
    title TEXT,
    subtitle TEXT,
    icon_hint TEXT,
    url_route TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    
    -- 1. Buscar Jugadores (DNI o Nombre)
    SELECT 
        p.id,
        'Jugador'::TEXT AS entity_type,
        p.name AS title,
        'DNI: ' || p.dni AS subtitle,
        'User'::TEXT AS icon_hint,
        '/admin/jugadores' AS url_route
    FROM public.players p
    WHERE p.name ILIKE '%' || search_query || '%' 
       OR p.dni ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- 2. Buscar Clubes/Equipos
    SELECT 
        t.id,
        'Club'::TEXT AS entity_type,
        t.name AS title,
        t.city AS subtitle,
        'Shield'::TEXT AS icon_hint,
        '/admin/clubes' AS url_route
    FROM public.teams t
    WHERE t.name ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- 3. Buscar Entidades o Movimientos Financieros
    SELECT 
        tm.id,
        'Tesorería'::TEXT AS entity_type,
        tm.entity_name AS title,
        'Gasto/Ingreso ' || tm.type || ' - ' || tm.description AS subtitle,
        'DollarSign'::TEXT AS icon_hint,
        '/admin/treasury/movements' AS url_route
    FROM public.treasury_movements tm
    WHERE tm.entity_name ILIKE '%' || search_query || '%' 
       OR tm.description ILIKE '%' || search_query || '%'
       
    -- Limitar los resultados globales para agilizar el dropdown del omnibar
    LIMIT 12;
END;
$$;
