-- Check players columns for rejection/comments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players';

-- Check settings columns for fees
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'settings';

-- Check content of settings to see if there is a fee value
SELECT * FROM settings LIMIT 1;
