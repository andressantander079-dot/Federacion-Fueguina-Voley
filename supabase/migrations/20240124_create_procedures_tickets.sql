-- ==========================================
-- GESTIÓN DE TRÁMITES (Procedures)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relación con el club que inicia el trámite
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL, -- Ej: "Pago Inscripción Sub-14"
    category TEXT NOT NULL, -- Ej: 'Pagos', 'Fichajes', 'Pases', 'Sanciones'
    
    -- Datos Financieros (Opcionales)
    amount DECIMAL(10,2),
    bank_name TEXT,
    operation_number TEXT,
    
    -- Estado
    status TEXT DEFAULT 'en_revision', -- 'en_revision', 'aprobado', 'rechazado'
    rejection_reason TEXT,
    
    -- Archivos (Comprobante, Ficha, etc.)
    attachment_url TEXT, 
    
    -- Identificador humano (para búsquedas rápidas)
    code SERIAL, -- Genera un número autoincremental simple (1, 2, 3...)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Historial de Cambios del Trámite (Auditoría)
CREATE TABLE IF NOT EXISTS public.procedure_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- GESTIÓN DE TICKETS (Solicitudes / Mesa de Entrada)
-- ==========================================
-- Usado por el Dashboard para contar "Mensajes"
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'abierto', -- 'abierto', 'en_proceso', 'cerrado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- SEGURIDAD (RLS)
-- ==========================================
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies Procedures
CREATE POLICY "Admin All Procedures" ON public.procedures FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Club Own Procedures" ON public.procedures FOR ALL USING (
    team_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
);

-- Policies History
CREATE POLICY "Admin All History" ON public.procedure_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Club Own History" ON public.procedure_history FOR SELECT USING (
    procedure_id IN (
        SELECT id FROM public.procedures WHERE team_id IN (
            SELECT club_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- Policies Tickets
CREATE POLICY "Admin All Tickets" ON public.tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Club Own Tickets" ON public.tickets FOR ALL USING (
    sender_id = auth.uid()
);
