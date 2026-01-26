-- 1. MESSAGES TABLE (The content)
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin ID
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('normal', 'importante', 'urgente')) DEFAULT 'normal',
    
    -- Tipo de mensaje: 'comunicado' (Admin -> Club) o 'consulta' (Club -> Admin)
    type TEXT DEFAULT 'comunicado', 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RECIPIENTS TABLE (Tracking who gets it)
CREATE TABLE public.message_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- El destinatario: puede ser un Club (si es comunicado) o el Admin (si es consulta)
    recipient_club_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, 
    
    read_at TIMESTAMP WITH TIME ZONE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Evitar duplicados
    UNIQUE(message_id, recipient_club_id)
);

-- 3. RLS POLICIES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can see ALL messages
CREATE POLICY "Admins read all messages" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins insert messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Clubs can read messages where they are recipients
CREATE POLICY "Clubs read their messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.message_recipients mr
            JOIN public.profiles p ON p.club_id = mr.recipient_club_id
            WHERE mr.message_id = messages.id AND p.id = auth.uid()
        )
    );

-- Policy: Message Recipients visibility
CREATE POLICY "Admins read all recipients" ON public.message_recipients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Clubs read their recipient rows" ON public.message_recipients
    FOR SELECT USING (
        recipient_club_id IN (
            SELECT club_id FROM public.profiles WHERE id = auth.uid()
        )
    );
