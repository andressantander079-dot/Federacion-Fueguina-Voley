-- Create Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    singleton_key BOOLEAN NOT NULL DEFAULT TRUE CHECK (singleton_key),
    registration_open BOOLEAN DEFAULT TRUE,
    registration_message TEXT DEFAULT 'El periodo de inscripción ha finalizado. Por favor contacte a la administración.',
    warning_banner_active BOOLEAN DEFAULT FALSE,
    warning_banner_text TEXT,
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,
    alias_cvu TEXT,
    tramites_fees JSONB DEFAULT '[]'::jsonb, -- Array of { title: string, price: string }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (singleton_key)
);

-- Initialize with one row if empty
INSERT INTO public.settings (singleton_key) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- Create Sponsors Table
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    link_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Venues (Sedes) Table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Policies for Settings
CREATE POLICY "Enable read access for all users" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users only" ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for Sponsors
CREATE POLICY "Enable read access for all users" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.sponsors FOR ALL USING (auth.role() = 'authenticated');

-- Policies for Venues
CREATE POLICY "Enable read access for all users" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.venues FOR ALL USING (auth.role() = 'authenticated');

-- Storage Bucket for Sponsors/Logos if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('config-assets', 'config-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Give public access to config-assets" ON storage.objects FOR SELECT USING (bucket_id = 'config-assets');
CREATE POLICY "Enable upload for authenticated users to config-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'config-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users to config-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'config-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users to config-assets" ON storage.objects FOR DELETE USING (bucket_id = 'config-assets' AND auth.role() = 'authenticated');
