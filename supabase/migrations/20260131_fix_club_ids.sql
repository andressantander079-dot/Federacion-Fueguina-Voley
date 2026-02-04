-- Migration: Fix missing club_ids in profiles based on teams.admin_id
-- This ensures that if a profile is an admin of a team, their profile.club_id reflects that.

UPDATE public.profiles
SET club_id = teams.id
FROM public.teams
WHERE profiles.id = teams.admin_id
  AND profiles.club_id IS NULL;

-- Optional: Ensure RLS policies don't block this if run by a superuser, 
-- but usually migrations run with admin privileges.
