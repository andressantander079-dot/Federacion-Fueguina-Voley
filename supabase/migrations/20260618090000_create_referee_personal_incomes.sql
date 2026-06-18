-- Crear tabla de ingresos personales del árbitro
CREATE TABLE IF NOT EXISTS referee_personal_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    concept TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE referee_personal_incomes ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS
CREATE POLICY "Permitir inserción solo para el dueño" 
ON referee_personal_incomes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir lectura solo para el dueño" 
ON referee_personal_incomes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Permitir eliminación solo para el dueño" 
ON referee_personal_incomes FOR DELETE 
USING (auth.uid() = user_id);
