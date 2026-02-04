-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    event_type TEXT CHECK (event_type IN ('reunion', 'institucional', 'fecha_limite', 'otro')) DEFAULT 'institucional',
    target_club_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- NULL = Para todos los clubes
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins can do everything (Assuming they have specific role or we verify via app logic, but for RLS we can use the 'service_role' or check profile)
-- For simplicity in this project's pattern, we often check if auth.uid() is in profiles with role 'admin'.

CREATE POLICY "Admins have full access" ON public.calendar_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 2. Clubs can VIEW events that are global (target_club_id IS NULL) OR targetting them
CREATE POLICY "Clubs can view relevant events" ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  target_club_id IS NULL 
  OR 
  target_club_id IN (
    SELECT club_id FROM public.profiles WHERE id = auth.uid()
  )
);
