-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add payment tracking fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN booking_type TEXT DEFAULT 'online',
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_due_time TIMESTAMPTZ,
ADD COLUMN invoice_generated_at TIMESTAMPTZ;

-- Add updated_at trigger for appointments
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for appointments to allow queue management
CREATE POLICY "Allow staff to manage appointment payments" 
ON public.appointments 
FOR UPDATE 
USING (true);

-- Add function to auto-cancel overdue appointments
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.appointments 
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < now()
    AND status = 'scheduled';
END;
$$;