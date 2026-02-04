-- 1. Add recipient_user_id to message_recipients
ALTER TABLE public.message_recipients 
ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Update Constraint check (Ensure at least one recipient type is set)
-- (Optional, but good practice)
ALTER TABLE public.message_recipients 
DROP CONSTRAINT IF EXISTS check_recipient_type;

ALTER TABLE public.message_recipients 
ADD CONSTRAINT check_recipient_type 
CHECK (
  (recipient_club_id IS NOT NULL AND recipient_user_id IS NULL) OR 
  (recipient_club_id IS NULL AND recipient_user_id IS NOT NULL)
);

-- 3. Update Unique Constraint
-- We need to drop the old unique constraint and add a new one covering both cases
ALTER TABLE public.message_recipients 
DROP CONSTRAINT IF EXISTS message_recipients_message_id_recipient_club_id_key;

-- Since one of them is null, we can't easily make a single unique index for both unless we use partial indexes
-- or just rely on application logic. But let's try a partial unique index approach for data integrity.

CREATE UNIQUE INDEX IF NOT EXISTS unique_club_recipient ON public.message_recipients (message_id, recipient_club_id) WHERE recipient_club_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_recipient ON public.message_recipients (message_id, recipient_user_id) WHERE recipient_user_id IS NOT NULL;


-- 4. Update Policies for Reading Messages (Use OR logic)
DROP POLICY IF EXISTS "Clubs read their messages" ON public.messages;

CREATE POLICY "Users read their messages" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.message_recipients mr
        LEFT JOIN public.profiles p ON p.club_id = mr.recipient_club_id
        WHERE mr.message_id = messages.id 
        AND (
            -- Case A: Recipient is the club the user belongs to
            (mr.recipient_club_id IS NOT NULL AND p.id = auth.uid())
            OR
            -- Case B: Recipient is the user directly
            (mr.recipient_user_id = auth.uid())
        )
    )
);

-- 5. Update Policies for Reading Recipients
DROP POLICY IF EXISTS "Clubs read their recipient rows" ON public.message_recipients;

CREATE POLICY "Users read their recipient rows" ON public.message_recipients
FOR SELECT USING (
    (recipient_club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
    OR
    (recipient_user_id = auth.uid())
);
