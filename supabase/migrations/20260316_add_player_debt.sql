-- Añadir columna de deuda vigente a Jugadores y columna de aceptación a Trámites

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS has_debt BOOLEAN DEFAULT false;

ALTER TABLE public.tramites_pases
ADD COLUMN IF NOT EXISTS debt_accepted BOOLEAN DEFAULT false;
