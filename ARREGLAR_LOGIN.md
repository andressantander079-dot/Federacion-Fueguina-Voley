# 🚨 ACCIÓN REQUERIDA: Arreglar Problema de Login y Perfiles

Si tienes problemas para loguearte o te redirige incorrectamente, es porque tu usuario no puede leer su propio perfil.
Ejecuta esto en Supabase SQL Editor:

```sql
-- HABILITAR LECTURA DE PERFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Permitir que cada usuario lea SU propio perfil
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- OPCIONAL: Si necesitamos que todos vean nombres (ej: árbitros, tablas)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
```

Además, asegúrate de haber ejecutado el script anterior (el de `match_lineups`) para arreglar lo de las planillas.
