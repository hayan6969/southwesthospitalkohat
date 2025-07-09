-- Fix RLS policies for appointments and queue_positions to work with the appointment booking system

-- Update queue_positions policies to allow appointment creation
DROP POLICY IF EXISTS "Staff and doctors can manage queue positions" ON public.queue_positions;
DROP POLICY IF EXISTS "Users can view queue positions" ON public.queue_positions;

-- Create more permissive policies for queue_positions
CREATE POLICY "Allow authenticated users to manage queue positions" 
ON public.queue_positions 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure appointments table allows all operations for authenticated users
DROP POLICY IF EXISTS "Allow all operations" ON public.appointments;

CREATE POLICY "Allow authenticated users all operations on appointments" 
ON public.appointments 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure patients table allows all operations for authenticated users  
DROP POLICY IF EXISTS "Allow all operations" ON public.patients;

CREATE POLICY "Allow authenticated users all operations on patients" 
ON public.patients 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);