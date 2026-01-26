-- ==========================================
-- FIX 6: CATEGORÍAS ASIGNADAS A CLUBES
-- ==========================================

-- Tabla intermedia para saber qué categorías tiene habilitadas un club
CREATE TABLE IF NOT EXISTS public.team_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, category_id)
);

-- RLS
ALTER TABLE public.team_categories ENABLE ROW LEVEL SECURITY;

-- ADMINS: Full Access
CREATE POLICY "Admins full access team_categories" ON public.team_categories
    FOR ALL USING ( public.is_admin() );

-- CLUBS: Read Only (solo ver las suyas)
CREATE POLICY "Clubs read own categories" ON public.team_categories
    FOR SELECT USING (
        -- El usuario es del club team_id
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND club_id = team_categories.team_id
        )
    );
