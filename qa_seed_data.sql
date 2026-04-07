-- qa_seed_data.sql
-- Este script inserta datos específicos para la prueba end-to-end de los Módulos 4 y 5.

-- Supongamos que ya existen equipos. Toma dos equipos al azar (A y B).
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
    VALUES (player_minor, team_a, 'QA Menor Sin Deuda', '99999992', '2017-01-01', 'Femenino', 'activo', false);

    -- 3. Jugador con Deuda (Pase en Curso desde Team A hacia Team B)
    INSERT INTO public.players (id, team_id, name, dni, birth_date, gender, status, has_debt)
    VALUES (player_debt, team_a, 'QA Jugador Con Deuda', '99999993', '1995-01-01', 'Femenino', 'inhabilitado_por_deuda', true);

    -- Insertar un Pase Solicitado en la Fase 2 (Esperando Firma Origen) o Fase 4 (Aprobación Fed)
    -- Lo pondré en 'solicitado' para que el Club de Origen (Team A) vea el Checkbox en su caja de "Recibidos"
    INSERT INTO public.tramites_pases (id, type, player_id, origen_club_id, solicitante_club_id, estado, created_at)
    VALUES (pase_id, 'definitivo', player_debt, team_b, team_a, 'solicitado', now());
    -- Nota: origen = team_b (quien lo larga), solicitante = team_a (quien lo pide)
    -- Ups, la jugadora está en team_a en la base de datos.
    -- Entonces origen = team_a y solicitante = team_b.
    UPDATE public.tramites_pases SET origen_club_id = team_a, solicitante_club_id = team_b WHERE id = pase_id;

END $$;
