-- ==========================================
-- FIX: AUTO-CONFIRMAR EMAILS (Development Mode)
-- ==========================================

-- 1. Confirmar todos los usuarios existentes ya registrados
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. Trigger para auto-confirmar futuros registros automáticamente
-- (Esto evita el error "Email not confirmed" en desarrollo)

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();
