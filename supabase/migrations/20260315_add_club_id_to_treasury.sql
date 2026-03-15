-- Añadir columna club_id a treasury_movements para vincular ingresos directamente a los clubes (equipos)
ALTER TABLE public.treasury_movements
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Actualizar el RLS si es necesario para permitir que la administración siga leyendo sin problemas
-- Generalmente esto está cubierto si los administradores tienen acceso irrestricto a los movimientos.
