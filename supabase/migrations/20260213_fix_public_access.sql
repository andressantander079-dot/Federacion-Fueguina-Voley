-- Enable RLS for teams and categories if not already
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 1. TEAMS: Public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.teams;
CREATE POLICY "Enable read access for all users" ON public.teams FOR SELECT USING (true);

-- 2. CATEGORIES: Public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
CREATE POLICY "Enable read access for all users" ON public.categories FOR SELECT USING (true);

-- 3. STORAGE: Double check policies for club-logos
-- Ensure public can download
DROP POLICY IF EXISTS "Public Select club-logos" ON storage.objects;
CREATE POLICY "Public Select club-logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');

-- Ensure authenticated can upload to club-logos
DROP POLICY IF EXISTS "Auth Insert club-logos" ON storage.objects;
CREATE POLICY "Auth Insert club-logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

-- Ensure authenticated can update
DROP POLICY IF EXISTS "Auth Update club-logos" ON storage.objects;
CREATE POLICY "Auth Update club-logos" ON storage.objects FOR UPDATE USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');
