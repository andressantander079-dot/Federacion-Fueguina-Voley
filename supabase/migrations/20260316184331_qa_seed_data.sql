-- 20260316184331_qa_seed_data.sql
-- Este script inserta datos específicos para la prueba end-to-end de los Módulos 4 y 5.

DO $$
DECLARE
    team_a UUID;
    team_b UUID;
    player_adult UUID := gen_random_uuid();
    player_minor UUID := gen_random_uuid();
    player_debt UUID := gen_random_uuid();
    pase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO team_a FROM public.teams LIMIT 1 OFFSET 0;
    SELECT id INTO team_b FROM public.teams LIMIT 1 OFFSET 1;

    IF team_a IS NULL OR team_b IS NULL THEN
        RAISE EXCEPTION 'No hay suficientes equipos para el seeding.';
    END IF;

    -- 1. Jugador Adulto (Sin Deuda)
    INSERT INTO public.players (id, team_id, name, dni, birth_date, gender, status, has_debt)
    VALUES (player_adult, team_a, 'QA Adulto Sin Deuda', '99999991', '1990-01-01', 'Masculino', 'activo', false);

    -- 2. Jugador Menor (Sin Deuda)
    INSERT INTO public.players (id, team_id, name, dni, birth_date, gender, status, has_debt)
    VALUES (player_minor, team_a, 'QA Menor Sin Deuda', '99999992', '2015-01-01', 'Femenino', 'activo', false);

    -- 3. Jugador con Deuda (Pase en Curso desde Team A hacia Team B)
    INSERT INTO public.players (id, team_id, name, dni, birth_date, gender, status, has_debt)
    VALUES (player_debt, team_a, 'QA Jugador Con Deuda', '99999993', '1995-01-01', 'Femenino', 'inhabilitado_por_deuda', true);

    -- Insertar un Pase Solicitado en la Fase 2 (Esperando Firma Origen)
    INSERT INTO public.tramites_pases (id, type, player_id, origen_club_id, solicitante_club_id, estado, created_at)
    VALUES (pase_id, 'definitivo', player_debt, team_a, team_b, 'solicitado', now());

END $$;
