-- Create storage bucket for lab results
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-results', 'lab-results', false);

-- Create storage policies for lab results
CREATE POLICY "Staff can upload lab results" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lab-results' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role IN ('staff', 'admin', 'doctor')
));

CREATE POLICY "Authorized users can view lab results" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lab-results' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role IN ('staff', 'admin', 'doctor', 'patient')
));