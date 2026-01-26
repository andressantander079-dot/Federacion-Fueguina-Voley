-- ==========================================
-- FIX 4: EVITAR RECURSIÓN INFINITA (IMPEDIMENTO CRÍTICO)
-- ==========================================
-- El error "Infinite recursion" ocurre porque la política de 'profiles'
-- intentaba leer 'profiles' para chequear si era admin, lo cual activaba
-- la política de nuevo, en un bucle infinito.

-- Solución: Usar una función "SECURITY DEFINER" que se salta las políticas RLS
-- para hacer el chequeo de rol de forma segura y aislada.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Esta consulta corre con permisos de superusuario/dueño, ignorando RLS
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ahora rehacemos las políticas usando esta función segura

-- 1. Arreglar política de TEAMS
DROP POLICY IF EXISTS "Admins Full Access Teams" ON public.teams;
CREATE POLICY "Admins Full Access Teams" ON public.teams 
FOR ALL USING (
    public.is_admin()  -- Usamos la función en lugar del SELECT directo
);

-- 2. Arreglar política de PROFILES
DROP POLICY IF EXISTS "Admins Full Access Profiles" ON public.profiles;
CREATE POLICY "Admins Full Access Profiles" ON public.profiles 
FOR ALL USING (
    public.is_admin() OR auth.uid() = id -- Admin puede todo, Usuario puede ver lo suyo
);
-- Nota: Agregué "OR auth.uid() = id" para que el propio usuario pueda ver su perfil
-- (necesario para login y comprobaciones básicas)
