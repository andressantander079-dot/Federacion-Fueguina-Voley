-- Check players table definition including defaults
SELECT column_name, column_default, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'players';

-- Check squads data to see if any have null category_id or if the category doesn't exist
SELECT s.id, s.name, s.category_id, s.gender, c.name as category_name
FROM squads s
LEFT JOIN categories c ON s.category_id = c.id;

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'players'::regclass;
