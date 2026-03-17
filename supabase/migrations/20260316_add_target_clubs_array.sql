-- Migración para soportar el Módulo 5 (Selección Múltiple de clubes en Agenda FVF)

-- 1. Alterar la columna (algunos motores requieren borrarla o usar un cast específico, como es genérica usamos target_clubs_id como nueva para evitar roturas locales si hay datos legacy no convertibles)
ALTER TABLE public.calendar_events 
DROP COLUMN IF EXISTS target_club_id;

ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS target_clubs_ids UUID[];

-- 2. Actualizar RLS
DROP POLICY IF EXISTS "Clubs can view relevant events" ON public.calendar_events;

CREATE POLICY "Clubs can view relevant events" ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  target_role = 'all'
  OR 
  (target_role = 'club' AND (
      target_clubs_ids IS NULL 
      OR 
      (SELECT club_id FROM public.profiles WHERE id = auth.uid()) = ANY(target_clubs_ids)
  ))
);
