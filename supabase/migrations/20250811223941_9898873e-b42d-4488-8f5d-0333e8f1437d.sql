-- Update lab-results bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lab-results';

-- Create policies for lab-results bucket
CREATE POLICY "Lab results are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'lab-results');

CREATE POLICY "Authenticated users can upload lab results" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'lab-results' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lab results" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'lab-results' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lab results" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'lab-results' AND auth.role() = 'authenticated');