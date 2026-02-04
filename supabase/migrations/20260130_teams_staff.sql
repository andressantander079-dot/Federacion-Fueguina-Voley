-- Add authorized_staff column to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS authorized_staff JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.teams.authorized_staff IS 'List of authorized personnel (Name, Role, Phone)';
