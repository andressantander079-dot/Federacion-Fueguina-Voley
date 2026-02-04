-- Create match_lineups table to store players checked in for a match
CREATE TABLE IF NOT EXISTS match_lineups (
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
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for now)
CREATE POLICY "Lineups Public Read" ON match_lineups FOR SELECT USING (true);
CREATE POLICY "Lineups Admin/Referee Write" ON match_lineups FOR ALL USING (
    exists (select 1 from profiles where id = auth.uid() and role IN ('admin')) OR
    exists (select 1 from match_officials where match_id = match_lineups.match_id and user_id = auth.uid())
);
