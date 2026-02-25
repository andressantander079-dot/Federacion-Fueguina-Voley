-- 1. Add Password to Squads
ALTER TABLE squads ADD COLUMN IF NOT EXISTS password VARCHAR(4) NULL;

-- 2. Ensure fixed concepts exist in administration (Tesoreria)
-- Table likely called 'concepts' or similar, we will verify its name and structure during execution.
-- But conceptually we need these 4 fixed:
-- 'Inscripcion de clubes'
-- 'Inscripcion de Jugadoras/es'
-- 'Pase a prestamo'
-- 'Pase'
