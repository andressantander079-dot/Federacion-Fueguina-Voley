ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS document_deadline_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS document_deadline_date TIMESTAMPTZ;
