-- Create patient documents table
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for patient documents
CREATE POLICY "Patients can view their own documents" 
ON public.patient_documents 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE id = auth.uid()
  )
);

CREATE POLICY "Patients can upload their own documents" 
ON public.patient_documents 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.patients WHERE id = auth.uid()
  )
);

CREATE POLICY "Patients can update their own documents" 
ON public.patient_documents 
FOR UPDATE 
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE id = auth.uid()
  )
);

CREATE POLICY "Patients can delete their own documents" 
ON public.patient_documents 
FOR DELETE 
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE id = auth.uid()
  )
);

CREATE POLICY "Doctors can view patient documents" 
ON public.patient_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor'
  )
);

-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-documents', 'patient-documents', false);

-- Create storage policies
CREATE POLICY "Patients can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'patient-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can view patient documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'patient-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_patient_documents_updated_at
BEFORE UPDATE ON public.patient_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();