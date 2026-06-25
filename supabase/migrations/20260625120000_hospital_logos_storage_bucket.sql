-- Create hospital-logos storage bucket for logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hospital-logos', 'hospital-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

-- Public read access
DROP POLICY IF EXISTS "Public SELECT" ON storage.objects;
CREATE POLICY "Public SELECT" ON storage.objects
  FOR SELECT USING (bucket_id = 'hospital-logos');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated INSERT" ON storage.objects;
CREATE POLICY "Authenticated INSERT" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hospital-logos');

-- Authenticated users can update
DROP POLICY IF EXISTS "Authenticated UPDATE" ON storage.objects;
CREATE POLICY "Authenticated UPDATE" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'hospital-logos');

-- Authenticated users can delete
DROP POLICY IF EXISTS "Authenticated DELETE" ON storage.objects;
CREATE POLICY "Authenticated DELETE" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hospital-logos');
