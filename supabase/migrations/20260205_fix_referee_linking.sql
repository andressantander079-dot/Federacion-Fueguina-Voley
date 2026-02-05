-- FIX REFEREE DATA LINKING
-- This script adds necessary columns to 'referees' and 'match_officials' to ensure linking works.
-- Run in Supabase SQL Editor.

-- 1. Ensure 'referees' table has 'user_id' and 'email'
ALTER TABLE public.referees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.referees ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Allow 'match_officials' to optionally store 'referee_id' (legacy link) if needed
ALTER TABLE public.match_officials ADD COLUMN IF NOT EXISTS referee_id BIGINT REFERENCES public.referees(id);

-- 3. RLS Updates just in case
ALTER TABLE public.referees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Referees" ON public.referees;
CREATE POLICY "Public Read Referees" ON public.referees FOR SELECT USING (true);

-- 4. INSTRUCTION (Not code):
-- You must manually link your user.
-- Example:
-- UPDATE public.referees SET user_id = 'YOUR_UUID' WHERE first_name = 'YOUR_NAME';
-- UPDATE public.match_officials SET user_id = 'YOUR_UUID' WHERE referee_id = (SELECT id FROM referees WHERE user_id = 'YOUR_UUID');

-- To make it easier, we can try to auto-link by email if it exists in auth.
-- But usually names don't match emails perfectly.
