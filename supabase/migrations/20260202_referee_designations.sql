-- 1. Fix Referees Relationship (Critical for List View)
-- First, ensure id is a foreign key to profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referees_id_fkey') THEN
        ALTER TABLE public.referees
        ADD CONSTRAINT referees_id_fkey
        FOREIGN KEY (id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create Match Officials Table (For Designations)
CREATE TABLE IF NOT EXISTS public.match_officials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('1st_referee', '2nd_referee', 'scorer', 'line_judge')),
    status TEXT DEFAULT 'assigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent assigning same person to same role in same match twice
    UNIQUE(match_id, role)
);

-- 3. Create Referee Restrictions Table (For logic)
CREATE TABLE IF NOT EXISTS public.referee_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    restricted_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.match_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_restrictions ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Simple policies for now)
CREATE POLICY "Public read officials" ON public.match_officials FOR SELECT USING (true);
CREATE POLICY "Admins manage officials" ON public.match_officials FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admins manage restrictions" ON public.referee_restrictions FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 6. Grant permissions
GRANT ALL ON public.match_officials TO authenticated;
GRANT ALL ON public.match_officials TO service_role;
GRANT ALL ON public.referee_restrictions TO authenticated;
GRANT ALL ON public.referee_restrictions TO service_role;
