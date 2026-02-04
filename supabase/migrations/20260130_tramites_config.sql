-- Add Bank Details to Settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_cbu TEXT,
ADD COLUMN IF NOT EXISTS bank_alias TEXT,
ADD COLUMN IF NOT EXISTS bank_cuit TEXT;

-- Seed default values if null (Optional)
UPDATE public.settings
SET 
  bank_name = 'Banco Tierra del Fuego',
  bank_holder = 'Federación de Voley',
  bank_alias = 'voley.tdf.banco',
  bank_cbu = '0000000000000000000000',
  bank_cuit = '30-00000000-0',
  tramites_fees = COALESCE(tramites_fees, '[{"title": "Inscripción de Club", "price": "50000"}, {"title": "Pase Interclub", "price": "15000"}]'::jsonb)
WHERE id IS NOT NULL;
