-- Create the attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to the attachments bucket
-- Files are organized by user ID in the path structure
CREATE POLICY "Allow authenticated users to upload attachments" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow all authenticated users to view any attachment
-- (since task attachments should be viewable by team members)
CREATE POLICY "Allow authenticated users to view attachments" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'attachments');

-- Policy to allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own attachments" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own uploaded files
CREATE POLICY "Allow users to update their own attachments" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);