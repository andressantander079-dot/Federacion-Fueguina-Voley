-- Create storage bucket for news images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload
CREATE POLICY "Allow Authenticated Uploads News"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'news-images' );

CREATE POLICY "Allow Public Read News"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'news-images' );
