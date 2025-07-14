-- Fix storage bucket to be public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'patient-documents';

-- Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Patients can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can view patient documents" ON storage.objects;

-- Create more permissive storage policies for patient documents
CREATE POLICY "Anyone can view patient documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can upload patient documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Document owners can delete patient documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'patient-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update RLS policies to allow staff to view patient documents
CREATE POLICY "Staff can view all patient documents" 
ON public.patient_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('staff', 'admin', 'doctor')
  )
);