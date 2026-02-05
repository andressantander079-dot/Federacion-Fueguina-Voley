-- COMPREHENSIVE RLS FIX FOR CLUB MANAGEMENT v2 (Corrected Table Names)
-- Run this in Supabase SQL Editor

-- 1. MATCH LINEUPS (Planillas)
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_lineups;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.match_lineups;

-- Allow Public Read
CREATE POLICY "Enable read access for all users" 
ON public.match_lineups FOR SELECT 
USING (true);

-- Allow Authenticated Users (Clubs/Admins) to Manage
CREATE POLICY "Enable all access for authenticated users" 
ON public.match_lineups FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');


-- 2. PLAYERS (Jugadores) -> Formerly confused with squad_players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;

-- Allow Public Read (or at least Authenticated Read)
-- This allows the Modal to fetch the players list.
CREATE POLICY "Enable read access for all users" 
ON public.players FOR SELECT 
USING (true);


-- 3. PROFILES (Not strictly needed if 'players' has the data, but good practice)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. SQUADS (Also ensure readable)
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.squads;
CREATE POLICY "Enable read access for all users" 
ON public.squads FOR SELECT 
USING (true);
