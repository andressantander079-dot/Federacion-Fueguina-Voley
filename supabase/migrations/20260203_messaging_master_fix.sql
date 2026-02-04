-- 1. Schema Updates (Fixing missing 'attachments' column error)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- 2. Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts (Clean Slate)
DROP POLICY IF EXISTS "Authenticated Read Messages" ON messages;
DROP POLICY IF EXISTS "Authenticated Insert Messages" ON messages;
DROP POLICY IF EXISTS "Sender Manage Messages" ON messages;
DROP POLICY IF EXISTS "Authenticated Read Recipients" ON message_recipients;
DROP POLICY IF EXISTS "Sender Insert Recipients" ON message_recipients;

-- 4. Re-create Policies for MESSAGES
CREATE POLICY "Authenticated Read Messages" 
ON messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated Insert Messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender Manage Messages" 
ON messages FOR ALL 
TO authenticated 
USING (auth.uid() = sender_id);

-- 5. Re-create Policies for RECIPIENTS
CREATE POLICY "Authenticated Read Recipients" 
ON message_recipients FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Sender Insert Recipients" 
ON message_recipients FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 6. Storage Bucket Configuration
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Read Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Attachments" ON storage.objects;

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

-- 7. Force Schema Cache Reload (Critical for Next.js to see new columns)
NOTIFY pgrst, 'reload schema';
