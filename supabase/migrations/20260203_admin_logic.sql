-- Add rejection_reason column to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add player_fee column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS player_fee NUMERIC DEFAULT 0;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
