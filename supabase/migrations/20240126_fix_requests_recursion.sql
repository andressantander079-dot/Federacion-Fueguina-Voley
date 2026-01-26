-- ==========================================
-- FIX 5: REPARAR RECURSIÓN EN CLUB_REQUESTS
-- ==========================================

-- La tabla club_requests también tenía la política antigua que causaba recursión.
-- Debemos actualizarla para usar public.is_admin().

DROP POLICY IF EXISTS "Admins view all requests" ON public.club_requests;

CREATE POLICY "Admins view all requests" ON public.club_requests
    FOR ALL USING (
        public.is_admin() -- Usar la función segura
    );

-- Asegurarnos que la tabla permita joins si fuera necesario (aunque vamos a quitar el join del frontend por ahora)
-- No es necesario FK extra si no lo usamos.
