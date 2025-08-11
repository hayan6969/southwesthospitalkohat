-- Create a new table for post-operative progress chart entries
CREATE TABLE public.postop_progress_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_schedule_id uuid NOT NULL REFERENCES public.ot_schedules(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  blood_pressure text,
  pulses text,
  temperature text,
  input_data text,
  output_data text,
  remarks text,
  user_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.postop_progress_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view postop progress entries" 
ON public.postop_progress_entries 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff can create postop progress entries" 
ON public.postop_progress_entries 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'staff'
  )
);

CREATE POLICY "Medical staff can update postop progress entries" 
ON public.postop_progress_entries 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'doctor', 'ota', 'admin')
  )
);

CREATE POLICY "Medical staff can delete postop progress entries" 
ON public.postop_progress_entries 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'doctor', 'ota', 'admin')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_postop_progress_entries_updated_at
  BEFORE UPDATE ON public.postop_progress_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();