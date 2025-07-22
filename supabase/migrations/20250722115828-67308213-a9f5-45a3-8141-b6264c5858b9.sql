-- Make lab-results bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lab-results';

-- Drop existing private policies
DROP POLICY IF EXISTS "Staff can upload lab results" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can view lab results" ON storage.objects;

-- Create new public policies for lab-results bucket
CREATE POLICY "Lab results are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lab-results');

CREATE POLICY "Staff can upload lab results" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lab-results' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role IN ('staff', 'admin', 'doctor')
));

CREATE POLICY "Staff can update lab results" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'lab-results' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role IN ('staff', 'admin', 'doctor')
));

CREATE POLICY "Staff can delete lab results" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'lab-results' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role IN ('staff', 'admin', 'doctor')
));