-- Remove the overly permissive policy that allows all authenticated users to see all appointments
DROP POLICY IF EXISTS "Allow authenticated users all operations on appointments" ON public.appointments;

-- Create specific policies for doctors to only see their own appointments
CREATE POLICY "Doctors can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor' 
    AND appointments.doctor_id = auth.uid()
  )
);

-- Create policy for patients to view their own appointments
CREATE POLICY "Patients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'patient' 
    AND appointments.patient_id = auth.uid()
  )
);

-- Create policy for staff and admins to view all appointments
CREATE POLICY "Staff and admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'staff')
  )
);

-- Create policy for doctors to update their own appointments
CREATE POLICY "Doctors can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor' 
    AND appointments.doctor_id = auth.uid()
  )
);

-- Create policy for staff and admins to manage all appointments
CREATE POLICY "Staff and admins can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'staff')
  )
);