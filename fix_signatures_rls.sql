-- SCRIPT PARA SOLUCIONAR PERMISOS DE FIRMAS (RLS DE STORAGE)
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar políticas restrictivas anteriores si existen
DROP POLICY IF EXISTS "Inserción de firmas por árbitros" ON storage.objects;
DROP POLICY IF EXISTS "Edición de firmas por árbitros" ON storage.objects;
DROP POLICY IF EXISTS "Lectura pública de firmas" ON storage.objects;
DROP POLICY IF EXISTS "Inserción pública de firmas" ON storage.objects;
DROP POLICY IF EXISTS "Edición pública de firmas" ON storage.objects;

-- 2. Crear políticas de acceso público (anon y authenticated) para el bucket "match-signatures"
CREATE POLICY "Lectura pública de firmas"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'match-signatures' );

CREATE POLICY "Inserción pública de firmas"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'match-signatures' );

CREATE POLICY "Edición pública de firmas"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'match-signatures' );
