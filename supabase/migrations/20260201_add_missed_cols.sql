-- Migration: Add missing columns for Referees and Clubs
-- Date: 2026-02-01

-- 1. Add phone column to profiles (for Referees/Clubs contact info)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Add admin_id column to teams (for direct Club Admin reference)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number for the user (Referee/Club)';
COMMENT ON COLUMN public.teams.admin_id IS 'Direct reference to the Admin User of this club';
