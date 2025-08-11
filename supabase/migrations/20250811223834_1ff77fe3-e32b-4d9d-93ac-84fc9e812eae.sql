-- Ensure lab-results bucket is public and properly configured
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lab-results';

-- Create comprehensive RLS policies for lab-results bucket
-- Allow public read access to lab results
CREATE POLICY "Public read access to lab results" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lab-results');

-- Allow authenticated users to upload lab results
CREATE POLICY "Authenticated users can upload lab results" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lab-results' AND auth.role() = 'authenticated');

-- Allow staff and medical personnel to update lab results
CREATE POLICY "Medical staff can update lab results" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'lab-results' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'staff', 'doctor', 'nursing')
  )
);

-- Allow staff to delete lab results if needed
CREATE POLICY "Staff can delete lab results" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'lab-results' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);