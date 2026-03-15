-- 20260315_add_target_role_to_events.sql
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all';

-- Drop the old club policy and create new ones that accommodate the new column
DROP POLICY IF EXISTS "Clubs can view relevant events" ON public.calendar_events;
DROP POLICY IF EXISTS "Referees can view relevant events" ON public.calendar_events;

CREATE POLICY "Clubs can view relevant events" ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  target_role = 'all' OR
  target_role = 'club' OR
  target_club_id IN (
    SELECT club_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Referees can view relevant events" ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  target_role = 'all' OR
  target_role = 'referee'
);
