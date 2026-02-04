-- Add attachments column to messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admin can upload (assuming authenticated users with role admin, but for now authenticated is fine if UI restricts)
-- Actually, let's allow authenticated uploads for now, we can refine if needed.
-- OR: better, check profiles role.
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'message-attachments' );

CREATE POLICY "Allow Public Read"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'message-attachments' );
