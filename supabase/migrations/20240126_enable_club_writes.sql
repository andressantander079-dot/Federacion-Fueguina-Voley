-- ==========================================
-- FIX 7: PERMISOS DE ESCRITURA PARA CLUBES
-- ==========================================

-- 1. Permiso para CREAR SQUADS
DROP POLICY IF EXISTS "Clubs insert own squads" ON public.squads;
CREATE POLICY "Clubs insert own squads" ON public.squads
    FOR INSERT WITH CHECK (
        -- El usuario debe ser miembro del equipo al que intenta crear el squad
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND club_id = team_id
        )
    );

-- 2. Permiso para CREAR PLAYERS
DROP POLICY IF EXISTS "Clubs insert own players" ON public.players;
CREATE POLICY "Clubs insert own players" ON public.players
    FOR INSERT WITH CHECK (
        -- El usuario debe ser miembro del equipo
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND club_id = team_id
        )
    );

-- 3. Permiso para ELIMINAR/EDITAR (Opcional, pero recomendado)
DROP POLICY IF EXISTS "Clubs update own squads" ON public.squads;
CREATE POLICY "Clubs update own squads" ON public.squads
    FOR UPDATE USING (
        EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND club_id = team_id )
    );

DROP POLICY IF EXISTS "Clubs delete own players" ON public.players;
CREATE POLICY "Clubs delete own players" ON public.players
    FOR DELETE USING (
        EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND club_id = team_id )
    );
