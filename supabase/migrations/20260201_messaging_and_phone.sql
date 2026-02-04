-- Create Messages Table for Internal Communication
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means Broadcast/System Message
    subject TEXT,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for Messages
-- Users can see messages sent to them OR broadcast messages (if we implement that logic generically)
-- For now, strict: Sender sees sent, Receiver sees received.
CREATE POLICY "Users can see their own messages" ON messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received messages" ON messages
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Ensure Referees have necessary fields (phone is on profiles, category on referees table)
-- We check if 'phone' exists on profiles (it usually does for auth, but let's be sure we use it)
-- adding a specific check constraint or ensure it's used in the form.

-- Add phone to profiles if not exists (it likely exists as part of auth schema or we add it to public profile)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
