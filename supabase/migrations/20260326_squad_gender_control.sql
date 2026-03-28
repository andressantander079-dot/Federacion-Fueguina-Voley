-- Módulo 2: Validación de Género en Jugadores y Planteles
-- Script de Migración para SP Softpower

-- 1. Asegurarnos que el Type ENUM de generos exista (si aplica, usaremos CHECK constraint para simplificar o VARCHAR).
-- Vamos a agregar la columna `gender` a la tabla `players`.
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Femenino';

-- 2. Asegurarnos de que el valor default retroactivo fue exitoso, luego aplicar restricción.
UPDATE public.players SET gender = 'Femenino' WHERE gender IS NULL;

-- (Opcional) Podemos hacer CHECK (gender IN ('Femenino', 'Masculino')).
ALTER TABLE public.players 
ADD CONSTRAINT check_player_gender CHECK (gender IN ('Femenino', 'Masculino'));

-- 3. Crear función de validación (Trigger Function) para asegurar que el jugador comparta el género de su plantel.
CREATE OR REPLACE FUNCTION public.check_gender_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    squad_gender VARCHAR(20);
BEGIN
    -- Si el jugador no esta en ningun plantel (Huerfano temporal), lo dejamos pasar.
    IF NEW.squad_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar el género del cuadrante (plantel) destino
    SELECT gender INTO squad_gender FROM public.squads WHERE id = NEW.squad_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Si el genero no coincide, lanzamos exepción restrictiva.
    IF NEW.gender != squad_gender THEN
        RAISE EXCEPTION 'GENDER_MISMATCH: El género del jugador (%) no coincide con el del plantel oficial (%).', NEW.gender, squad_gender USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Aplicar el Trigger a la tabla players
DROP TRIGGER IF EXISTS trg_prevent_gender_mismatch ON public.players;

CREATE TRIGGER trg_prevent_gender_mismatch
BEFORE INSERT OR UPDATE OF gender, squad_id ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.check_gender_match();
