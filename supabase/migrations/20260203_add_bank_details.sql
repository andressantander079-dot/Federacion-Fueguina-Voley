-- Add Bank Details and Fees to Settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_cbu TEXT,
ADD COLUMN IF NOT EXISTS bank_alias TEXT,
ADD COLUMN IF NOT EXISTS bank_cuit TEXT,
ADD COLUMN IF NOT EXISTS procedure_fees JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS player_fee NUMERIC DEFAULT 0;

-- Optional: Migrate old tramites_fees to procedure_fees if procedure_fees is empty
-- Wrapped in DO block to avoid error if tramites_fees column doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'tramites_fees') THEN
        UPDATE public.settings
        SET procedure_fees = tramites_fees
        WHERE (procedure_fees IS NULL OR procedure_fees = '[]'::jsonb) AND tramites_fees IS NOT NULL;
    END IF;
END $$;
