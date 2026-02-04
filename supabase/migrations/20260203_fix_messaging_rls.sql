-- Enable RLS for Messaging Tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- 1. Policies for MESSAGES
-- Allow Authenticated Users (Admins, Clubs, Refs) to VIEW messages
CREATE POLICY "Authenticated Read Messages" 
ON messages FOR SELECT 
TO authenticated 
USING (true);

-- Allow Authenticated Users to INSERT (Send) messages
CREATE POLICY "Authenticated Insert Messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

-- Allow Admins/Sender to UPDATE/DELETE their own messages (optional, good for drafts)
CREATE POLICY "Sender Manage Messages" 
ON messages FOR ALL 
TO authenticated 
USING (auth.uid() = sender_id);


-- 2. Policies for MESSAGE_RECIPIENTS
-- Allow Authenticated Users to View recipients (to see who else got it, or for system to filter)
CREATE POLICY "Authenticated Read Recipients" 
ON message_recipients FOR SELECT 
TO authenticated 
USING (true);

-- Allow Sender to Insert Recipients
CREATE POLICY "Sender Insert Recipients" 
ON message_recipients FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM messages 
        WHERE id = message_recipients.message_id 
        AND sender_id = auth.uid()
    )
);


-- 3. Storage Bucket for Attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read Attachments" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated Upload Attachments" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated Delete Attachments" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'message-attachments');
