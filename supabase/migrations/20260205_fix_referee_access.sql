
-- Fix RLS for match_officials so Referees can see their assignments
CREATE POLICY "Enable read access for own assignments" ON public.match_officials
FOR SELECT USING (
  auth.uid() = user_id
);

-- Enable Match Update for Referees (autosave)
-- Existing policy might cover matches update?
-- Let's ensure referees can UPDATE matches they are assigned to.
-- Actually, 'matches' RLS usually allows 'authenticated' read, but write?
-- We need a policy: "Referees can update matches they are officiating".

CREATE POLICY "Referees can update their matches" ON public.matches
FOR UPDATE
USING (
  exists (
    select 1 from match_officials
    where match_id = matches.id
    and user_id = auth.uid()
  )
);
