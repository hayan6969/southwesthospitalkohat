-- Create storage bucket for doctor profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-avatars', 'doctor-avatars', true);

-- Create storage policies for doctor avatars
CREATE POLICY "Doctor avatars are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-avatars');

CREATE POLICY "Doctors can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'doctor-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

CREATE POLICY "Doctors can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'doctor-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

CREATE POLICY "Doctors can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'doctor-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'doctor'
  )
);

-- Add avatar_url column to doctors table
ALTER TABLE public.doctors ADD COLUMN avatar_url TEXT;