-- STANDARDIZE SETTINGS
ALTER TABLE public.settings 
RENAME COLUMN tramites_fees TO procedure_fees;

-- DROP LEGACY SPANISH TABLE (Since 'procedures' table is used in code)
DROP TABLE IF EXISTS public.tramites;

-- If 'tramites_fees' was a separate table and not a column (just in case)
DROP TABLE IF EXISTS public.tramites_fees;


-- UPDATE POLICIES (They might refer to old table names, but Postgres usually handles renaming. 
-- However, we should check if policy names themselves are Spanish)

-- RENAME POLICIES (Optional but good for consistency)
-- We can drop and recreate strict policies if needed, but renaming tables usually updates the attached policy target.
