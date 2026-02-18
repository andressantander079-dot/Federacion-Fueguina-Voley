-- Force enable RLS on players but allow public select.
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;

CREATE POLICY "Enable read access for all users"
ON public.players FOR SELECT
USING (true);

GRANT SELECT ON public.players TO anon, authenticated, service_role;
