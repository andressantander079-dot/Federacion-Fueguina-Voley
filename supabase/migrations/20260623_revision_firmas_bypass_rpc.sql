-- =========================================================================
-- MIGRACIÓN: Revisión del circuito de firmas y bypass de tesorería
-- =========================================================================

-- 0. Corregir y ampliar la restricción de estados (CHECK constraint)
ALTER TABLE public.tramites_pases DROP CONSTRAINT IF EXISTS tramites_pases_estado_check;

ALTER TABLE public.tramites_pases ADD CONSTRAINT tramites_pases_estado_check CHECK (
    estado IN (
        'revision_inicial_fvf',
        'esperando_federacion',
        'esperando_origen',
        'rechazado_origen',
        'esperando_firma_jugador',
        'auditoria_final_fvf',
        'soft_reject',
        'rechazado',
        'completado',
        'aprobado',
        'cancelado',
        'cancelado_por_vencimiento'
    )
);

-- 1. Agregar columnas a la tabla public.tramites_pases
ALTER TABLE public.tramites_pases 
ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comprobante_bypass BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS bypass_motivo TEXT,
ADD COLUMN IF NOT EXISTS bypass_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bypass_fecha TIMESTAMP WITH TIME ZONE;

-- 2. Crear la tabla de auditoría para pases si no existe
CREATE TABLE IF NOT EXISTS public.auditoria_pases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tramite_id UUID REFERENCES public.tramites_pases(id) ON DELETE CASCADE NOT NULL,
    accion TEXT NOT NULL,
    ejecutado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    detalle JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- 3. Habilitar RLS y políticas de seguridad para auditoria_pases
ALTER TABLE public.auditoria_pases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Read Auditoria" ON public.auditoria_pases;
CREATE POLICY "Admin Read Auditoria" ON public.auditoria_pases 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 4. Crear índice de rendimiento para los estados activos de pases
CREATE INDEX IF NOT EXISTS idx_tramites_pases_estado 
ON public.tramites_pases(estado) 
WHERE estado IN ('revision_inicial_fvf', 'esperando_federacion', 'esperando_origen', 'auditoria_final_fvf');

-- 5. RPC: Cancelación de Pases por Falta de Firmas (Atómica)
CREATE OR REPLACE FUNCTION public.cancelar_pase_falta_firmas(
    p_tramite_id UUID,
    p_usuario_id UUID
)
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

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trámite no encontrado.');
    END IF;

    -- Validar que no esté completado ni ya cancelado
    IF v_tramite.estado = 'completado' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se puede cancelar un trámite completado.');
    END IF;

    IF v_tramite.estado = 'cancelado' OR v_tramite.estado = 'cancelado_por_vencimiento' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El trámite ya se encuentra cancelado.');
    END IF;

    -- Validar que el club de origen sea válido para revertir
    IF v_tramite.origen_club_id IS NULL THEN
        RAISE EXCEPTION 'El club de origen es inválido o nulo en el trámite.';
    END IF;

    -- 2. Actualizar trámite a 'cancelado'
    UPDATE public.tramites_pases 
    SET estado = 'cancelado',
        motivo_cancelacion = 'FALTA_FIRMAS',
        cancelado_por = p_usuario_id,
        fecha_cancelacion = NOW(),
        updated_at = NOW()
    WHERE id = p_tramite_id;

    -- 3. Revertir jugador al club de origen
    -- NOTA: Se actualiza status a 'active' y se descarta updated_at que no existe en el esquema
    UPDATE public.players 
    SET team_id = v_tramite.origen_club_id,
        squad_id = NULL,
        status = 'active'
    WHERE id = v_tramite.player_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jugador no encontrado para el trámite especificado.';
    END IF;

    -- 4. Registrar en la tabla de auditoría
    INSERT INTO public.auditoria_pases (tramite_id, accion, ejecutado_por, fecha, detalle)
    VALUES (
        p_tramite_id, 
        'CANCELACION_FEDERATIVA_FALTA_FIRMAS', 
        p_usuario_id, 
        NOW(), 
        jsonb_build_object('player_id', v_tramite.player_id, 'origen_club_id', v_tramite.origen_club_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Trámite cancelado por falta de firmas de manera exitosa.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. RPC: Aprobación de Pase con Bypass de Tesorería (Atómica)
CREATE OR REPLACE FUNCTION public.aprobar_pase_bypass_tesoreria(
    p_tramite_id UUID,
    p_motivo TEXT,
    p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tramite RECORD;
    v_movements_count INTEGER;
BEGIN
    -- 1. Validar longitud del motivo
    IF LENGTH(p_motivo) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El motivo debe contener al menos 10 caracteres.');
    END IF;

    -- 2. Lock del trámite
    SELECT * INTO v_tramite 
    FROM public.tramites_pases 
    WHERE id = p_tramite_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trámite no encontrado.');
    END IF;

    -- Validar estado pendiente de pago
    IF v_tramite.estado != 'revision_inicial_fvf' AND v_tramite.estado != 'esperando_federacion' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El trámite no se encuentra pendiente de pago.');
    END IF;

    -- 3. Actualizar trámite a 'esperando_origen' con campos de bypass
    UPDATE public.tramites_pases 
    SET estado = 'esperando_origen',
        comprobante_bypass = TRUE,
        bypass_motivo = p_motivo,
        bypass_por = p_usuario_id,
        bypass_fecha = NOW(),
        updated_at = NOW()
    WHERE id = p_tramite_id;

    -- 4. VERIFICACIÓN POST-CONDICIÓN ESTRICTA:
    -- Garantizar que no exista ningún impacto financiero (treasury_movements) vinculado al trámite
    SELECT COUNT(*) INTO v_movements_count 
    FROM public.treasury_movements 
    WHERE reference_id = p_tramite_id AND reference_type = 'pase';

    IF v_movements_count > 0 THEN
        RAISE EXCEPTION 'Falla de seguridad financiera: Se detectaron movimientos de tesorería creados para el trámite %.', p_tramite_id;
    END IF;

    -- 5. Registrar en la tabla de auditoría
    INSERT INTO public.auditoria_pases (tramite_id, accion, ejecutado_por, fecha, detalle)
    VALUES (
        p_tramite_id, 
        'APROBACION_BYPASS_TESORERIA', 
        p_usuario_id, 
        NOW(), 
        jsonb_build_object('bypass_motivo', p_motivo)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Trámite aprobado exitosamente con bypass de tesorería.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
