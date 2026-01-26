-- ==========================================
-- SOLICITUDES DE REGISTRO DE CLUBES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.club_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    club_name TEXT NOT NULL,
    
    -- JSONB para almacenar lista de personas: [{ name, role, phone }]
    authorized_persons JSONB DEFAULT '[]'::jsonb,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.club_requests ENABLE ROW LEVEL SECURITY;

-- Admins ven todo
CREATE POLICY "Admins view all requests" ON public.club_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Usuarios ven su propia solicitud (para saber estado)
CREATE POLICY "Users view own request" ON public.club_requests
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Usuarios pueden crear su solicitud al registrarse
CREATE POLICY "Users insert own request" ON public.club_requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );
