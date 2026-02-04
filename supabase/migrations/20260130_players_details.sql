-- Add birth_date to players if not exists
ALTER TABLE players ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F'));

-- Note: existing gender column might exist in squads but players should have it too for individual checks.
