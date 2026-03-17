-- Añadir documentación obligatoria para menores de edad en la tabla de Jugadores

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS family_auth_url TEXT;
