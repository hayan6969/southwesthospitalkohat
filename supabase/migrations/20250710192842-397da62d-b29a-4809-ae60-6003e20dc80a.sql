-- Create storage bucket for hospital logos
INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-logos', 'hospital-logos', true);

-- Create policies for hospital logo uploads
CREATE POLICY "Hospital logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'hospital-logos');

CREATE POLICY "Admins can upload hospital logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'hospital-logos' AND (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
)));

CREATE POLICY "Admins can update hospital logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'hospital-logos' AND (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
)));

CREATE POLICY "Admins can delete hospital logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'hospital-logos' AND (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
)));