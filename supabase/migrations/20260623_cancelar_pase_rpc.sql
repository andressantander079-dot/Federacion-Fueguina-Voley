-- Función RPC para cancelar un trámite de pase de forma atómica
CREATE OR REPLACE FUNCTION public.cancelar_pase_tramite(p_tramite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tramite RECORD;
BEGIN
    -- 1. Lock del trámite para evitar race conditions
    SELECT * INTO v_tramite 
    FROM public.tramites_pases 
    WHERE id = p_tramite_id 
    FOR UPDATE;
    
    -- 2. Validar que existe y está en curso
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trámite no encontrado');
    END IF;
    
    IF v_tramite.estado = 'completado' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se puede cancelar un trámite completado');
    END IF;
    
    IF v_tramite.estado = 'cancelado' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El trámite ya está cancelado');
    END IF;
    
    -- 3. Actualizar trámite
    UPDATE public.tramites_pases 
    SET estado = 'cancelado', 
        updated_at = NOW() 
    WHERE id = p_tramite_id;
    
    -- 4. Revertir jugador (team_id + squad_id)
    UPDATE public.players 
    SET team_id = v_tramite.origen_club_id,
        squad_id = NULL
    WHERE id = v_tramite.player_id;
    
    -- 5. Verificar que el jugador fue actualizado
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jugador no encontrado para el trámite %', p_tramite_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Trámite cancelado exitosamente');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
