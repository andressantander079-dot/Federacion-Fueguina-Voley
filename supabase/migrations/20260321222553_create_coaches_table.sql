-- Create coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  club_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dni text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'habilitado', 'rechazado', 'inactivo')),
  rejection_reason text,
  payment_url text,
  photo_url text,
  id_document_url text
);

-- RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all" ON public.coaches
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.coaches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.coaches
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.coaches
  FOR DELETE USING (auth.role() = 'authenticated');
