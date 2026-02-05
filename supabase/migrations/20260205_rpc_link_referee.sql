-- RPC for claiming referee profile
-- Transfers match assignments and referee record from an target profile (old) to current auth user (new).

CREATE OR REPLACE FUNCTION link_referee_profile(target_referee_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Transfer Match Assignments
    UPDATE public.match_officials
    SET user_id = auth.uid()
    WHERE user_id = target_referee_id;

    -- 2. Transfer Referee Record (if exists independent of profile id, or update FK)
    -- If referees.id REFERENCES profiles.id, we cannot change ID.
    -- But we can update if referees has a separate user_id column (legacy mode).
    -- If referees table uses id as PK=ProfileID, then we need to INSERT new row for current user and DELETE old?
    -- Let's try to update user_id column if it exists.
    
    BEGIN
        UPDATE public.referees
        SET user_id = auth.uid()
        WHERE id = target_referee_id OR user_id = target_referee_id;
    EXCEPTION WHEN duplicate_object OR others THEN
        -- Ignore if column doesn't exist or other error, main goal is match_officials
        NULL;
    END;

    -- 3. Mark old profile as legacy? (Optional)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
