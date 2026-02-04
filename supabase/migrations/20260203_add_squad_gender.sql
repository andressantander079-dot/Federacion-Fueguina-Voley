-- Add gender column to squads
ALTER TABLE squads ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Femenino';

-- Update RLS if needed (usually implicit if reusing existing policies)
-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
