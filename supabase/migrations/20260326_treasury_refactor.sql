-- ==========================================
-- Refactorización de Tesorería (Módulo 1)
-- ==========================================

-- 1. Vista Materializada / Función SQL para saldos
-- Devuelve un solo registro con los totales para una cuenta o para todas.
CREATE OR REPLACE FUNCTION get_treasury_balance(p_account_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_ingresos NUMERIC,
    total_egresos NUMERIC,
    saldo_actual NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH calc AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'INGRESO' THEN amount ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN type = 'EGRESO' THEN amount ELSE 0 END), 0) AS egresos
        FROM public.treasury_movements
        WHERE (p_account_id IS NULL OR account_id = p_account_id)
    )
    SELECT 
        ingresos,
        egresos,
        (ingresos - egresos) AS saldo
    FROM calc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Inmutabilidad (RLS)
-- Asegurar que los usuarios autenticados no puedan hacer UPDATE o DELETE.
REVOKE UPDATE, DELETE ON public.treasury_movements FROM authenticated;

-- Hardcore append-only con trigger para asegurarnos que ni siquiera desde la BD (excepto superuser sin triggers) se modifique.
CREATE OR REPLACE FUNCTION prevent_movement_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE: La tabla treasury_movements es append-only. Utiliza reverse_transaction.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_movement_update ON public.treasury_movements;
CREATE TRIGGER trg_prevent_movement_update
BEFORE UPDATE OR DELETE ON public.treasury_movements
FOR EACH ROW EXECUTE FUNCTION prevent_movement_update_delete();

-- 3. RPC Asientos de Reversión
CREATE OR REPLACE FUNCTION reverse_transaction(p_transaction_id UUID)
RETURNS UUID AS $$
DECLARE
    original_row public.treasury_movements%ROWTYPE;
    new_id UUID;
    v_user_id UUID;
BEGIN
    -- Obtenemos el usuario que ejecuta la accion (si esta autenticado en Supabase via API)
    v_user_id := auth.uid();

    SELECT * INTO original_row FROM public.treasury_movements WHERE id = p_transaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacción con ID % no encontrada.', p_transaction_id;
    END IF;

    -- Validar que no se haya anulado ya
    IF EXISTS (SELECT 1 FROM public.treasury_movements WHERE reference_id = p_transaction_id AND description LIKE 'Anulación%') THEN
        RAISE EXCEPTION 'Esta transacción ya fue anulada.';
    END IF;

    -- Insertar movimiento inverso
    -- Si era INGRESO, el amount pasa a ser negativo (o si tu sistema asume todos los amounts positivos, 
    -- multiplicarlo por -1 ya reduce el saldo). Se respeta: amount * -1, type igual al original.
    INSERT INTO public.treasury_movements (
        date, 
        amount, 
        type, 
        description, 
        tax_id, 
        entity_name, 
        proof_url, 
        account_id, 
        cost_center_id, 
        created_by, 
        reference_id
    ) VALUES (
        now(),
        original_row.amount * -1,
        original_row.type,
        'Anulación de trx #' || substr(p_transaction_id::text, 1, 8),
        original_row.tax_id,
        original_row.entity_name,
        original_row.proof_url,
        original_row.account_id,
        original_row.cost_center_id,
        COALESCE(v_user_id, original_row.created_by), -- Fallback al original si corre desde pgAdmin
        p_transaction_id
    ) RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exponer permisos
GRANT EXECUTE ON FUNCTION reverse_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_treasury_balance(UUID) TO authenticated;
