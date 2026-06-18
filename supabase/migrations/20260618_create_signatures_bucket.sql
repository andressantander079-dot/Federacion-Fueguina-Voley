-- Migration: Create match-signatures bucket in Storage
-- Description: Configures public bucket for referee and captain signatures with proper public RLS policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('match-signatures', 'match-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for match-signatures bucket
-- 1. Allow public select (read) access
DROP POLICY IF EXISTS "Lectura pública de firmas" ON storage.objects;
CREATE POLICY "Lectura pública de firmas"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'match-signatures' );

-- 2. Allow public inserts (so players, captains and referees can sign on different devices/sessions)
DROP POLICY IF EXISTS "Inserción de firmas por árbitros" ON storage.objects;
DROP POLICY IF EXISTS "Inserción pública de firmas" ON storage.objects;
CREATE POLICY "Inserción pública de firmas"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'match-signatures' );

-- 3. Allow updates for signatures by anyone
DROP POLICY IF EXISTS "Edición de firmas por árbitros" ON storage.objects;
DROP POLICY IF EXISTS "Edición pública de firmas" ON storage.objects;
CREATE POLICY "Edición pública de firmas"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'match-signatures' );
