-- ==========================================
-- 1. LIMPIEZA E INFRAESTRUCTURA BASE
-- ==========================================
-- Advertencia: Esto borra datos existentes para garantizar integridad
DROP TABLE IF EXISTS public.match_sets CASCADE;
DROP TABLE IF EXISTS public.tournament_teams CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.referees CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.sponsors CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;

-- ==========================================
-- 2. TABLAS MAESTRAS (Configuración)
-- ==========================================
-- Configuración Global
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    singleton_key BOOLEAN DEFAULT TRUE UNIQUE, -- Asegura una sola fila
    registration_open BOOLEAN DEFAULT TRUE,
    registration_message TEXT,
    warning_banner_active BOOLEAN DEFAULT FALSE,
    warning_banner_text TEXT,
    logo_url TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    contact_address TEXT,
    contact_instagram TEXT,
    tramites_fees JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Venues / Sedes (Canchas)
CREATE TABLE public.venues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categorías (Ej: Mayores, Sub-18)
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Equipos / Clubes
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT DEFAULT 'Ushuaia',
    shield_url TEXT, -- Logo del club
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Árbitros
CREATE TABLE public.referees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    license_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sponsors (Gestión de marcas en Home)
CREATE TABLE public.sponsors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    website TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. USUARIOS Y PERFILES (Auth)
-- ==========================================

-- Vinculación con Supabase Auth
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'club', -- Valores: 'admin', 'planillero', 'club'
    club_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Solo para rol 'club'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 4. GESTIÓN DE COMPETENCIAS
-- ==========================================

-- Jugadores
CREATE TABLE public.players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    gender TEXT, -- 'Masculino', 'Femenino'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Torneos
CREATE TABLE public.tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Ej: Apertura 2026
    season TEXT NOT NULL, 
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    gender TEXT DEFAULT 'Mixto',
    point_system TEXT DEFAULT 'fivb', -- 'fivb' (3-0/3-1=3pts), 'simple'
    status TEXT DEFAULT 'borrador', -- 'borrador', 'activo', 'finalizado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pivot: Equipos inscriptos en Torneos
CREATE TABLE public.tournament_teams (
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    PRIMARY KEY (tournament_id, team_id)
);

-- Partidos (Core del sistema)
CREATE TABLE public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    
    home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    
    round TEXT, -- "Fecha 1", "Semifinal"
    scheduled_time TIMESTAMP WITH TIME ZONE,
    court_name TEXT, 
    status TEXT DEFAULT 'programado', -- 'borrador', 'programado', 'en_curso', 'finalizado'
    
    -- Resultados Rápidos
    home_score INTEGER DEFAULT 0, -- Sets ganados Local
    away_score INTEGER DEFAULT 0, -- Sets ganados Visita
    set_scores TEXT[], -- Array ["25-20", "23-25"]
    
    -- Planilla Digital Completa (JSON)
    sheet_data JSONB DEFAULT '{}'::jsonb, 
    sheet_status TEXT DEFAULT 'pending', 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 5. COMUNICACIÓN (CMS)
-- ==========================================

-- Noticias (Feed Instagram)
CREATE TABLE public.news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Documentos (Descargas y Reglamentos)
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    type TEXT NOT NULL, -- 'reglamento', 'descarga', 'ficha_medica'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 6. SEGURIDAD (RLS - Row Level Security)
-- ==========================================
-- Habilitar RLS en todas las tablas
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS BASE (Lectura pública, Escritura restringida)
-- Nota: Para desarrollo acelerado, se permite lectura pública global.
-- La escritura se debe restringir vía Backend/API o policies específicas de Admin.

CREATE POLICY "Public Read All" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
-- ... (Repetir patrón SELECT true para todas las tablas públicas)

CREATE POLICY "Public Read Matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public Read Players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public Read Tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public Read Sponsors" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "Public Read News" ON public.news FOR SELECT USING (true);
CREATE POLICY "Public Read Documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public Read Venues" ON public.venues FOR SELECT USING (true);
