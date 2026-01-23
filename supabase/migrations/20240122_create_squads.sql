-- Migration: Add Squads Support
-- Description: Adds 'squads' table for hierarchical Team -> Squad -> Player structure.

-- 1. Create Squads Table (Planteles)
CREATE TABLE public.squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL, -- Ej: "Galicia Sub 13", "AEP Sub 13 Verde"
    coach_name TEXT, -- DT del plantel
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add RLS Policies for Squads
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Squads" ON public.squads FOR SELECT USING (true);
-- (Write policies handled by Admin logic or future implementation)

-- 3. Update Players Table to reference Squads
ALTER TABLE public.players 
ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL;

-- 4. (Optional) Backfill logic would go here if we had data, currently assumes fresh start for squads.
