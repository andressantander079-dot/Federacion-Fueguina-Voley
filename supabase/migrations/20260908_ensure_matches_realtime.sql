-- Asegurar que la tabla public.matches esté inscrita en la publicación supabase_realtime de forma idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;

-- Configurar REPLICA IDENTITY FULL para garantizar que todas las columnas (especialmente sheet_data JSONB)
-- se envíen en los payloads de cambio de PostgreSQL Realtime
ALTER TABLE public.matches REPLICA IDENTITY FULL;
