-- Drop existing constraints
ALTER TABLE tournament_teams DROP CONSTRAINT IF EXISTS tournament_teams_squad_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_home_squad_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_away_squad_id_fkey;

-- Re-add constraints with ON DELETE CASCADE
ALTER TABLE tournament_teams
    ADD CONSTRAINT tournament_teams_squad_id_fkey
    FOREIGN KEY (squad_id)
    REFERENCES squads(id)
    ON DELETE CASCADE;

ALTER TABLE matches
    ADD CONSTRAINT matches_home_squad_id_fkey
    FOREIGN KEY (home_squad_id)
    REFERENCES squads(id)
    ON DELETE CASCADE;

ALTER TABLE matches
    ADD CONSTRAINT matches_away_squad_id_fkey
    FOREIGN KEY (away_squad_id)
    REFERENCES squads(id)
    ON DELETE CASCADE;
