
-- Create the automatic time bomb function
CREATE OR REPLACE FUNCTION public.trigger_document_time_bomb()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    bomb_active boolean;
    bomb_date timestamptz;
BEGIN
    -- Check if bomb is active and time has passed
    SELECT document_deadline_active, document_deadline_date 
    INTO bomb_active, bomb_date 
    FROM public.settings 
    WHERE singleton_key = true;

    IF bomb_active = true AND bomb_date <= now() THEN
        -- Execute the cut: update active players missing mandatory docs
        UPDATE public.players
        SET status = 'pending'
        WHERE status = 'active'
          AND (medical_url IS NULL OR payment_url IS NULL OR dni_url IS NULL OR photo_url IS NULL);
          
        -- Deactivate the bomb so it doesn't run again
        UPDATE public.settings
        SET document_deadline_active = false
        WHERE singleton_key = true;
    END IF;
END;
$function$;

-- Note: We do not strictly rely on pg_cron if it is disabled, 
-- but we try to enable it for cloud environments.
DO $do$
BEGIN
   IF EXISTS (
      SELECT FROM pg_catalog.pg_available_extensions 
      WHERE name = 'pg_cron'
   ) THEN
      CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
      
      -- Unschedule if it exists
      PERFORM cron.unschedule('check_document_time_bomb');
      
      -- Schedule to run every 10 minutes
      PERFORM cron.schedule('check_document_time_bomb', '*/10 * * * *', 'SELECT public.trigger_document_time_bomb();');
   END IF;
EXCEPTION
   WHEN OTHERS THEN
      -- If pg_cron fails (e.g. lack of permissions or unsupported), just ignore
      RAISE NOTICE 'pg_cron could not be configured: %', SQLERRM;
END
$do$;
