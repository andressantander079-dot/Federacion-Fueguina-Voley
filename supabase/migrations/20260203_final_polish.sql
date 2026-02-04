-- 1. REPAIR REFEREES (Fix Inconsistencies)
-- Strategy: If a profile has role 'referee' but no record in 'referees' table, create it.
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.id, p.full_name 
        FROM public.profiles p 
        LEFT JOIN public.referees ref ON p.id = ref.id
        WHERE p.role = 'referee' AND ref.id IS NULL
    LOOP
        -- Insert missing referee record
        -- Try to split name, default to '-' if simple
        INSERT INTO public.referees (id, first_name, last_name, category)
        VALUES (
            r.id, 
            split_part(r.full_name, ' ', 1), 
            CASE WHEN strpos(r.full_name, ' ') > 0 THEN substr(r.full_name, strpos(r.full_name, ' ') + 1) ELSE '-' END,
            'Provincial' -- Default category
        );
    END LOOP;
END $$;

-- 2. NEWS TABLE UPDATES
-- Add 'Archived' column if it doesn't exist
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add 'status' column if we want more granular control (draft, published)
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Ensure image_url is present (already in schema but good to verify constraints if needed)

-- 3. CLEANUP ORPHANS (Optional but recommended)
-- Delete referees records that point to non-existent profiles (Bad Data)
DELETE FROM public.referees 
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 4. RLS UPDATES FOR NEWS
DROP POLICY IF EXISTS "Public Read News" ON public.news;

-- Public can only see published and non-archived news
CREATE POLICY "Public Read News" ON public.news
FOR SELECT USING (
    status = 'published' AND archived = FALSE
);

-- Admins can do everything
CREATE POLICY "Admins Manage News" ON public.news
FOR ALL USING (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
