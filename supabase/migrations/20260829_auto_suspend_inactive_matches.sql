-- Migración DDL: Auto-Suspensión de Partidos Inactivos (>40 min) e Integridad de Datos

-- 1. Crear columnas dedicadas en la tabla matches
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(50) DEFAULT NULL;

-- 2. Habilitar Replicación en Tiempo Real en Supabase para la tabla matches
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- 3. Índice compuesto B-Tree para consultas de inactividad
CREATE INDEX IF NOT EXISTS idx_matches_status_last_activity 
ON matches (status, last_activity_at);

-- 4. TRIGGER BEFORE UPDATE: Bloqueo de modificaciones en sheet_data si el partido está suspendido/finalizado
CREATE OR REPLACE FUNCTION guard_suspended_match_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Rechazar cualquier modificación de sheet_data si el partido está suspendido o finalizado
    IF OLD.status NOT IN ('live', 'en_curso') AND NEW.status NOT IN ('live', 'en_curso') AND OLD.sheet_data IS DISTINCT FROM NEW.sheet_data THEN
        RAISE EXCEPTION 'No se puede modificar la planilla de un partido suspendido o finalizado. Reanude el partido primero.';
    END IF;

    -- Al cambiar a en_curso o modificar sheet_data en partido activo, renovar temporizador
    IF NEW.status IN ('live', 'en_curso') THEN
        NEW.last_activity_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guard_suspended_match_modifications ON matches;

CREATE TRIGGER trigger_guard_suspended_match_modifications
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION guard_suspended_match_modifications();

-- 5. TRIGGER AFTER UPDATE ATÓMICO: Notificación exclusiva por inactividad de 40 min en la tabla messages
CREATE OR REPLACE FUNCTION notify_inactive_match_suspension()
RETURNS TRIGGER AS $$
BEGIN
    -- Disparar notificación 1 sola vez solo cuando la causa sea inactividad_40min
    IF OLD.status IN ('live', 'en_curso') 
       AND NEW.status = 'suspendido' 
       AND NEW.suspension_reason = 'inactividad_40min' THEN
       
        INSERT INTO messages (
            sender_role,
            recipient_role,
            subject,
            body,
            created_at
        ) VALUES (
            'system',
            'admin',
            '⚠️ Partido Suspendido por Inactividad (>40 min)',
            CONCAT('El partido ID ', NEW.id, ' entre el equipo local y visitante fue suspendido automáticamente tras 40 min de inactividad sin registros.'),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_inactive_match_suspension ON matches;

CREATE TRIGGER trigger_notify_inactive_match_suspension
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION notify_inactive_match_suspension();
