-- Migration: Setup Storage and Player Documents
-- Description: Adds file columns to players and configures storage bucket.

-- 1. Add URL columns to Players table
ALTER TABLE public.players 
ADD COLUMN photo_url TEXT,
ADD COLUMN medical_url TEXT,
ADD COLUMN payment_url TEXT;

-- 2. Create Storage Bucket 'players-docs'
-- Note: This attempts to create it via SQL. If it fails due to permissions, create manually in Dashboard.
INSERT INTO storage.buckets (id, name, public)
VALUES ('players-docs', 'players-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies (RLS) for 'players-docs'
-- Allow Public Read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'players-docs' );

-- Allow Authenticated Uploads (Admin/Club)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'players-docs' );

-- Allow Owners to Delete/Update (Optional, for now simplistic)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'players-docs' );
