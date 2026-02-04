-- Ensure match_lineups exists
CREATE TABLE IF NOT EXISTS public.match_lineups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    jersey_number INTEGER,
    is_captain BOOLEAN DEFAULT false,
    is_libero BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- Policies for match_lineups
CREATE POLICY "Lineups Public Read" ON public.match_lineups FOR SELECT USING (true);
-- Allow Admins and Referees (via match_officials) to write
CREATE POLICY "Lineups Admin/Referee Write" ON public.match_lineups FOR ALL USING (
    exists (select 1 from profiles where id = auth.uid() and role IN ('admin')) OR
    exists (select 1 from match_officials where match_id = match_lineups.match_id and user_id = auth.uid()) OR
    exists (select 1 from club_requests where user_id = auth.uid()) -- Temporary loosen for testing if needed, or strictly officials
);

-- Add streaming_url to matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS streaming_url TEXT;

-- Add mvp_player_id to matches (optional but good for future)
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS mvp_player_id UUID REFERENCES players(id);
