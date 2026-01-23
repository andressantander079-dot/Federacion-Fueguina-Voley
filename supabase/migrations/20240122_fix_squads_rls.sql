-- Fix: Allow Insert/Update/Delete on Squads
-- The previous migration only added SELECT policies.

CREATE POLICY "Enable insert for authenticated users only" ON "public"."squads"
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON "public"."squads"
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON "public"."squads"
FOR DELETE TO authenticated
USING (true);
