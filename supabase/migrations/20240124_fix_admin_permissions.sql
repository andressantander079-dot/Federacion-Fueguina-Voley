-- ==========================================
-- FIX CORREGIDO: LIMPIEZA Y RE-CREACIÓN SEGURA
-- ==========================================

-- 1. TRIGGER PARA CREAR PERFILES AUTOMÁTICAMENTE
-- (Esto no falla si ya existe, gracias al "OR REPLACE")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING; -- Evita error si ya existe el perfil
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. PERMISOS DE ADMIN (RLS Fix)
-- Primero borramos las políticas antiguas para evitar el error "already exists"

DROP POLICY IF EXISTS "Admins Full Access Teams" ON public.teams;
CREATE POLICY "Admins Full Access Teams" ON public.teams FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins Full Access Profiles" ON public.profiles;
CREATE POLICY "Admins Full Access Profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. REPARAR USUARIOS EXISTENTES SIN PERFIL
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
