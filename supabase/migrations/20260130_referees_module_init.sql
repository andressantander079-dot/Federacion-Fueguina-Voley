-- Referees Table (Extends Profile)
CREATE TABLE IF NOT EXISTS referees (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Aspirante', 'Provincial', 'Nacional', 'Internacional')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referee Restrictions (Conflict of Interest)
CREATE TABLE IF NOT EXISTS referee_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referee_id UUID NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
    restricted_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referee_id, restricted_team_id)
);

-- Match Officials (Assignments)
CREATE TABLE IF NOT EXISTS match_officials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('1st_referee', '2nd_referee', 'scorer', 'line_judge', 'veedor')),
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'rejected', 'completed')),
    fee_amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, role) -- Only one official per role per match (allows multiple line judges? maybe remove unique constraint for line_judge if strict)
    -- Start with strict unique role for simplification, maybe relax later for line judges 1/2
);

-- Add specific line judge roles to allow unique constraint or just relax it
ALTER TABLE match_officials DROP CONSTRAINT IF EXISTS match_officials_match_id_role_key;
ALTER TABLE match_officials ADD CONSTRAINT match_officials_match_id_role_key UNIQUE (match_id, role);

-- Enable RLS
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE referee_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_officials ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for now)
-- Referees: Public read (for assignments), Admin write
CREATE POLICY "Referees Public Read" ON referees FOR SELECT USING (true);
CREATE POLICY "Referees Admin Write" ON referees FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Restrictions: Public read (for validation), Admin write
CREATE POLICY "Restrictions Public Read" ON referee_restrictions FOR SELECT USING (true);
CREATE POLICY "Restrictions Admin Write" ON referee_restrictions FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Match Officials: Public read, Admin write, Official update own status
CREATE POLICY "Officials Public Read" ON match_officials FOR SELECT USING (true);
CREATE POLICY "Officials Admin Write" ON match_officials FOR ALL USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
CREATE POLICY "Officials Update Own Status" ON match_officials FOR UPDATE USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);
