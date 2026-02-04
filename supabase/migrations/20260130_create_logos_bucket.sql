-- Create a new public bucket for club logos
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Policy: Allow anyone to view logos (Public access)
CREATE POLICY "Public Access Logos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'club-logos' );

-- Policy: Allow authenticated users (Clubs/Admins) to upload logos
CREATE POLICY "Authenticated Upload Logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'club-logos' );

-- Policy: Allow users to update their own logos (simplified for now, ideally strictly checked against club_id)
CREATE POLICY "Authenticated Update Logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'club-logos' );
