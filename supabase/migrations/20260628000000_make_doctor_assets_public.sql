-- Make doctor-assets storage bucket public (for signature, stamp, header logo uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-assets', 'doctor-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access for doctor-assets (anyone can view images)
CREATE POLICY "Doctor assets are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'doctor-assets');

-- Authenticated users can upload doctor assets
CREATE POLICY "Users can upload doctor assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'doctor-assets' AND auth.role() = 'authenticated');

-- Authenticated users can update doctor assets
CREATE POLICY "Users can update doctor assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'doctor-assets' AND auth.role() = 'authenticated');

-- Authenticated users can delete doctor assets
CREATE POLICY "Users can delete doctor assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'doctor-assets' AND auth.role() = 'authenticated');
