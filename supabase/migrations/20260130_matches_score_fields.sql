-- Add detailed scoring fields to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS current_set INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_set_points_home INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_set_points_away INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS serving_team_id UUID REFERENCES teams(id);

-- Add real-time enabled if needed, though usually whole table is enabled
-- ALTER PUBLICATION supabase_realtime ADD TABLE matches;
