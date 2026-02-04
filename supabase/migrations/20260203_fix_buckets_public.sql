-- Make player-photos bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'player-photos';

-- Make procedure-files bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'procedure-files';

-- Make club-logos bucket public (just in case)
UPDATE storage.buckets
SET public = true
WHERE id = 'club-logos';

-- Ensure Policies exist (Idempotent check is hard in pure SQL without PL/pgSQL, but let's re-apply permissive policies just in case)
-- (Supabase UI toggling Public usually handles this, but raw SQL update to 'public' column works)

NOTIFY pgrst, 'reload schema';
